import { Request, Response } from 'express';
import { container } from 'tsyringe';

import { logger } from '@ai-worker/config/logger';
import {
  GenerateImagePromptSchema,
  GenerateImagePromptUseCase,
} from '@ai-worker/use-cases/generate-image-prompt.usecase';
import { GenerateImageUseCase } from '@ai-worker/use-cases/generate-image.usecase';

export class AIController {
  async generateImage(req: Request, res: Response): Promise<Response> {
    try {
      const { prompt, type } = req.body;

      if (!prompt || !type) {
        return res.status(400).json({ error: 'prompt and type are required' });
      }

      const generateImageUseCase = container.resolve(GenerateImageUseCase);
      const result = await generateImageUseCase.execute({ prompt, type });

      return res.status(200).json(result);
    } catch (error) {
      logger.error('Error generating image:', error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }
  async generateImagePrompt(req: Request, res: Response): Promise<Response> {
    try {
      const validation = GenerateImagePromptSchema.safeParse(req.body);

      if (!validation.success) {
        return res.status(400).json({ errors: validation.error.errors });
      }

      const generateImagePromptUseCase = container.resolve(
        GenerateImagePromptUseCase,
      );
      const prompt = await generateImagePromptUseCase.execute(validation.data);

      return res.status(200).json({ prompt });
    } catch (error) {
      logger.error('Error generating image prompt:', error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }
}
