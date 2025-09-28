import * as fs from 'fs/promises';
import * as path from 'path';
import parseDataURL from 'data-urls';
import { z } from 'genkit';
import { container } from 'tsyringe';
import { v4 as uuidv4 } from 'uuid'; // Keep uuid for filenames

import type { IStorage } from '@monorepo/core';

import config from '@ai-worker/config';
import { ai } from '@ai-worker/config/ai.config';
import { logger } from '@ai-worker/config/logger';
import { generateImagePrompt } from '@ai-worker/domain/prompt-generator';
import {
  AiImageResponseSchema,
  AiVideoAnalysisResponseSchema,
} from '@ai-worker/domain/schemas';
import { googleAI } from '@genkit-ai/google-genai';
import { DI_TOKENS } from '@monorepo/core';

async function generateAndSaveImage(
  storage: IStorage,
  prompt: string,
  imageType: 'poster' | 'backdrop',
  outputDir: string,
): Promise<string | undefined> {
  try {
    logger.info(`[GenerateMovieImagesFlow] Generating ${imageType} image...`);

    const generationConfig = {
      model: googleAI.model('gemini-2.5-flash-image-preview'),
      prompt: `${prompt} - ${
        imageType === 'poster' ?
          'movie poster style, cinematic, high quality'
        : 'cinematic wide aspect ratio movie backdrop style, high quality'
      }`,
      config: { temperature: 1 },
      output: { format: 'media' as const },
    };

    const { media: image } = await ai.generate(generationConfig);

    if (!image) {
      throw new Error(`Failed to generate ${imageType} image.`);
    }

    const imageData = parseDataURL(image.url);
    if (!imageData) {
      logger.warn(
        `[GenerateMovieImagesFlow] ${imageType} image generation did not return expected data.`,
        image,
      );
      return undefined;
    }

    const extension = imageData.mimeType.subtype;
    const filename = `${imageType}-${uuidv4()}.${extension}`;
    const tempPath = path.join(outputDir, filename);

    await fs.writeFile(tempPath, imageData.body);

    const savedPath = await storage.saveFile(
      tempPath,
      path.join('ai-generated', filename),
    );

    await fs.unlink(tempPath);

    const relativePath = savedPath.substring(savedPath.indexOf('ai-generated'));
    logger.info(
      `[GenerateMovieImagesFlow] ${imageType} image saved to:`,
      relativePath,
    );

    return relativePath;
  } catch (error) {
    logger.error(
      `[GenerateMovieImagesFlow] Error generating ${imageType} image:`,
      error,
    );
    return undefined;
  }
}

export const GenerateMovieImagesFlow = ai.defineFlow(
  {
    name: 'GenerateMovieImagesFlow',
    inputSchema: z.object({
      title: z.string(),
      description: z.string(),
      genres: z.array(z.string()),
      imageGenerationPrompt: z.string(),
    }),
    outputSchema: AiImageResponseSchema,
  },
  async (input) => {
    logger.info(
      `[GenerateMovieImagesFlow] Starting image generation for: ${input.title}`,
    );

    const promptGenerator = await ai.generate({
      model: googleAI.model('gemma-3-27b-it'),
      prompt: generateImagePrompt(input),
      config: { temperature: 1 },
    });

    const imagePrompt = promptGenerator.text;
    if (!imagePrompt) {
      throw new Error('Failed to generate image prompt.');
    }
    logger.info(
      `[GenerateMovieImagesFlow] Generated Image Prompt: ${imagePrompt}`,
    );

    const storage = container.resolve<IStorage>(DI_TOKENS.Storage);
    const outputDir = path.join(config.TEMP_OUT_DIR, 'ai-generated');
    await fs.mkdir(outputDir, { recursive: true });

    const [posterImagePath, backdropImagePath] = await Promise.all([
      generateAndSaveImage(storage, imagePrompt, 'poster', outputDir),
      generateAndSaveImage(storage, imagePrompt, 'backdrop', outputDir),
    ]);

    if (!posterImagePath && !backdropImagePath) {
      throw new Error('Failed to generate any images.');
    }

    return { posterImagePath, backdropImagePath };
  },
);

export const VideoAnalysisFlow = ai.defineFlow(
  {
    name: 'VideoAnalysisFlow',
    inputSchema: z.object({
      videoFilePath: z.string().describe('Path to the video file.'),
    }),
    outputSchema: AiVideoAnalysisResponseSchema,
  },
  async (input): Promise<z.infer<typeof AiVideoAnalysisResponseSchema>> => {
    const b64Data = await fs.readFile(input.videoFilePath, {
      encoding: 'base64',
    });
    const dataUrl = `data:video/mp4;base64,${b64Data}`;

    const { output } = await ai.generate({
      model: googleAI.model('gemini-2.5-flash'),
      prompt: `Generate translated subtitles (Hindi and Punjabi), chapters (English), title, description, and genres for the provided video. The translation should be natural and human-like.`,
      messages: [
        {
          role: 'user',
          content: [{ media: { mimeType: 'video/mp4', url: dataUrl } }],
        },
      ],
      output: { schema: AiVideoAnalysisResponseSchema },
    });

    if (!output) {
      throw new Error('Video analysis flow failed to generate output.');
    }

    console.log(JSON.stringify(output, null, 2));

    return output;
  },
);
