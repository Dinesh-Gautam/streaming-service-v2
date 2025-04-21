// Genkit Core and Google AI Plugin
// Assume genkit is configured globally, e.g., in genkit.config.ts
import { gemini15Flash, googleAI } from '@genkit-ai/googleai'; // Import plugin and model
import { genkit } from 'genkit'; // Import from 'genkit'

// Import base class and types
import { z } from 'zod'; // Using Zod for parsing the structured output

// Define the expected JSON structure from the AI model using Zod
export const AiResponseSchema = z.object({
  title: z
    .string()
    .optional()
    .describe('Tile for the movie, one to two words.'),
  description: z
    .string()
    .optional()
    .describe('Comprehensive description (potentially multi-paragraph).'),
  genres: z.array(z.string()).optional().describe('List of applicable genres.'),
  chaptersVtt: z
    .array(
      z.object({
        startTime: z.number().describe('Start time of the chapter in seconds.'),
        chapterTitle: z.string().describe('Title of the chapter.'),
      }),
    )
    .optional()
    .describe(
      'Chapter markers in WebVTT format string. Do not include spoilers.',
    ),
  keywords: z
    .array(z.string())
    .optional()
    .describe('List of relevant keywords or tags.'),
  suggestedAgeRating: z
    .string()
    .optional()
    .describe(
      "Suggested age rating (e.g., 'G', 'PG', 'PG-13', 'R', 'NC-17', 'Unrated').",
    ),
  contentWarnings: z
    .array(z.string())
    .optional()
    .describe(
      "List of applicable content warnings (e.g., 'Violence', 'Flashing Lights', 'Strong Language').",
    ),
});

const sourceLangCode = 'en';

const ai = genkit({
  plugins: [
    googleAI({
      apiKey: process.env.GOOGLE_API_KEY,
    }),
  ],
});

export const AnalyzeSubtitlesFlow = ai.defineFlow(
  {
    name: 'AnalyzeSubtitlesFlow',
    inputSchema: z.object({
      vttContent: z.string().describe('Video subtitles in WebVTT format.'),
    }),
  },
  async (input: { vttContent: string }) => {
    const output = await ai.generate({
      // Call generate on the ai instance
      model: gemini15Flash, // Use the imported model
      prompt: `Analyze the following video subtitles (in ${sourceLangCode}) and generate the metadata listed below.
            Subtitles:
            """
            ${input.vttContent}
            """
            `,
      config: {
        temperature: 0.3, // Lower temperature for more deterministic JSON output
      },
      output: {
        format: 'json', // Request JSON output
        schema: AiResponseSchema, // Provide the Zod schema
      },
    });

    return output;
  },
);
