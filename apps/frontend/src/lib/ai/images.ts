import { createWriteStream, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import parseDataURL from 'data-urls';
import { genkit } from 'genkit';
import { z } from 'zod';

import vertexAI, { gemini20Flash001, imagen3 } from '@genkit-ai/vertexai';

export const ai = genkit({
  plugins: [vertexAI({ location: 'us-central1', projectId: '' })],
});

export async function generateImageWithPrompt(
  prompt: string,
  config: {
    type: 'poster' | 'backdrop';
    temperature?: number;
  },
) {
  const { media: image } = await ai.generate({
    model: imagen3,
    prompt: prompt + ' - movie style, cinematic, high quality',
    config: {
      aspectRatio: config.type == 'backdrop' ? '16:9' : '9:16',
      temperature: config.temperature ?? 1,
      language: 'en',
      safetySetting: 'block_few',
    },
    output: {
      format: 'media',
    },
  });

  if (!image) {
    throw new Error('Failed to generate image.');
  }

  console.log('[GenerateImageWithPrompt] Image generated');

  const tempDir = process.env.TEMP_DIR || 'tmp';

  const objectId = Math.random().toString(36).substring(2, 15);

  const dirPath = join(process.cwd(), tempDir, config.type);

  if (!existsSync(dirPath)) {
    console.log('Creating directory:', dirPath);
    mkdirSync(dirPath, { recursive: true });
  }

  const posterImageData = parseDataURL(image.url);

  if (!posterImageData) {
    throw new Error('The model did not retured image with proper content type');
  }

  const extension = posterImageData.mimeType.subtype;

  const filePath = join(
    process.cwd(),
    tempDir,
    config.type,
    objectId + '.' + extension,
  );

  const writeStream = createWriteStream(filePath);

  console.log('writestream path', writeStream.path);

  await new Promise((resolve, reject) => {
    writeStream.on('open', () => {
      console.log('Write stream opened');
    });
    writeStream.on('finish', () => {
      console.log('Write stream finished');
      resolve(true);
    });
    writeStream.on('error', (err) => {
      writeStream.destroy();
      console.error('Error writing file:', err);
      reject(err);
    });
    writeStream.write(posterImageData.body);
    writeStream.end();
  }).catch((err) => {
    console.error('Error writing file:', err);
    throw err;
  });

  return {
    success: true,
    path: `${config.type}/${objectId}.${extension}`,
    id: objectId,
  };
}

export async function generateImagePrompt({
  input,
  type,
}: {
  input: {
    title: string;
    description: string;
    genres: string[];
    initialPrompt: string;
  };
  type: 'poster' | 'backdrop';
}) {
  if (!input) {
    throw new Error('Input is required');
  }

  if (!type) {
    throw new Error('Type is required');
  }

  // Check if at least one field has content
  const hasContent = !!(
    input.title ||
    input.description ||
    (input.genres && input.genres.length > 0) ||
    input.initialPrompt
  );

  if (!hasContent) {
    throw new Error(
      'Please provide some information such as title, description, genres, or initial prompt',
    );
  }

  const { text } = await ai.generate({
    model: gemini20Flash001,
    prompt: `Based on the following movie details, create a concise and evocative prompt suitable for an AI image generator. The prompt should capture the essence, mood, and visual style implied by the title, description, and genres. it is very important that the prompt should not offend any one wether it is an organization or a person. the prompt should not contain any name of person, organization. the prompt should not mention generation of any person.

      Title: ${input.title}
      Description: ${input.description}
      Genres: ${input.genres.join(', ')}
      Initial Prompt: ${input.initialPrompt}

      Consider the genres:
      - If genres include 'Documentary' or 'Educational', aim for a realistic or informative style.
      - If genres include 'Comedy', suggest a lighthearted or humorous visual.
      - If genres include 'Horror' or 'Thriller', imply suspense or darkness.
      - If genres include 'Sci-Fi' or 'Fantasy', suggest imaginative or futuristic visuals.
      - If genres include 'Animation', suggest a cartoonish or stylized look.
      - If genres include 'Action', imply dynamic movement or intensity.

       Generate a single, effective prompt string. The prompt should be able to generate visually stunning, vivid and colorful images.`,

    config: {
      temperature: 1, // Allow for some creativity in prompt generation
    },
    output: {
      schema: z.object({
        prompt: z.string().describe('Generated image prompt.'),
      }),
      format: 'json',
    },
  });

  if (!text) {
    throw new Error('Failed to generate prompt');
  }

  const pretext =
    type == 'poster' ?
      'A movie like poster style - '
    : 'A movie like backdrop style - ';

  const prompt = pretext + JSON.parse(text).prompt;

  return prompt;
}
