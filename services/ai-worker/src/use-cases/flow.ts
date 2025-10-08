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
import { googleAI, vertexAI } from '@genkit-ai/google-genai';
import { DI_TOKENS } from '@monorepo/core';

export async function generateAndSaveImage(
  storage: IStorage,
  prompt: string,
  imageType: 'poster' | 'backdrop',
  outputDir: string,
): Promise<string | undefined> {
  try {
    logger.info(`[GenerateMovieImagesFlow] Generating ${imageType} image...`);

    const { media: image } = await ai.generate({
      model: googleAI.model('imagen-4.0-generate-preview-06-06'),
      prompt: `${prompt} - ${
        imageType === 'poster' ?
          'movie poster style, cinematic, high quality'
        : 'cinematic wide aspect ratio movie backdrop style, high quality'
      }`,
      config: {
        temperature: 1,
        aspectRatio: imageType === 'poster' ? '9:16' : '16:9',
      },
      output: { format: 'media' },
    });

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
      `[GenerateMovieImagesFlow] ${imageType} image saved to: ${relativePath}`,
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
      model: googleAI.model('gemini-2.0-flash-lite'),
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
      prompt: `
Analyze the provided video and generate the following information in JSON format:

1.  **Title, Description, Genres, and Image Prompt**: As specified in the schema.
2.  **Chapters**: Identify key chapters and provide timestamps and titles.
3.  **Gemini TTS Prompts**:
    *   Create a single, continuous string for each language (Hindi and Punjabi).
    *   Each line must be in the format: \`Start: HH:MM:SS.mmm ('emotion, style', 'voiceGender') say: Text\n\`
    *   **Crucially, you must also identify periods of silence between speech.**
    *   Insert \`SILENCE: <duration> seconds\n\` for any pause longer than 0.5 seconds.
    *   Calculate the duration accurately. For example, if one line ends at 00:00:05.200 and the next starts at 00:00:08.500, you must insert \`SILENCE: 3.3 seconds\n\`.
    *   Determine the \`voiceGender\` ('male' or 'female') from the original audio for each speech segment.
    *   **Identify non-speech sounds** like (laughs), (cries), (sighs), etc., and include them in the text. The emotion and style should be dynamic and reflect the content of the video.

Your output must strictly adhere to the \`AiVideoAnalysisResponseSchema\`.
`,
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
