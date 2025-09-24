import { z } from 'genkit';

export const AiVideoAnalysisResponseSchema = z.object({
  title: z
    .string()
    .describe(
      'Short, catchy title for the movie (one to two words). Avoid including spoilers.',
    ),

  description: z
    .string()
    .describe(
      'Detailed, engaging description of the movie. Can be multiple paragraphs. ' +
        'Focus on tone, atmosphere, and themes without revealing major plot twists or spoilers.',
    ),

  genres: z
    .array(z.string())
    .optional()
    .describe(
      'List of applicable genres (e.g., "Drama", "Thriller", "Comedy").',
    ),

  imageGenerationPrompt: z
    .string()
    .describe(
      'High-quality, descriptive prompt for AI image generation. ' +
        'Describe the overall aesthetic, mood, main characters, and setting. ' +
        'Avoid text overlays or watermarks.',
    ),

  chaptersVtt: z
    .array(
      z.object({
        timecode: z
          .string()
          .describe(
            'Exact timestamp marking the start of the chapter (HH:MM:SS format).',
          ),
        chapterTitle: z
          .string()
          .describe(
            'Short, descriptive chapter title summarizing the key event or moment. Avoid spoilers.',
          ),
      }),
    )
    .optional()
    .describe(
      'List of chapters extracted from the video. Keep them concise, spoiler-free, ' +
        'and focused on major transitions or highlights. Do not invent chapters if unsure.',
    ),

  subtities: z
    .object({
      hi: z.array(
        z.object({
          startTimecode: z
            .string()
            .describe('Subtitle start time (HH:MM:SS format).'),
          endTimecode: z
            .string()
            .describe('Subtitle end time (HH:MM:SS format).'),
          text: z.string().describe('Natural, fluent Hindi subtitle text.'),
          voiceGender: z
            .enum(['male', 'female'])
            .describe('Preferred voice gender for text-to-speech.'),
          voiceType: z
            .enum(['neutral', 'angry', 'happy'])
            .describe('Emotion or tone of voice for delivery.'),
        }),
      ),
      pa: z.array(
        z.object({
          startTimecode: z
            .string()
            .describe('Subtitle start time (HH:MM:SS format).'),
          endTimecode: z
            .string()
            .describe('Subtitle end time (HH:MM:SS format).'),
          text: z
            .string()
            .describe('Natural, fluent Punjabi translation of the subtitle.'),
          voiceGender: z
            .enum(['male', 'female'])
            .describe('Preferred voice gender for text-to-speech.'),
          voiceType: z
            .enum(['neutral', 'angry', 'happy'])
            .describe('Emotion or tone of voice for delivery.'),
        }),
      ),
    })
    .describe(
      'Subtitles in Hindi (hi) and Punjabi (pa). Ensure translations sound natural and match the tone of the scene.',
    ),
});

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
