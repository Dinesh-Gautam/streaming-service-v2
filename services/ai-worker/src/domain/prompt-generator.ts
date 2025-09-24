import { z } from 'genkit';

export const ImagePromptInputSchema = z.object({
  title: z.string(),
  description: z.string(),
  genres: z.array(z.string()),
  imageGenerationPrompt: z.string(),
});

export type ImagePromptInput = z.infer<typeof ImagePromptInputSchema>;

export function generateImagePrompt(input: ImagePromptInput): string {
  return `Based on the following movie details, create a concise and evocative prompt suitable for an AI image generator. The prompt should capture the essence, mood, and visual style implied by the title, description, and genres. it is very important that the prompt should not offend any one wether it is an organization or a person. the prompt should not contain any name of person, organization. the prompt should not mention generation of any person.

      Title: ${input.title}
      Description: ${input.description}
      Genres: ${input.genres.join(', ')}
      Initial Prompt: ${input.imageGenerationPrompt}

      Consider the genres:
      - If genres include 'Documentary' or 'Educational', aim for a realistic or informative style.
      - If genres include 'Comedy', suggest a lighthearted or humorous visual.
      - If genres include 'Horror' or 'Thriller', imply suspense or darkness.
      - If genres include 'Sci-Fi' or 'Fantasy', suggest imaginative or futuristic visuals.
      - If genres include 'Animation', suggest a cartoonish or stylized look.
      - If genres include 'Action', imply dynamic movement or intensity.

       Generate a single, effective prompt string. The prompt should be able to generate visually stunning, vivid and colorful images.

       Only return the generated prompt.
       `;
}
