// Genkit Core and Google AI Plugin
// Assume genkit is configured globally, e.g., in genkit.config.ts

// Import Imagen model if available
import * as fs from 'fs/promises';
import * as path from 'path';

// Define the image generation model (ensure you have the necessary plugin)
// Assuming googleAI plugin supports Imagen or similar
// import { gemini15Flash } from '@genkit-ai/googleai'; // Import plugin and model
import {
  gemini15Flash,
  gemini20Flash001,
  imagen3,
  vertexAI,
} from '@genkit-ai/vertexai';
import parseDataURL from 'data-urls';
import { genkit } from 'genkit'; // Import from 'genkit'

import { v4 as uuidv4 } from 'uuid'; // Keep uuid for filenames

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

// Define schema for image generation flow output
export const AiImageResponseSchema = z.object({
  posterImagePath: z
    .string()
    .optional()
    .describe('Path to the generated poster image.'),
  backdropImagePath: z
    .string()
    .optional()
    .describe('Path to the generated backdrop image.'),
});

const sourceLangCode = 'en';

const ai = genkit({
  plugins: [vertexAI({ location: 'us-central1', projectId: '' })],
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

// --- New Flow for Generating Movie Images ---
export const GenerateMovieImagesFlow = ai.defineFlow(
  {
    name: 'GenerateMovieImagesFlow',
    inputSchema: z.object({
      title: z.string().describe('Movie title.'),
      description: z.string().describe('Movie description.'),
      genres: z.array(z.string()).describe('List of movie genres.'),
      movieId: z
        .string()
        .describe('Unique ID for the movie to associate images.'), // Used for saving path
    }),
    outputSchema: AiImageResponseSchema,
  },
  async (input) => {
    console.log(
      '[GenerateMovieImagesFlow] Starting image generation for:',
      input.title,
    );

    // Step 1: Generate a detailed image prompt using Gemini
    const promptGenerator = await ai.generate({
      model: gemini20Flash001,
      prompt: `Based on the following movie details, create a concise and evocative prompt suitable for an AI image generator. The prompt should capture the essence, mood, and visual style implied by the title, description, and genres. it is very important that the prompt should not offend any one wether it is an organization or a person. the prompt should not contain any name of person, organization. the prompt should not mention generation of any person.
     

      Title: ${input.title}
      Description: ${input.description}
      Genres: ${input.genres.join(', ')}

      Consider the genres:
      - If genres include 'Documentary' or 'Educational', aim for a realistic or informative style.
      - If genres include 'Comedy', suggest a lighthearted or humorous visual.
      - If genres include 'Horror' or 'Thriller', imply suspense or darkness.
      - If genres include 'Sci-Fi' or 'Fantasy', suggest imaginative or futuristic visuals.
      - If genres include 'Animation', suggest a cartoonish or stylized look.
      - If genres include 'Action', imply dynamic movement or intensity.

      Generate a single, effective prompt string.`,

      config: {
        temperature: 0.2, // Allow for some creativity in prompt generation
      },
      output: {
        format: 'text',
      },
    });

    const imagePrompt = promptGenerator.text; // Revert to property access based on linter feedback
    if (!imagePrompt) {
      throw new Error('Failed to generate image prompt.');
    }
    console.log(
      '[GenerateMovieImagesFlow] Generated Image Prompt:',
      imagePrompt,
    );

    // Step 2: Generate images using the model

    // Define target directory for saving images (relative to project root)
    // Ensure this directory exists and is writable by the server process.
    // It should also be accessible via a static file server if you plan to serve them directly.
    const outputDir = path.join(
      process.cwd(),
      'public',
      'uploads',
      'ai-generated',
      input.movieId,
    );
    await fs.mkdir(outputDir, { recursive: true }); // Ensure directory exists

    let posterImagePath: string | undefined = undefined;
    let backdropImagePath: string | undefined = undefined;

    // Generate Poster Image
    try {
      console.log('[GenerateMovieImagesFlow] Generating Poster Image...');
      const { media: posterImage } = await ai.generate({
        model: imagen3, // Use for image generation
        prompt: `${imagePrompt} - movie poster style, cinematic, high quality`,
        config: {
          temperature: 0.3,
          // mumbai
          location: 'asia-south1',
          aspectRatio: '9:16',
          language: 'en',
          safetySetting: 'block_few',
        },
        output: {
          format: 'media', // Expecting image data
        },
      });

      if (!posterImage) {
        throw new Error('Failed to generate poster image.');
      }

      const posterImageData = parseDataURL(posterImage.url);

      if (posterImageData) {
        const extension = posterImageData.mimeType.subtype;
        const posterFilename = `poster-${uuidv4()}.${extension}`;
        const fullPosterPath = path.join(outputDir, posterFilename);

        await fs.writeFile(fullPosterPath, posterImageData.body);
        // Store path relative to the 'public' directory for web access
        posterImagePath = path
          .join('/', 'uploads', 'ai-generated', input.movieId, posterFilename) // Prepend '/' for root-relative path
          .replace(/\\/g, '/'); // Ensure forward slashes for URL
        console.log(
          '[GenerateMovieImagesFlow] Poster image saved to:',
          fullPosterPath, // Log the actual file path
          'Web path:',
          posterImagePath,
        );
      } else {
        console.warn(
          '[GenerateMovieImagesFlow] Poster image generation did not return expected data/contentType.',
        );
        console.warn('Poster Media Object:', posterImage);
      }
    } catch (error) {
      console.error(
        '[GenerateMovieImagesFlow] Error generating poster image:',
        error,
      );
    }

    // Generate Backdrop Image
    try {
      console.log('[GenerateMovieImagesFlow] Generating Backdrop Image...');
      const { media: backdropImage } = await ai.generate({
        model: imagen3, // Use for image generation
        prompt: `${imagePrompt} - cinematic wide aspect ratio movie backdrop style, high quality`,
        config: {
          temperature: 0.3,
          aspectRatio: '16:9',
          language: 'en',
          safetySetting: 'block_few',
        },
        output: {
          format: 'media',
        },
      });

      if (!backdropImage) {
        throw new Error('Failed to generate backdrop image.');
      }

      const backdropImageData = parseDataURL(backdropImage.url);
      if (backdropImageData) {
        const extension = backdropImageData.mimeType.subtype;
        const backdropFilename = `backdrop-${uuidv4()}.${extension}`;
        const fullBackdropPath = path.join(outputDir, backdropFilename);

        await fs.writeFile(fullBackdropPath, backdropImageData.body);
        backdropImagePath = path
          .join('/', 'uploads', 'ai-generated', input.movieId, backdropFilename) // Prepend '/' for root-relative path
          .replace(/\\/g, '/'); // Ensure forward slashes for URL
        console.log(
          '[GenerateMovieImagesFlow] Backdrop image saved to:',
          fullBackdropPath, // Log the actual file path
          'Web path:',
          backdropImagePath,
        );
      } else {
        console.warn(
          '[GenerateMovieImagesFlow] Backdrop image generation did not return expected data/contentType.',
        );
        console.warn('Backdrop Media Object:', backdropImage);
      }
    } catch (error) {
      console.error(
        '[GenerateMovieImagesFlow] Error generating backdrop image:',
        error,
      );
    }

    if (!posterImagePath && !backdropImagePath) {
      // Decide whether to throw an error or return paths as undefined
      // Throwing might be better to signal complete failure.
      throw new Error('Failed to generate any images.');
    }

    return { posterImagePath, backdropImagePath };
  },
);
