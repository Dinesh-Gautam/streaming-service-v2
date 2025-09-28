import { EventEmitter } from 'events';
import * as fs from 'fs/promises';
import * as path from 'path';
import { inject, injectable } from 'tsyringe';

import type {
  AiChaptersData,
  AiVideoAnalysisResponseType,
} from '@ai-worker/models/types';

import config from '@ai-worker/config';
import { logger } from '@ai-worker/config/logger';
import { AppError, logError } from '@ai-worker/domain/errors';
import {
  AudioService,
  AudioServiceToken,
} from '@ai-worker/services/audio.service';
import {
  GenerateMovieImagesFlow,
  VideoAnalysisFlow,
} from '@ai-worker/use-cases/flow';
import {
  constructChaptersVtt,
  constructSubtitlesVtt,
} from '@ai-worker/utils/vtt.utils';
import {
  DI_TOKENS,
  IMediaProcessor,
  IStorage,
  MediaPrcessorEvent,
} from '@monorepo/core';
import { AIEngineOutput, WorkerOutput } from '@monorepo/workers';

@injectable()
export class AIMediaProcessor
  extends EventEmitter
  implements IMediaProcessor<AIEngineOutput>
{
  private name = 'AIMediaProcessor';

  constructor(
    @inject(AudioServiceToken) private audioService: AudioService,
    @inject(DI_TOKENS.Storage) private storage: IStorage,
  ) {
    super();
    logger.info(`[${this.name}] Initialized.`);
  }

  private updateProgress(progress: number) {
    logger.debug(`[${this.name}] Progress updated: ${progress}%`);
    this.emit(MediaPrcessorEvent.Progress, progress);
  }

  async process(
    inputFile: string,
    outputDir: string,
  ): Promise<WorkerOutput<AIEngineOutput>> {
    this.updateProgress(0);
    logger.info(
      `[${this.name}] Starting AI processing for: ${inputFile} into output directory: ${outputDir}`,
    );

    const tempDir = config.TEMP_OUT_DIR;

    logger.debug(`[${this.name}] Creating temporary directory: ${tempDir}`);
    await fs.mkdir(tempDir, { recursive: true });

    try {
      logger.info(`[${this.name}] Running video analysis for ${inputFile}...`);
      const analysisResult = await this.runVideoAnalysis(inputFile);
      this.updateProgress(40);
      logger.info(`[${this.name}] Video analysis completed.`);

      logger.info(`[${this.name}] Processing chapters...`);
      const chaptersVttPath = await this.processChapters(
        analysisResult.chaptersVtt,
        outputDir,
        path.parse(inputFile).name,
        tempDir,
      );
      this.updateProgress(45);
      logger.info(`[${this.name}] Chapters processing completed.`);

      logger.info(`[${this.name}] Processing subtitles...`);
      const { subtitlePaths, subtitleSaveErrors } = await this.processSubtitles(
        analysisResult.subtitles,
        outputDir,
        path.parse(inputFile).name,
        tempDir,
      );
      this.updateProgress(60);
      logger.info(`[${this.name}] Subtitles processing completed.`);

      logger.info(`[${this.name}] Generating images...`);
      const { posterImagePath, backdropImagePath } =
        await this.generateImages(analysisResult);
      this.updateProgress(90);
      logger.info(`[${this.name}] Image generation completed.`);

      logger.info(`[${this.name}] Processing audio...`);
      const { dubbedAudioPaths, audioProcessingErrors } =
        await this.processAudio(inputFile, tempDir, outputDir, analysisResult);
      this.updateProgress(99);
      logger.info(`[${this.name}] Audio processing completed.`);

      const outputData = this.constructOutput(
        analysisResult,
        chaptersVttPath,
        subtitlePaths,
        subtitleSaveErrors,
        posterImagePath,
        backdropImagePath,
        dubbedAudioPaths,
        audioProcessingErrors,
      );
      this.updateProgress(100);
      logger.info(`[${this.name}] AI processing completed successfully.`);
      this.emit(MediaPrcessorEvent.Completed, 100);

      return { success: true, output: { data: outputData } };
    } catch (error: any) {
      const appError = new AppError(
        'AiProcessingError',
        `Error during AI processing: ${error.message}`,
        { originalError: error },
      );
      logError(appError, this.name);
      this.emit(MediaPrcessorEvent.Error, appError.message);
      throw appError;
    } finally {
      await this.cleanup(tempDir);
    }
  }

  private async runVideoAnalysis(
    inputFile: string,
  ): Promise<AiVideoAnalysisResponseType> {
    logger.info(
      `[${this.name}] Sending video analysis request to Gemini for file: ${inputFile}...`,
    );
    this.updateProgress(15);
    const analysisResult = await VideoAnalysisFlow({
      videoFilePath: inputFile,
    });
    logger.info(
      `[${this.name}] Received and parsed AI video analysis response.`,
    );
    return analysisResult;
  }

  private async processChapters(
    chapters: AiChaptersData | undefined,
    outputDir: string,
    baseName: string,
    tempDir: string,
  ): Promise<string | undefined> {
    if (!chapters || chapters.length === 0) {
      logger.info(`[${this.name}] No chapters found to process.`);
      return undefined;
    }
    logger.debug(`[${this.name}] Constructing chapters VTT.`);
    const vttContent = constructChaptersVtt(chapters);
    const tempPath = path.join(tempDir, `${baseName}.chapters.vtt`);
    await fs.writeFile(tempPath, vttContent);
    const finalPath = await this.storage.saveFile(
      tempPath,
      path.join(outputDir, `${baseName}.chapters.vtt`),
    );
    logger.info(`[${this.name}] Chapters VTT saved to: ${finalPath}`);
    return finalPath;
  }

  private async processSubtitles(
    subtitles: AiVideoAnalysisResponseType['subtitles'],
    outputDir: string,
    baseName: string,
    tempDir: string,
  ) {
    const subtitlePaths: Record<string, string> = {};
    const subtitleSaveErrors: Record<string, string> = {};
    if (!subtitles) {
      logger.info(`[${this.name}] No subtitles found to process.`);
      return { subtitlePaths, subtitleSaveErrors };
    }

    for (const langCode of Object.keys(subtitles)) {
      const langSubtitles = subtitles[langCode as keyof typeof subtitles];
      if (langSubtitles && langSubtitles.length > 0) {
        logger.debug(
          `[${this.name}] Constructing subtitles VTT for language: ${langCode}`,
        );
        const vttContent = constructSubtitlesVtt(langSubtitles);
        const tempPath = path.join(tempDir, `${baseName}.${langCode}.ai.vtt`);
        try {
          await fs.writeFile(tempPath, vttContent);
          const finalPath = await this.storage.saveFile(
            tempPath,
            path.join(outputDir, `${baseName}.${langCode}.ai.vtt`),
          );
          subtitlePaths[langCode] = finalPath;
          logger.info(
            `[${this.name}] Subtitles VTT for '${langCode}' saved to: ${finalPath}`,
          );
        } catch (e: any) {
          const error = new AppError(
            'SubtitleSaveError',
            `Failed to save subtitles for '${langCode}': ${e.message}`,
            { originalError: e, langCode },
          );
          logError(error, this.name);
          subtitleSaveErrors[langCode] = error.message;
        }
      } else {
        logger.debug(
          `[${this.name}] No subtitle entries for language: ${langCode}`,
        );
      }
    }
    return { subtitlePaths, subtitleSaveErrors };
  }

  private async generateImages(aiData: AiVideoAnalysisResponseType) {
    if (!aiData.title || !aiData.description || !aiData.genres) {
      logger.warn(
        `[${this.name}] Skipping image generation due to missing data (title, description, or genres).`,
      );
      return {};
    }
    logger.info(`[${this.name}] Starting AI image generation ...`);
    this.updateProgress(65);
    try {
      const imageResult = await GenerateMovieImagesFlow(aiData);
      logger.info(`[${this.name}] AI image generation completed.`);
      this.updateProgress(90);
      return imageResult;
    } catch (e: any) {
      const error = new AppError(
        'ImageGenerationError',
        `AI image generation failed: ${e.message}`,
        { originalError: e },
      );
      logError(error, this.name);
      this.updateProgress(90);
      return {};
    }
  }

  private async processAudio(
    inputFile: string,
    tempDir: string,
    outputDir: string,
    analysisResult: AiVideoAnalysisResponseType,
  ) {
    const dubbedAudioPaths: Record<string, string> = {};
    const audioProcessingErrors: Record<string, string> = {};
    const baseName = path.parse(inputFile).name;
    const originalAudioPath = path.join(tempDir, `${baseName}_original.wav`);

    try {
      logger.info(
        `[${this.name}] Extracting audio from ${inputFile} to ${originalAudioPath}...`,
      );
      await this.audioService.extractAudio(inputFile, originalAudioPath);
      this.updateProgress(91);
      logger.info(
        `[${this.name}] Audio extracted. Removing vocals from ${originalAudioPath}...`,
      );
      const instrumentalAudioPath = await this.audioService.removeVocals(
        originalAudioPath,
        tempDir,
      );

      // const instrumentalAudioPath =
      //   '/temp/output/sample_original_Instruments.wav';

      this.updateProgress(93);
      logger.info(
        `[${this.name}] Vocals removed. Instrumental audio path: ${instrumentalAudioPath}`,
      );

      const processedDubbedAudioPaths =
        await this.audioService.generateDubbedAudio(
          instrumentalAudioPath,
          analysisResult,
          tempDir,
          (p) => this.updateProgress(93 + p * 0.06),
        );

      for (const langCode in processedDubbedAudioPaths) {
        const tempDubbedPath = processedDubbedAudioPaths[langCode];
        const finalPath = await this.storage.saveFile(
          tempDubbedPath,
          path.join(outputDir, `${baseName}.${langCode}.dubbed.mp3`),
        );
        dubbedAudioPaths[langCode] = finalPath;
        logger.info(
          `[${this.name}] Dubbed audio for ${langCode} saved to: ${finalPath}`,
        );
      }
    } catch (e: any) {
      const error = new AppError(
        'AudioProcessingError',
        `General audio processing error: ${e.message}`,
        { originalError: e },
      );
      logError(error, this.name);
      audioProcessingErrors['general'] = error.message;
    }
    return { dubbedAudioPaths, audioProcessingErrors };
  }

  private constructOutput(
    aiData: AiVideoAnalysisResponseType,
    chaptersVttPath: string | undefined,
    subtitlePaths: Record<string, string>,
    subtitleSaveErrors: Record<string, string>,
    posterImagePath: string | undefined,
    backdropImagePath: string | undefined,
    dubbedAudioPaths: Record<string, string>,
    audioProcessingErrors: Record<string, string>,
  ): AIEngineOutput['data'] {
    logger.debug(`[${this.name}] Constructing final output data.`);
    return {
      title: aiData.title,
      description: aiData.description,
      genres: aiData.genres,
      chapters: chaptersVttPath ? { vttPath: chaptersVttPath } : undefined,
      subtitles:
        Object.keys(subtitlePaths).length > 0 ?
          { vttPaths: subtitlePaths }
        : undefined,
      posterImagePath,
      backdropImagePath,
      ...(Object.keys(subtitleSaveErrors).length > 0 && {
        subtitleErrors: subtitleSaveErrors,
      }),
      ...(Object.keys(dubbedAudioPaths).length > 0 && { dubbedAudioPaths }),
      ...(Object.keys(audioProcessingErrors).length > 0 && {
        audioProcessingErrors,
      }),
    };
  }

  private async cleanup(tempDir: string) {
    try {
      logger.info(`[${this.name}] Cleaning up temporary directory: ${tempDir}`);
      await fs.rm(tempDir, { recursive: true, force: true });
      logger.info(
        `[${this.name}] Temporary directory ${tempDir} removed successfully.`,
      );
    } catch (e: any) {
      const error = new AppError(
        'CleanupError',
        `Failed to remove temporary directory ${tempDir}: ${e.message}`,
        { originalError: e },
      );
      logError(error, this.name);
    }
  }
}
