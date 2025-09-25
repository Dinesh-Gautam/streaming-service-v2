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
            'Exact timestamp marking the start of the chapter (HH:MM:SS.mmm format).',
          ),
        chapterTitle: z
          .string()
          .describe(
            'Short, descriptive chapter title summarizing the key event or moment. Avoid spoilers.',
          ),
      }),
    )
    .describe(
      'List of chapters extracted from the video. Keep them concise, spoiler-free, ' +
        'and focused on major transitions or highlights. Do not invent chapters if unsure.',
    ),

  subtitles: z
    .object({
      hi: z.array(
        z.object({
          startTimecode: z
            .string()
            .describe(
              'Start time in strict HH : MM : SS . mmm format (e.g., "00:00:13.200").',
            ),
          endTimecode: z
            .string()
            .describe(
              'End time in strict HH : MM : SS . mmm format. Must be greater than start time.',
            ),
          text: z
            .string()
            .describe(
              'Write **full, continuous Hindi sentences** instead of splitting them into multiple short lines. ' +
                'Merge consecutive speech fragments into one block if they are part of the same idea. ' +
                'Ensure each subtitle block is long enough (at least 4–5 words) so TTS reads naturally. ' +
                'Do NOT break sentences unnaturally; prefer a single block per full sentence.',
            ),
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
            .describe('Start time in strict HH : MM : SS . mmm  format.'),
          endTimecode: z
            .string()
            .describe('End time in strict HH : MM : SS . mmm  format.'),
          text: z
            .string()
            .describe(
              'Write **full, continuous Punjabi sentences** instead of breaking them into multiple short lines. ' +
                'Merge consecutive fragments if part of the same idea. Minimum length: 4–5 words for TTS friendliness.',
            ),
          voiceGender: z.enum(['male', 'female']),
          voiceType: z.enum(['neutral', 'angry', 'happy']),
        }),
      ),
    })
    .describe(
      'Subtitles must be TTS-friendly: each block should be a complete sentence or meaningful phrase. ' +
        'Avoid overly short subtitles like "wow" or "hi" alone. ' +
        'Prefer combining adjacent lines so TTS reads them smoothly.',
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
