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

export const AiVideoAnalysisResponseSchema = z.object({
  title: z
    .string()
    .optional()
    .describe('Tile for the movie, one to two words.'),
  description: z
    .string()
    .optional()
    .describe('Comprehensive description (potentially multi-paragraph).'),
  genres: z.array(z.string()).optional().describe('List of applicable genres.'),
  imageGenerationPrompt: z
    .string()
    .optional()
    .describe(
      'Prompt for image generation. This will be used to generate the poster and backdrop images.',
    ),
  chaptersVtt: z
    .array(
      z.object({
        timecode: z.string().describe('Timecode of the chapter.'),
        chapterTitle: z.string().describe('Title of the chapter.'),
      }),
    )
    .optional()
    .describe(
      'Chapters in english language from the video. they should not include any spoilers and Please only capture key events and highlights. If you are not sure about any info, please do not make it up. ',
    ),
  subtities: z
    .object({
      hi: z.array(
        z.object({
          startTimecode: z.string().describe('start Timecode of the subtitle'),
          endTimecode: z.string().describe('end Timecode of the subtitle'),
          text: z
            .string()
            .describe(
              'natural sounding Translated hindi Text of the subtitles.',
            ),
          voiceGender: z.enum(['male', 'female']).describe('Voice gender.'),
          voiceType: z
            .enum(['neutral', 'angry', 'happy'])
            .describe('Voice type.'),
        }),
      ),
      pa: z.array(
        z.object({
          startTimecode: z.string().describe('start Timecode of the subtitle'),
          endTimecode: z.string().describe('end Timecode of the subtitle'),
          text: z
            .string()
            .describe(
              'Natural sounding Translated punjabi Text of the subtitles.',
            ),
          voiceGender: z.enum(['male', 'female']).describe('Voice gender.'),
          voiceType: z
            .enum(['neutral', 'angry', 'happy'])
            .describe('Voice type.'),
        }),
      ),
    })
    .describe('Subtitles in hindi and punjabi.'),
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

// const sourceLangCode = 'en';

export const ai = genkit({
  plugins: [vertexAI({ location: 'us-central1', projectId: '' })],
});

// export const AnalyzeSubtitlesFlow = ai.defineFlow(
//   {
//     name: 'AnalyzeSubtitlesFlow',
//     inputSchema: z.object({
//       vttContent: z.string().describe('Video subtitles in WebVTT format.'),
//     }),
//   },
//   async (input: { vttContent: string }) => {
//     const output = await ai.generate({
//       // Call generate on the ai instance
//       model: gemini15Flash, // Use the imported model
//       prompt: `Analyze the following video subtitles (in ${sourceLangCode}) and generate the metadata listed below.
//             Subtitles:
//             """
//             ${input.vttContent}
//             """
//             `,
//       config: {
//         temperature: 0.3, // Lower temperature for more deterministic JSON output
//       },
//       output: {
//         format: 'json', // Request JSON output
//         schema: AiResponseSchema, // Provide the Zod schema
//       },
//     });

//     return output;
//   },
// );

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
      imageGenerationPrompt: z
        .string()
        .optional()
        .describe(
          'Prompt for image generation. This will be used to generate the poster and backdrop images.',
        ),
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
      Initial Prompt: ${input.imageGenerationPrompt}

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

    // const promptGenerator = {
    //   text: 'test',
    // };

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
    const outputDir = path.join(process.cwd(), 'tmp', 'ai-generated');
    await fs.mkdir(outputDir, { recursive: true }); // Ensure directory exists

    let posterImagePath: string | undefined = undefined;
    let backdropImagePath: string | undefined = undefined;

    // posterImagePath = path
    //   .join(
    //     'public',
    //     'uploads',
    //     'ai-generated',
    //     'poster-4afbeb96-5b7d-4207-a617-1b4d382cc9d4.png',
    //   ) // Prepend '/' for root-relative path
    //   .replace(/\\/g, '/') // Ensure forward slashes for URL
    //   .replaceAll('tmp', '');
    // backdropImagePath = path
    //   .join(
    //     'public',
    //     'uploads',
    //     'ai-generated',
    //     'backdrop-2e0a51fb-d2a2-4f81-9763-40bacfa6a194.png',
    //   ) // Prepend '/' for root-relative path
    //   .replace(/\\/g, '/') // Ensure forward slashes for URL
    //   .replaceAll('tmp', '');

    // return {
    //   posterImagePath,
    //   backdropImagePath,
    // };

    // Generate Poster Image
    try {
      console.log('[GenerateMovieImagesFlow] Generating Poster Image...');
      const { media: posterImage } = await ai.generate({
        model: imagen3, // Use for image generation
        prompt: `${imagePrompt} - movie poster style, cinematic, high quality`,
        config: {
          temperature: 1,
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

      // // //todo: remove this
      // const image = await fs.readFile(
      //   path.join(
      //     process.cwd(),
      //     'tmp',
      //     'ai-generated',
      //     'poster-4afbeb96-5b7d-4207-a617-1b4d382cc9d4.png',
      //   ),
      // );
      // let posterImage = {
      //   url: `data:image/png;base64${image.toString('base64url')}`,
      // };

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
          .join('tmp', 'ai-generated', posterFilename) // Prepend '/' for root-relative path
          .replace(/\\/g, '/') // Ensure forward slashes for URL
          .replaceAll('/tmp', '');

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
      console.log('[GenerateMovieImagesFlow] Generating Backdrop Icmage...');
      const { media: backdropImage } = await ai.generate({
        model: imagen3, // Use for image generation
        prompt: `${imagePrompt} - cinematic wide aspect ratio movie backdrop style, high quality`,
        config: {
          temperature: 1,
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

      // //todo: remove this
      // let backdropImage = {
      //   url: `data:image/png;base64,${await fs.readFile(
      //     path.join(
      //       process.cwd(),
      //       'tmp',
      //       'ai-generated',
      //       'backdrop-2e0a51fb-d2a2-4f81-9763-40bacfa6a194.png',
      //     ),
      //     { encoding: 'base64url' },
      //   )}`,
      // };

      const backdropImageData = parseDataURL(backdropImage.url);
      if (backdropImageData) {
        const extension = backdropImageData.mimeType.subtype;
        const backdropFilename = `backdrop-${uuidv4()}.${extension}`;
        const fullBackdropPath = path.join(outputDir, backdropFilename);

        await fs.writeFile(fullBackdropPath, backdropImageData.body);
        backdropImagePath = path
          .join('tmp', 'ai-generated', backdropFilename) // Prepend '/' for root-relative path
          .replace(/\\/g, '/') // Ensure forward slashes for URL
          .replaceAll('/tmp', '');
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

export const VideoAnalysisFlow = ai.defineFlow(
  {
    name: 'VideoAnalysisFlow',
    inputSchema: z.object({
      videoFilePath: z.string().describe('Path to the video file.'),
    }),
    outputSchema: AiVideoAnalysisResponseSchema,
  },
  async (input) => {
    const b64Data = await fs.readFile(input.videoFilePath, {
      encoding: 'base64url',
    });
    const dataUrl = `data:video/mp4;base64,${b64Data}`;

    // const tempOutput = {
    //   subtities: {
    //     hi: [
    //       {
    //         endTimecode: '0:05',
    //         startTimecode: '0:03',
    //         text: 'कुछ लोग मुझे प्रकृति कहते हैं।',
    //         voiceGender: 'female',
    //         voiceType: 'neutral',
    //       },
    //       {
    //         endTimecode: '0:15',
    //         startTimecode: '0:11',
    //         text: 'दूसरे मुझे प्रकृति माता कहते हैं।',
    //         voiceGender: 'female',
    //         voiceType: 'neutral',
    //       },
    //       {
    //         endTimecode: '0:26',
    //         startTimecode: '0:16',
    //         text: 'मैं यहाँ साढ़े चार अरब साल से हूँ।',
    //         voiceGender: 'female',
    //         voiceType: 'neutral',
    //       },
    //       {
    //         endTimecode: '0:28',
    //         startTimecode: '0:26',
    //         text: 'तुम्हारे मुकाबले 22,500 गुना ज्यादा लम्बा।',
    //         voiceGender: 'female',
    //         voiceType: 'neutral',
    //       },
    //       {
    //         endTimecode: '0:32',
    //         startTimecode: '0:29',
    //         text: 'मुझे लोगों की वाकई जरूरत नहीं है।',
    //         voiceGender: 'female',
    //         voiceType: 'neutral',
    //       },
    //       {
    //         endTimecode: '0:35',
    //         startTimecode: '0:32',
    //         text: 'लेकिन लोगों को मेरी जरूरत है।',
    //         voiceGender: 'female',
    //         voiceType: 'neutral',
    //       },
    //       {
    //         endTimecode: '0:38',
    //         startTimecode: '0:36',
    //         text: 'हाँ, तुम्हारा भविष्य मुझ पर निर्भर है।',
    //         voiceGender: 'female',
    //         voiceType: 'neutral',
    //       },
    //       {
    //         endTimecode: '0:41',
    //         startTimecode: '0:38',
    //         text: 'जब मैं फलती फूलती हूँ, तो तुम फलते फूलते हो।',
    //         voiceGender: 'female',
    //         voiceType: 'neutral',
    //       },
    //       {
    //         endTimecode: '0:51',
    //         startTimecode: '0:43',
    //         text: 'जब मैं डगमगाती हूँ, तो तुम डगमगाते हो।',
    //         voiceGender: 'female',
    //         voiceType: 'neutral',
    //       },
    //       {
    //         endTimecode: '0:51',
    //         startTimecode: '0:51',
    //         text: 'या बदतर।',
    //         voiceGender: 'female',
    //         voiceType: 'neutral',
    //       },
    //       {
    //         endTimecode: '0:58',
    //         startTimecode: '0:53',
    //         text: 'लेकिन मैं तो सदियों से यहाँ हूँ।',
    //         voiceGender: 'female',
    //         voiceType: 'neutral',
    //       },
    //       {
    //         endTimecode: '1:03',
    //         startTimecode: '0:58',
    //         text: 'मैंने तुमसे महानतर प्रजातियों को खाना खिलाया है, और मैंने तुमसे महानतर प्रजातियों को भूखा रखा है।',
    //         voiceGender: 'female',
    //         voiceType: 'neutral',
    //       },
    //       {
    //         endTimecode: '1:06',
    //         startTimecode: '1:04',
    //         text: 'मेरे महासागर।',
    //         voiceGender: 'female',
    //         voiceType: 'neutral',
    //       },
    //       {
    //         endTimecode: '1:08',
    //         startTimecode: '1:07',
    //         text: 'मेरी मिट्टी।',
    //         voiceGender: 'female',
    //         voiceType: 'neutral',
    //       },
    //       {
    //         endTimecode: '1:11',
    //         startTimecode: '1:09',
    //         text: 'मेरी बहती धाराएँ, मेरे जंगल।',
    //         voiceGender: 'female',
    //         voiceType: 'neutral',
    //       },
    //       {
    //         endTimecode: '1:20',
    //         startTimecode: '1:16',
    //         text: 'वे सब तुम्हें ले सकते हैं।',
    //         voiceGender: 'female',
    //         voiceType: 'neutral',
    //       },
    //       {
    //         endTimecode: '1:21',
    //         startTimecode: '1:20',
    //         text: 'या छोड़ सकते हैं।',
    //         voiceGender: 'female',
    //         voiceType: 'neutral',
    //       },
    //       {
    //         endTimecode: '1:27',
    //         startTimecode: '1:22',
    //         text: 'हर दिन जीने का तुम्हारा चुनाव, चाहे तुम मेरा सम्मान करो या अनादर, मुझे उससे कोई फर्क नहीं पड़ता।',
    //         voiceGender: 'female',
    //         voiceType: 'neutral',
    //       },
    //       {
    //         endTimecode: '1:32',
    //         startTimecode: '1:29',
    //         text: 'एक तरह से या दूसरी तरह से।',
    //         voiceGender: 'female',
    //         voiceType: 'neutral',
    //       },
    //       {
    //         endTimecode: '1:35',
    //         startTimecode: '1:32',
    //         text: 'तुम्हारे कर्म तुम्हारा भविष्य तय करेंगे, मेरा नहीं।',
    //         voiceGender: 'female',
    //         voiceType: 'neutral',
    //       },
    //       {
    //         endTimecode: '1:37',
    //         startTimecode: '1:35',
    //         text: 'मैं प्रकृति हूँ।',
    //         voiceGender: 'female',
    //         voiceType: 'neutral',
    //       },
    //       {
    //         endTimecode: '1:38',
    //         startTimecode: '1:37',
    //         text: 'मैं आगे बढ़ती रहूँगी।',
    //         voiceGender: 'female',
    //         voiceType: 'neutral',
    //       },
    //       {
    //         endTimecode: '1:42',
    //         startTimecode: '1:39',
    //         text: 'मैं विकसित होने के लिए तैयार हूँ।',
    //         voiceGender: 'female',
    //         voiceType: 'neutral',
    //       },
    //       {
    //         endTimecode: '1:45',
    //         startTimecode: '1:44',
    //         text: 'क्या तुम तैयार हो?',
    //         voiceGender: 'female',
    //         voiceType: 'neutral',
    //       },
    //       {
    //         endTimecode: '1:47',
    //         startTimecode: '1:45',
    //         text: 'प्रकृति को लोगों की जरूरत नहीं है।',
    //         voiceGender: 'female',
    //         voiceType: 'neutral',
    //       },
    //       {
    //         endTimecode: '1:50',
    //         startTimecode: '1:48',
    //         text: 'लोगों को प्रकृति की जरूरत है।',
    //         voiceGender: 'female',
    //         voiceType: 'neutral',
    //       },
    //     ],
    //     pa: [
    //       {
    //         endTimecode: '0:05',
    //         startTimecode: '0:03',
    //         text: 'ਕੁਝ ਲੋਕ ਮੈਨੂੰ ਕੁਦਰਤ ਕਹਿੰਦੇ ਹਨ।',
    //         voiceGender: 'female',
    //         voiceType: 'neutral',
    //       },
    //       {
    //         endTimecode: '0:15',
    //         startTimecode: '0:11',
    //         text: 'ਦੂਸਰੇ ਮੈਨੂੰ ਮਾਂ ਕੁਦਰਤ ਕਹਿੰਦੇ ਹਨ।',
    //         voiceGender: 'female',
    //         voiceType: 'neutral',
    //       },
    //       {
    //         endTimecode: '0:26',
    //         startTimecode: '0:16',
    //         text: 'ਮੈਂ ਇੱਥੇ ਸਾਢੇ ਚਾਰ ਅਰਬ ਸਾਲਾਂ ਤੋਂ ਹਾਂ।',
    //         voiceGender: 'female',
    //         voiceType: 'neutral',
    //       },
    //       {
    //         endTimecode: '0:28',
    //         startTimecode: '0:26',
    //         text: 'ਤੁਹਾਡੇ ਮੁਕਾਬਲੇ 22,500 ਗੁਣਾ ਜ਼ਿਆਦਾ ਲੰਬਾ।',
    //         voiceGender: 'female',
    //         voiceType: 'neutral',
    //       },
    //       {
    //         endTimecode: '0:32',
    //         startTimecode: '0:29',
    //         text: 'ਮੈਨੂੰ ਲੋਕਾਂ ਦੀ ਅਸਲ ਵਿੱਚ ਲੋੜ ਨਹੀਂ ਹੈ।',
    //         voiceGender: 'female',
    //         voiceType: 'neutral',
    //       },
    //       {
    //         endTimecode: '0:35',
    //         startTimecode: '0:32',
    //         text: 'ਪਰ ਲੋਕਾਂ ਨੂੰ ਮੇਰੀ ਲੋੜ ਹੈ।',
    //         voiceGender: 'female',
    //         voiceType: 'neutral',
    //       },
    //       {
    //         endTimecode: '0:38',
    //         startTimecode: '0:36',
    //         text: "ਹਾਂ, ਤੁਹਾਡਾ ਭਵਿੱਖ ਮੇਰੇ 'ਤੇ ਨਿਰਭਰ ਕਰਦਾ ਹੈ।",
    //         voiceGender: 'female',
    //         voiceType: 'neutral',
    //       },
    //       {
    //         endTimecode: '0:41',
    //         startTimecode: '0:38',
    //         text: 'ਜਦੋਂ ਮੈਂ ਵਧਦੀ ਫੁੱਲਦੀ ਹਾਂ, ਤਾਂ ਤੁਸੀਂ ਵਧਦੇ ਫੁੱਲਦੇ ਹੋ।',
    //         voiceGender: 'female',
    //         voiceType: 'neutral',
    //       },
    //       {
    //         endTimecode: '0:51',
    //         startTimecode: '0:43',
    //         text: 'ਜਦੋਂ ਮੈਂ ਡਗਮਗਾਉਂਦੀ ਹਾਂ, ਤਾਂ ਤੁਸੀਂ ਡਗਮਗਾਉਂਦੇ ਹੋ।',
    //         voiceGender: 'female',
    //         voiceType: 'neutral',
    //       },
    //       {
    //         endTimecode: '0:51',
    //         startTimecode: '0:51',
    //         text: 'ਜਾਂ ਬਦਤਰ।',
    //         voiceGender: 'female',
    //         voiceType: 'neutral',
    //       },
    //       {
    //         endTimecode: '0:58',
    //         startTimecode: '0:53',
    //         text: 'ਪਰ ਮੈਂ ਤਾਂ ਸਦੀਆਂ ਤੋਂ ਇੱਥੇ ਹਾਂ।',
    //         voiceGender: 'female',
    //         voiceType: 'neutral',
    //       },
    //       {
    //         endTimecode: '1:03',
    //         startTimecode: '0:58',
    //         text: 'ਮੈਂ ਤੁਹਾਡੇ ਤੋਂ ਮਹਾਨ ਪ੍ਰਜਾਤੀਆਂ ਨੂੰ ਭੋਜਨ ਦਿੱਤਾ ਹੈ, ਅਤੇ ਮੈਂ ਤੁਹਾਡੇ ਤੋਂ ਮਹਾਨ ਪ੍ਰਜਾਤੀਆਂ ਨੂੰ ਭੁੱਖਾ ਰੱਖਿਆ ਹੈ।',
    //         voiceGender: 'female',
    //         voiceType: 'neutral',
    //       },
    //       {
    //         endTimecode: '1:06',
    //         startTimecode: '1:04',
    //         text: 'ਮੇਰੇ ਮਹਾਂਸਾਗਰ।',
    //         voiceGender: 'female',
    //         voiceType: 'neutral',
    //       },
    //       {
    //         endTimecode: '1:08',
    //         startTimecode: '1:07',
    //         text: 'ਮੇਰੀ ਮਿੱਟੀ।',
    //         voiceGender: 'female',
    //         voiceType: 'neutral',
    //       },
    //       {
    //         endTimecode: '1:11',
    //         startTimecode: '1:09',
    //         text: 'ਮੇਰੀਆਂ ਵਗਦੀਆਂ ਧਾਰਾਵਾਂ, ਮੇਰੇ ਜੰਗਲ।',
    //         voiceGender: 'female',
    //         voiceType: 'neutral',
    //       },
    //       {
    //         endTimecode: '1:20',
    //         startTimecode: '1:16',
    //         text: 'ਉਹ ਸਭ ਤੁਹਾਨੂੰ ਲੈ ਸਕਦੇ ਹਨ।',
    //         voiceGender: 'female',
    //         voiceType: 'neutral',
    //       },
    //       {
    //         endTimecode: '1:21',
    //         startTimecode: '1:20',
    //         text: 'ਜਾਂ ਛੱਡ ਸਕਦੇ ਹਨ।',
    //         voiceGender: 'female',
    //         voiceType: 'neutral',
    //       },
    //       {
    //         endTimecode: '1:27',
    //         startTimecode: '1:22',
    //         text: 'ਹਰ ਦਿਨ ਜਿਉਣ ਦਾ ਤੁਹਾਡਾ ਚੋਣ, ਚਾਹੇ ਤੁਸੀਂ ਮੇਰਾ ਸਨਮਾਨ ਕਰੋ ਜਾਂ ਅਨਾਦਰ, ਮੈਨੂੰ ਉਸ ਤੋਂ ਕੋਈ ਫ਼ਰਕ ਨਹੀਂ ਪੈਂਦਾ।',
    //         voiceGender: 'female',
    //         voiceType: 'neutral',
    //       },
    //       {
    //         endTimecode: '1:32',
    //         startTimecode: '1:29',
    //         text: 'ਇੱਕ ਤਰ੍ਹਾਂ ਨਾਲ ਜਾਂ ਦੂਸਰੀ ਤਰ੍ਹਾਂ ਨਾਲ।',
    //         voiceGender: 'female',
    //         voiceType: 'neutral',
    //       },
    //       {
    //         endTimecode: '1:35',
    //         startTimecode: '1:32',
    //         text: 'ਤੁਹਾਡੇ ਕਰਮ ਤੁਹਾਡਾ ਭਵਿੱਖ ਤੈਅ ਕਰਨਗੇ, ਮੇਰਾ ਨਹੀਂ।',
    //         voiceGender: 'female',
    //         voiceType: 'neutral',
    //       },
    //       {
    //         endTimecode: '1:37',
    //         startTimecode: '1:35',
    //         text: 'ਮੈਂ ਕੁਦਰਤ ਹਾਂ।',
    //         voiceGender: 'female',
    //         voiceType: 'neutral',
    //       },
    //       {
    //         endTimecode: '1:38',
    //         startTimecode: '1:37',
    //         text: 'ਮੈਂ ਅੱਗੇ ਵਧਦੀ ਰਹਾਂਗੀ।',
    //         voiceGender: 'female',
    //         voiceType: 'neutral',
    //       },
    //       {
    //         endTimecode: '1:42',
    //         startTimecode: '1:39',
    //         text: 'ਮੈਂ ਵਿਕਸਤ ਹੋਣ ਲਈ ਤਿਆਰ ਹਾਂ।',
    //         voiceGender: 'female',
    //         voiceType: 'neutral',
    //       },
    //       {
    //         endTimecode: '1:45',
    //         startTimecode: '1:44',
    //         text: 'ਕੀ ਤੁਸੀਂ ਤਿਆਰ ਹੋ?',
    //         voiceGender: 'female',
    //         voiceType: 'neutral',
    //       },
    //       {
    //         endTimecode: '1:47',
    //         startTimecode: '1:45',
    //         text: 'ਕੁਦਰਤ ਨੂੰ ਲੋਕਾਂ ਦੀ ਲੋੜ ਨਹੀਂ ਹੈ।',
    //         voiceGender: 'female',
    //         voiceType: 'neutral',
    //       },
    //       {
    //         endTimecode: '1:50',
    //         startTimecode: '1:48',
    //         text: 'ਲੋਕਾਂ ਨੂੰ ਕੁਦਰਤ ਦੀ ਲੋੜ ਹੈ।',
    //         voiceGender: 'female',
    //         voiceType: 'neutral',
    //       },
    //     ],
    //   },
    //   chaptersVtt: [
    //     {
    //       chapterTitle: 'Introduction',
    //       timecode: '00:00',
    //     },
    //     {
    //       chapterTitle: "Nature's Perspective",
    //       timecode: '00:03',
    //     },
    //     {
    //       chapterTitle: 'Dependence on Nature',
    //       timecode: '00:32',
    //     },
    //     {
    //       chapterTitle: "Nature's Resilience",
    //       timecode: '00:52',
    //     },
    //     {
    //       chapterTitle: 'Human Actions and Consequences',
    //       timecode: '01:22',
    //     },
    //     {
    //       chapterTitle: 'Call to Action',
    //       timecode: '01:42',
    //     },
    //   ],
    //   description:
    //     "This video emphasizes the relationship between humans and nature. Nature narrates, stating it has existed for billions of years and doesn't need humans, but humans need nature for survival. The video calls for humans to consider their impact on the environment and highlights the idea that the future depends on preserving nature.",
    //   genres: ['Nature', 'Conservation', 'Environment'],
    //   imageGenerationPrompt:
    //     'Create a stunning visual showcasing the earth from space with emphasis on preserving nature and the importance of environmental conservation.',
    //   title: 'Nature Speaking',
    // };

    const output = await ai.generate({
      model: gemini20Flash001,
      messages: [
        {
          role: 'user' as const,
          content: [
            {
              media: {
                mimeType: 'video/mp4',
                url: dataUrl,
              },
            },
            {
              text: `Generate translated subtitles and chapters for the following video file the subtitles should be in hindi and punjabi. They feel like a natural human translation.`,
            },
            {
              text: `Also generate chapters for the video file. in english language`,
            },
          ],
        },
      ],
      output: {
        format: 'json',
        schema: AiVideoAnalysisResponseSchema,
      },
    });

    return JSON.parse(output.text);

    // return tempOutput;
  },
);
