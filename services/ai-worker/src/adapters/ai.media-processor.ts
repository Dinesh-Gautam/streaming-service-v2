import { exec } from 'child_process';
import { EventEmitter } from 'events';
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import parseDataURL from 'data-urls';
import ffmpeg from 'fluent-ffmpeg';
import { genkit } from 'genkit';
// Import from 'genkit'
import { v4 as uuidv4 } from 'uuid'; // Keep uuid for filenames
import { z } from 'zod'; // Using Zod for parsing the structured output

import type { AIEngineOutput } from '@monorepo/workers';
import type { Action } from 'genkit';

// Genkit Core and Google AI Plugin
// Assume genkit is configured globally, e.g., in genkit.config.ts
import {
  gemini15Flash,
  gemini20Flash001,
  imagen3,
  vertexAI,
} from '@genkit-ai/vertexai';
import { TextToSpeechClient } from '@google-cloud/text-to-speech';
import { IMediaProcessor, MediaPrcessorEvent } from '@monorepo/core';
import { WorkerOutput } from '@monorepo/workers';

import config from '../config';
import { logger } from '../config/logger';

// Import base class and types

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

export const ai = genkit({
  plugins: [
    vertexAI({
      location: 'us-central1',
      projectId: config.GOOGLE_PROJECT_ID,
    }),
  ],
});

export const GenerateMovieImagesFlow: Action = ai.defineFlow(
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
    }) as any,
    outputSchema: AiImageResponseSchema as any,
  },
  async (input) => {
    logger.info(
      `[GenerateMovieImagesFlow] Starting image generation for: ${input.title}`,
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
        }) as any,
        format: 'json',
      },
    });

    const imagePrompt = promptGenerator.text; // Revert to property access based on linter feedback
    if (!imagePrompt) {
      throw new Error('Failed to generate image prompt.');
    }
    logger.info(
      `[GenerateMovieImagesFlow] Generated Image Prompt: ${imagePrompt}`,
    );

    const outputDir = path.join(process.cwd(), 'tmp', 'ai-generated');
    await fs.promises.mkdir(outputDir, { recursive: true }); // Ensure directory exists

    let posterImagePath: string | undefined = undefined;
    let backdropImagePath: string | undefined = undefined;

    // Generate Poster Image
    try {
      logger.info('[GenerateMovieImagesFlow] Generating Poster Image...');
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

      if (!posterImage) {
        throw new Error('Failed to generate poster image.');
      }

      const posterImageData = parseDataURL(posterImage.url);

      if (posterImageData) {
        const extension = posterImageData.mimeType.subtype;
        const posterFilename = `poster-${uuidv4()}.${extension}`;
        const fullPosterPath = path.join(outputDir, posterFilename);

        await fs.promises.writeFile(fullPosterPath, posterImageData.body);
        // Store path relative to the 'public' directory for web access
        posterImagePath = path
          .join('tmp', 'ai-generated', posterFilename) // Prepend '/' for root-relative path
          .replace(/\\/g, '/') // Ensure forward slashes for URL
          .replaceAll('/tmp', '');

        logger.info(
          `[GenerateMovieImagesFlow] Poster image saved to: ${fullPosterPath}, Web path: ${posterImagePath}`,
        );
      } else {
        logger.warn(
          '[GenerateMovieImagesFlow] Poster image generation did not return expected data/contentType.',
        );
        logger.warn(`Poster Media Object: ${posterImage}`);
      }
    } catch (error) {
      logger.error(
        `[GenerateMovieImagesFlow] Error generating poster image: ${error}`,
      );
    }

    // Generate Backdrop Image
    try {
      logger.info('[GenerateMovieImagesFlow] Generating Backdrop Image...');
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

      const backdropImageData = parseDataURL(backdropImage.url);
      if (backdropImageData) {
        const extension = backdropImageData.mimeType.subtype;
        const backdropFilename = `backdrop-${uuidv4()}.${extension}`;
        const fullBackdropPath = path.join(outputDir, backdropFilename);

        await fs.promises.writeFile(fullBackdropPath, backdropImageData.body);
        backdropImagePath = path
          .join('tmp', 'ai-generated', backdropFilename) // Prepend '/' for root-relative path
          .replace(/\\/g, '/') // Ensure forward slashes for URL
          .replaceAll('/tmp', '');
        logger.info(
          `[GenerateMovieImagesFlow] Backdrop image saved to: ${fullBackdropPath}, Web path: ${backdropImagePath}`,
        );
      } else {
        logger.warn(
          '[GenerateMovieImagesFlow] Backdrop image generation did not return expected data/contentType.',
        );
        logger.warn(`Backdrop Media Object: ${backdropImage}`);
      }
    } catch (error) {
      logger.error(
        `[GenerateMovieImagesFlow] Error generating backdrop image: ${error}`,
      );
    }

    if (!posterImagePath && !backdropImagePath) {
      throw new Error('Failed to generate any images.');
    }

    return { posterImagePath, backdropImagePath };
  },
);

export const VideoAnalysisFlow: Action = ai.defineFlow(
  {
    name: 'VideoAnalysisFlow',
    inputSchema: z.object({
      videoFilePath: z.string().describe('Path to the video file.'),
    }) as any,
    outputSchema: AiVideoAnalysisResponseSchema as any,
  },
  async (input) => {
    const b64Data = await fs.promises.readFile(input.videoFilePath, {
      encoding: 'base64url',
    });
    const dataUrl = `data:video/mp4;base64,${b64Data}`;

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
        schema: AiVideoAnalysisResponseSchema as any,
      },
    });

    return JSON.parse(output.text);
  },
);

type AiSubtitleEntry = {
  startTimecode: string;
  endTimecode: string;
  text: string;
  voiceGender: 'male' | 'female';
  voiceType: 'neutral' | 'angry' | 'happy';
};

type AiChaptersData = {
  timecode: string;
  chapterTitle: string;
}[];

type AiVideoAnalysisResponseType = z.infer<
  typeof AiVideoAnalysisResponseSchema
>;

const execPromise = promisify(exec);

export class AIMediaProcessor
  extends EventEmitter
  implements IMediaProcessor<AIEngineOutput>
{
  private ttsClient: TextToSpeechClient;
  private engineName = 'AIMediaProcessor';

  constructor() {
    super();
    try {
      this.ttsClient = new TextToSpeechClient({
        projectId: config.GOOGLE_PROJECT_ID,
      });
      logger.info(`[${this.engineName}] Google TTS Client Initialized.`);
    } catch (error: any) {
      logger.error(
        `[${this.engineName}] Failed to initialize Google TTS Client: ${error.message}`,
      );
      this.ttsClient = null as any;
    }
  }

  private updateProgress(progress: number) {
    this.emit(MediaPrcessorEvent.Progress, progress);
  }

  async process(
    inputFile: string,
    outputDir: string,
  ): Promise<WorkerOutput<AIEngineOutput>> {
    this.emit(MediaPrcessorEvent.Progress, 0);

    logger.info(
      `[${this.engineName}] Starting AI processing for: ${inputFile}`,
    );

    if (!config.GOOGLE_API_KEY) {
      const errorMsg = 'GOOGLE_API_KEY environment variable not set.';
      logger.error(`[${this.engineName}] ${errorMsg}`);
      this.emit(MediaPrcessorEvent.Error, errorMsg);
      throw new Error(errorMsg);
    }
    if (!this.ttsClient) {
      const errorMsg = 'Google TTS Client failed to initialize.';
      logger.error(`[${this.engineName}] ${errorMsg}`);
      this.emit(MediaPrcessorEvent.Error, errorMsg);
      throw new Error(errorMsg);
    }

    const movieId = path.basename(outputDir);
    const baseName = path.parse(inputFile).name;
    if (!movieId) {
      const errorMsg = `Could not determine movieId from outputDir: ${outputDir}`;
      logger.error(`[${this.engineName}] ${errorMsg}`);
      this.emit(MediaPrcessorEvent.Error, errorMsg);
      throw new Error(errorMsg);
    }
    logger.info(`[${this.engineName}] Using movieId: ${movieId}`);

    const tempAudioDir = await fs.promises.mkdir(path.join('temp/'), {
      recursive: true,
    });
    logger.info(`[${this.engineName}] Created temp directory: ${tempAudioDir}`);

    if (!tempAudioDir) {
      throw new Error(
        `[${this.engineName}] Failed to create temp directory: ${tempAudioDir}`,
      );
    }

    try {
      logger.info(
        `[${this.engineName}] Sending video analysis request to Gemini...`,
      );
      this.updateProgress(15);

      const analysisResult = await VideoAnalysisFlow({
        videoFilePath: inputFile,
      });

      this.updateProgress(40);

      const aiData = analysisResult as AiVideoAnalysisResponseType;
      logger.info(
        `[${this.engineName}] Received and parsed AI video analysis response.`,
      );

      let chaptersVttContent: string | undefined = undefined;
      let chaptersVttPath: string | undefined = undefined;
      if (aiData.chaptersVtt && aiData.chaptersVtt.length > 0) {
        chaptersVttContent = this._constructChaptersVtt(aiData.chaptersVtt);
        chaptersVttPath = path.join(outputDir, `${baseName}.chapters.vtt`);
        try {
          await fs.promises.writeFile(chaptersVttPath, chaptersVttContent);
          logger.info(
            `[${this.engineName}] Chapters VTT saved to: ${chaptersVttPath}`,
          );
        } catch (writeError: any) {
          logger.warn(
            `[${this.engineName}] Failed to save chapters VTT file: ${writeError.message}`,
          );
          chaptersVttPath = undefined;
          chaptersVttContent = undefined;
        }
      } else {
        logger.info(`[${this.engineName}] No chapter VTT generated by AI.`);
      }
      this.updateProgress(45);

      const subtitlePaths: Record<string, string> = {};
      const subtitleSaveErrors: Record<string, string> = {};

      if (aiData.subtities && Object.keys(aiData.subtities).length > 0) {
        logger.info(`[${this.engineName}] Processing generated subtitles...`);
        const languages = Object.keys(aiData.subtities);
        const totalLangs = languages.length;
        let langsProcessed = 0;

        for (const langCode of languages) {
          const subtitles =
            aiData.subtities[langCode as keyof typeof aiData.subtities];
          if (subtitles && subtitles.length > 0) {
            const vttContent = this._constructSubtitlesVtt(subtitles);
            const vttPath = path.join(
              outputDir,
              `${baseName}.${langCode}.ai.vtt`,
            );
            try {
              await fs.promises.writeFile(vttPath, vttContent);
              subtitlePaths[langCode] = vttPath;
              logger.info(
                `[${this.engineName}] Subtitles VTT for '${langCode}' saved to: ${vttPath}`,
              );
            } catch (writeError: any) {
              const errorMsg = `Failed to save subtitles VTT for '${langCode}': ${writeError.message}`;
              logger.warn(`[${this.engineName}] ${errorMsg}`);
              subtitleSaveErrors[langCode] = errorMsg;
            }
          } else {
            logger.info(
              `[${this.engineName}] No subtitle entries found for language '${langCode}'.`,
            );
          }
          langsProcessed++;
          const subtitleProgress = 45 + (langsProcessed / totalLangs) * 15;
          this.updateProgress(subtitleProgress);
        }
      } else {
        logger.info(`[${this.engineName}] No subtitles generated by AI.`);
        this.updateProgress(60);
      }

      let posterImagePath: string | undefined = undefined;
      let backdropImagePath: string | undefined = undefined;

      if (aiData.title && aiData.description && aiData.genres) {
        logger.info(`[${this.engineName}] Starting AI image generation...`);
        this.updateProgress(65);
        try {
          const imageResult = await GenerateMovieImagesFlow({
            movieId: movieId,
            title: aiData.title,
            description: aiData.description,
            genres: aiData.genres,
            imageGenerationPrompt: aiData.imageGenerationPrompt,
          });
          posterImagePath = imageResult.posterImagePath;
          backdropImagePath = imageResult.backdropImagePath;
          logger.info(`[${this.engineName}] AI image generation completed.`);
          this.updateProgress(90);
        } catch (imageError: any) {
          logger.warn(
            `[${this.engineName}] AI image generation failed: ${imageError.message}`,
            imageError,
          );
          this.updateProgress(90);
        }
      } else {
        logger.warn(
          `[${this.engineName}] Skipping image generation due to missing title, description, or genres from text analysis.`,
        );
        this.updateProgress(90);
      }
      this.updateProgress(90);

      let dubbedAudioPaths: Record<string, string> = {};
      let audioProcessingErrors: Record<string, string> = {};
      const originalAudioPath = path.join(
        tempAudioDir,
        `${baseName}_original.wav`,
      );
      const instrumentalAudioPath = path.join(
        tempAudioDir,
        `${baseName}_original_Instruments.wav`,
      );
      const vocalAudioPath = path.join(
        tempAudioDir,
        `${baseName}_original_Vocals.wav`,
      );

      try {
        logger.info(`[${this.engineName}] Extracting original audio...`);
        await this._extractAudio(inputFile, originalAudioPath);
        logger.info(
          `[${this.engineName}] Original audio extracted to: ${originalAudioPath}`,
        );
        this.updateProgress(91);

        logger.info(`[${this.engineName}] Removing vocals...`);
        const binDir = path.resolve('bin');
        const vocalRemoverExe = 'vocal_remover.exe';
        const absoluteInputAudioPath = path.resolve(originalAudioPath);

        const vocalRemoverCommand = `"${vocalRemoverExe}" -P "models/baseline.pth" --output_dir "${path.join(process.cwd(), 'temp')}" --input "${absoluteInputAudioPath}"`;

        logger.info(
          `[${this.engineName}] Executing vocal remover command: ${vocalRemoverCommand} in CWD: ${binDir}`,
        );
        await this._runCommand(vocalRemoverCommand, binDir);
        logger.info(
          `[${this.engineName}] Vocal removal complete. Instrumental expected at: ${instrumentalAudioPath}`,
        );

        try {
          await fs.promises.access(instrumentalAudioPath);
        } catch (accessError) {
          throw new Error(
            `Vocal remover did not produce the expected instrumental file: ${instrumentalAudioPath}`,
          );
        }
        this.updateProgress(93);

        if (aiData.subtities && Object.keys(aiData.subtities).length > 0) {
          const languages = Object.keys(
            aiData.subtities,
          ) as (keyof typeof aiData.subtities)[];
          const totalLangs = languages.length;
          let langsProcessed = 0;

          for (const langCode of languages) {
            const langSubtitles = aiData.subtities[langCode];
            if (langSubtitles && langSubtitles.length > 0) {
              logger.info(
                `[${this.engineName}] Starting dubbing process for language: ${langCode}`,
              );
              const langProgressStart = 93 + (langsProcessed / totalLangs) * 6;
              this.updateProgress(langProgressStart);

              try {
                const finalDubbedPath = path.join(
                  outputDir,
                  `${baseName}.${langCode}.dubbed.mp3`,
                );

                await this._generateDubbedAudio(
                  instrumentalAudioPath,
                  langSubtitles,
                  langCode,
                  tempAudioDir,
                  finalDubbedPath,
                  (progress) =>
                    this.updateProgress(langProgressStart + progress * 0.06),
                );
                dubbedAudioPaths[langCode] = finalDubbedPath;
                logger.info(
                  `[${this.engineName}] Dubbed audio for '${langCode}' saved to: ${finalDubbedPath}`,
                );
              } catch (dubError: any) {
                const errorMsg = `Failed to generate dubbed audio for '${langCode}': ${dubError.message}`;
                logger.error(`[${this.engineName}] ${errorMsg}`, dubError);
                audioProcessingErrors[langCode] = errorMsg;
              }
            }
            langsProcessed++;
          }
        } else {
          logger.info(`[${this.engineName}] No subtitles found for dubbing.`);
        }
      } catch (audioError: any) {
        const errorMsg = `Audio processing failed: ${audioError.message}`;
        logger.error(`[${this.engineName}] ${errorMsg}`, audioError);
        if (Object.keys(audioProcessingErrors).length === 0) {
          audioProcessingErrors['general'] = errorMsg;
        }
      } finally {
        try {
          logger.info(
            `[${this.engineName}] Cleaning up temporary directory: ${tempAudioDir}`,
          );
          await fs.promises.rm(tempAudioDir, { recursive: true, force: true });
          logger.info(`[${this.engineName}] Temporary directory removed.`);
        } catch (cleanupError: any) {
          logger.warn(
            `[${this.engineName}] Failed to remove temporary directory ${tempAudioDir}: ${cleanupError.message}`,
          );
        }
      }

      this.updateProgress(99);

      const outputData: AIEngineOutput['data'] = {
        title: aiData.title,
        description: aiData.description,
        genres: aiData.genres,
        chapters: chaptersVttPath ? { vttPath: chaptersVttPath } : undefined,
        subtitles:
          Object.keys(subtitlePaths).length > 0 ?
            { vttPaths: subtitlePaths }
          : undefined,
        posterImagePath: posterImagePath,
        backdropImagePath: backdropImagePath,
        ...(Object.keys(subtitleSaveErrors).length > 0 && {
          subtitleErrors: subtitleSaveErrors,
        }),
        ...(Object.keys(dubbedAudioPaths).length > 0 && {
          dubbedAudioPaths: dubbedAudioPaths,
        }),
        ...(Object.keys(audioProcessingErrors).length > 0 && {
          audioProcessingErrors,
        }),
      };

      this.updateProgress(100);
      logger.info(`[${this.engineName}] AI processing completed successfully.`);
      this.emit(MediaPrcessorEvent.Completed, 100);
      return {
        success: true,
        output: {
          data: outputData,
        },
      };
    } catch (error: any) {
      if (tempAudioDir) {
        try {
          logger.warn(
            `[${this.engineName}] Cleaning up temporary directory due to error: ${tempAudioDir}`,
          );
          await fs.promises.rm(tempAudioDir, { recursive: true, force: true });
        } catch (cleanupError: any) {
          logger.error(
            `[${this.engineName}] Failed to remove temporary directory ${tempAudioDir} after error: ${cleanupError.message}`,
          );
        }
      }

      let errorMessage = 'An unexpected error occurred during AI processing.';
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      logger.error(
        `[${this.engineName}] Error during AI processing: ${errorMessage}`,
        error,
      );
      this.emit(MediaPrcessorEvent.Error, errorMessage);
      throw new Error(errorMessage);
    }
  }

  private _constructChaptersVtt(chapters: AiChaptersData): string {
    let vttContent = 'WEBVTT\n\n';
    chapters.sort(
      (a, b) =>
        this._timecodeToSeconds(a.timecode) -
        this._timecodeToSeconds(b.timecode),
    );

    for (let i = 0; i < chapters.length; i++) {
      const chapter = chapters[i];
      const nextChapter = chapters[i + 1];
      const startTimeFormatted = this._formatVttTime(chapter.timecode);

      let endTimeFormattedFinal: string;
      if (nextChapter) {
        endTimeFormattedFinal = this._formatVttTime(nextChapter.timecode);
      } else {
        const startSeconds = this._timecodeToSeconds(chapter.timecode);
        endTimeFormattedFinal = this._secondsToVttTime(startSeconds + 300);
      }

      vttContent += `${startTimeFormatted} --> ${endTimeFormattedFinal}\n`;
      vttContent += `${chapter.chapterTitle}\n\n`;
    }

    return vttContent;
  }

  private _constructSubtitlesVtt(subtitles: AiSubtitleEntry[]): string {
    let vttContent = 'WEBVTT\n\n';

    for (const sub of subtitles) {
      if (sub.text.trim() === '') continue;

      const startTime = this._formatVttTime(sub.startTimecode);
      const endTime = this._formatVttTime(sub.endTimecode);

      vttContent += `${startTime} --> ${endTime}\n`;
      vttContent += `${sub.text.trim()}\n\n`;
    }

    return vttContent;
  }

  private _timecodeToSeconds(timecode: string): number {
    const parts = timecode.split(':').map(Number);
    let seconds = 0;
    if (parts.length === 3) {
      seconds = parts[0] * 3600 + parts[1] * 60 + parts[2];
    } else if (parts.length === 2) {
      seconds = parts[0] * 60 + parts[1];
    } else if (parts.length === 1) {
      seconds = parts[0];
    }
    return isNaN(seconds) ? 0 : Math.max(0, seconds);
  }

  private _secondsToVttTime(seconds: number): string {
    const validSeconds = Math.max(0, seconds);
    const totalMilliseconds = Math.round(validSeconds * 1000);

    const ms = (totalMilliseconds % 1000).toString().padStart(3, '0');
    const totalSecondsInt = Math.floor(totalMilliseconds / 1000);
    const secs = (totalSecondsInt % 60).toString().padStart(2, '0');
    const totalMinutesInt = Math.floor(totalSecondsInt / 60);
    const minutes = (totalMinutesInt % 60).toString().padStart(2, '0');
    const hours = Math.floor(totalMinutesInt / 60)
      .toString()
      .padStart(2, '0');

    return `${hours}:${minutes}:${secs}.${ms}`;
  }

  private _formatVttTime(timecode: string): string {
    const seconds = this._timecodeToSeconds(timecode);
    return this._secondsToVttTime(seconds);
  }

  private async _runCommand(
    command: string,
    cwd?: string,
  ): Promise<{ stdout: string; stderr: string }> {
    logger.info(
      `[${this.engineName}] Executing command: ${command} in ${cwd || process.cwd()}`,
    );
    try {
      const { stdout, stderr } = await execPromise(command, { cwd });
      if (stderr) {
        logger.warn(`[${this.engineName}] Command stderr:\n${stderr}`);
      }
      logger.info(`[${this.engineName}] Command stdout:\n${stdout}`);
      return { stdout, stderr };
    } catch (error: any) {
      logger.error(
        `[${this.engineName}] Command failed: ${command}\nError: ${error.message}\nStdout: ${error.stdout}\nStderr: ${error.stderr}`,
      );
      throw new Error(
        `Command execution failed: ${error.message}. Stderr: ${error.stderr}`,
      );
    }
  }

  private _extractAudio(
    inputFile: string,
    outputAudioFile: string,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      ffmpeg(inputFile)
        .noVideo()
        .audioCodec('pcm_s16le')
        .audioFrequency(44100)
        .audioChannels(2)
        .output(outputAudioFile)
        .on('error', (err) => {
          logger.error(
            `[${this.engineName}] Error extracting audio: ${err.message}`,
          );
          reject(new Error(`Failed to extract audio: ${err.message}`));
        })
        .on('end', () => {
          logger.info(
            `[${this.engineName}] Audio extraction finished: ${outputAudioFile}`,
          );
          resolve();
        })
        .run();
    });
  }

  private async _generateTTSAudio(
    text: string,
    languageCode: string,
    voiceGender: 'male' | 'female',
    outputFile: string,
  ): Promise<void> {
    let voiceName = '';
    if (languageCode.startsWith('hi')) {
      voiceName =
        voiceGender === 'male' ?
          'hi-IN-Chirp3-HD-Charon'
        : 'hi-IN-Chirp3-HD-Aoede';
    } else if (languageCode.startsWith('pa')) {
      voiceName =
        voiceGender === 'male' ? 'pa-IN-Wavenet-B' : 'pa-IN-Wavenet-C';
    } else {
      throw new Error(`Unsupported language code for TTS: ${languageCode}`);
    }

    const request = {
      input: { text: text },
      voice: { languageCode: languageCode, name: voiceName },
      audioConfig: { audioEncoding: 'MP3' as const },
    };

    try {
      logger.info(
        `[${this.engineName}] Requesting TTS for "${text.substring(0, 30)}..." (Voice: ${voiceName})`,
      );
      const [response] = await this.ttsClient.synthesizeSpeech(request);
      if (!response.audioContent) {
        throw new Error('TTS response did not contain audio content.');
      }
      await fs.promises.writeFile(outputFile, response.audioContent, 'binary');
      logger.info(
        `[${this.engineName}] TTS audio content written to file: ${outputFile}`,
      );
    } catch (error: any) {
      logger.error(
        `[${this.engineName}] Google TTS API error for voice ${voiceName}: ${error.message}`,
      );
      throw new Error(`TTS generation failed: ${error.message}`);
    }
  }

  private async _generateDubbedAudio(
    instrumentalAudioPath: string,
    subtitles: AiSubtitleEntry[],
    langCode: string,
    tempDir: string,
    finalOutputPath: string,
    onProgress: (progress: number) => void,
  ): Promise<void> {
    const ttsLangCode = langCode === 'hi' ? 'hi-IN' : 'pa-IN';
    const segmentFiles: string[] = [];
    let lastEndTimeSec = 0;

    onProgress(0);

    for (let i = 0; i < subtitles.length; i++) {
      const sub = subtitles[i];
      const startTimeSec = this._timecodeToSeconds(sub.startTimecode);
      const endTimeSec = this._timecodeToSeconds(sub.endTimecode);
      const segmentPath = path.join(tempDir, `tts_${langCode}_${i}.mp3`);

      if (sub.text.trim()) {
        await this._generateTTSAudio(
          sub.text,
          ttsLangCode,
          sub.voiceGender,
          segmentPath,
        );

        segmentFiles.push(segmentPath);
        lastEndTimeSec = endTimeSec;
      }
      onProgress(((i + 1) / subtitles.length) * 50);
    }

    onProgress(50);

    const assembledTTSPath = path.join(tempDir, `assembled_${langCode}.mp3`);

    if (segmentFiles.length === 0) {
      logger.info(
        `[${this.engineName}] No TTS segments generated for ${langCode}, skipping assembly and merge.`,
      );
      return;
    }

    await new Promise<void>((resolve, reject) => {
      const command = ffmpeg();
      const filterComplex: string[] = [];
      let outputStreams = '';

      segmentFiles.forEach((segmentPath, index) => {
        command.input(segmentPath);
        const sub = subtitles[index];
        const startTimeMs = Math.round(
          this._timecodeToSeconds(sub.startTimecode) * 1000,
        );
        filterComplex.push(
          `[${index}:a]adelay=${startTimeMs}|${startTimeMs}[aud${index}]`,
        );
        outputStreams += `[aud${index}]`;
      });

      filterComplex.push(
        `${outputStreams}amix=inputs=${segmentFiles.length}:normalize=1:dropout_transition=0[mixed]`,
      );
      filterComplex.push(`[mixed]dynaudnorm=p=0.95:m=20[mixout]`);

      command
        .complexFilter(filterComplex)
        .map('[mixout]')
        .audioCodec('libmp3lame')
        .audioQuality(2)
        .output(assembledTTSPath)
        .on('start', (commandLine) => {
          logger.info(
            `[${this.engineName}] Assembling TTS track for ${langCode} with command: ${commandLine}`,
          );
        })
        .on('error', (err, stdout, stderr) => {
          logger.error(
            `[${this.engineName}] Error assembling TTS track for ${langCode}: ${err.message}`,
          );
          logger.error(`[${this.engineName}] ffmpeg stderr: ${stderr}`);
          reject(
            new Error(
              `Failed to assemble TTS track for ${langCode}: ${err.message}`,
            ),
          );
        })
        .on('end', () => {
          logger.info(
            `[${this.engineName}] Assembled TTS track saved to: ${assembledTTSPath}`,
          );
          resolve();
        })
        .run();
    });

    onProgress(80);

    await new Promise<void>((resolve, reject) => {
      ffmpeg()
        .input(instrumentalAudioPath)
        .input(assembledTTSPath)
        .complexFilter([
          '[0:a]dynaudnorm=p=0.95:m=20[instr_norm]',
          '[instr_norm]volume=0.2:precision=fixed[instr_lowered]',
          '[1:a]dynaudnorm=p=0.95:m=20[tts_normalized]',
          '[tts_normalized]volume=2.0[tts_boosted]',
          '[instr_lowered][tts_boosted]amerge=inputs=2[aout]',
        ])
        .map('[aout]')
        .audioCodec('libmp3lame')
        .audioQuality(2)
        .output(finalOutputPath)
        .on('start', (commandLine) => {
          logger.info(
            `[${this.engineName}] Merging final audio for ${langCode} with command: ${commandLine}`,
          );
        })
        .on('error', (err, stdout, stderr) => {
          logger.error(
            `[${this.engineName}] Error merging final audio for ${langCode}: ${err.message}`,
          );
          logger.error(`[${this.engineName}] ffmpeg stderr: ${stderr}`);
          reject(
            new Error(
              `Failed to merge final audio for ${langCode}: ${err.message}`,
            ),
          );
        })
        .on('end', () => {
          logger.info(
            `[${this.engineName}] Final dubbed audio saved to: ${finalOutputPath}`,
          );
          resolve();
        })
        .run();
    });

    onProgress(100);
  }
}
