import * as fs from 'fs/promises';
import * as path from 'path';
import { container, injectable } from 'tsyringe';

import type { IStorage } from '@monorepo/core';

import config from '@ai-worker/config';
import { DI_TOKENS } from '@monorepo/core';

import { generateAndSaveImage } from './flow';

@injectable()
export class GenerateImageUseCase {
  async execute(input: {
    prompt: string;
    type: 'poster' | 'backdrop';
  }): Promise<{ success: boolean; path: string; id: string }> {
    const { prompt, type } = input;
    const storage = container.resolve<IStorage>(DI_TOKENS.Storage);
    const outputDir = path.join(config.TEMP_OUT_DIR, 'ai-generated');
    await fs.mkdir(outputDir, { recursive: true });

    const imagePath = await generateAndSaveImage(
      storage,
      prompt,
      type,
      outputDir,
    );

    if (!imagePath) {
      throw new Error('Failed to generate image.');
    }

    const id = path.basename(imagePath).split('.')[0];

    return {
      success: true,
      path: imagePath,
      id,
    };
  }
}
