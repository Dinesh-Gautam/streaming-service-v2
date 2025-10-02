import { z } from 'genkit';
import { injectable } from 'tsyringe';

import { ai } from '@ai-worker/config/ai.config';
import { logger } from '@ai-worker/config/logger';
import { generateImagePrompt } from '@ai-worker/domain/prompt-generator';
import { googleAI } from '@genkit-ai/google-genai';

export const GenerateImagePromptSchema = z.object({
  title: z.string(),
  description: z.string(),
  genres: z.array(z.string()),
  initialPrompt: z.string(),
  type: z.enum(['poster', 'backdrop']),
});

export type GenerateImagePromptInput = z.infer<
  typeof GenerateImagePromptSchema
>;

@injectable()
export class GenerateImagePromptUseCase {
  async execute(input: GenerateImagePromptInput): Promise<string> {
    logger.info('[GenerateImagePromptUseCase] Starting prompt generation...');

    if (!input) {
      throw new Error('Input is required');
    }

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
      model: googleAI.model('gemini-2.5-flash-lite'),
      prompt: generateImagePrompt({
        ...input,
        imageGenerationPrompt: input.initialPrompt,
      }),

      config: {
        temperature: 1, // Allow for some creativity in prompt generation
      },
    });

    if (!text) {
      throw new Error('Failed to generate prompt');
    }

    const pretext =
      input.type === 'poster' ?
        'A movie like poster style - '
      : 'A movie like backdrop style - ';

    const generatedPrompt = text;
    const finalPrompt = pretext + generatedPrompt;

    logger.info(
      `[GenerateImagePromptUseCase] Generated Final Prompt: ${finalPrompt}`,
    );

    return finalPrompt;
  }
}
