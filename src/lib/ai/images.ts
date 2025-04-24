import { createWriteStream, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

import { imagen3 } from '@genkit-ai/vertexai';
import parseDataURL from 'data-urls';

import { ai } from './flow';

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
