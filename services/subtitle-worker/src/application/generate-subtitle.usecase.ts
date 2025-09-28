import { promises as fs } from 'fs';
import * as path from 'path';
import { inject, injectable } from 'tsyringe';

import type { IStorage } from '@monorepo/core';
import type { ITranscriptionService } from '@subtitle-worker/interfaces/transcription.interface';
import type { ITranslationService } from '@subtitle-worker/interfaces/translation.interface';

import { DI_TOKENS, IAudioExtractor, ITaskRepository } from '@monorepo/core';
import { logger } from '@subtitle-worker/config/logger';
import { TranscriptionServiceToken } from '@subtitle-worker/interfaces/transcription.interface';
import { TranslationServiceToken } from '@subtitle-worker/interfaces/translation.interface';

import { SubtitleJobPayload } from '../domain/subtitle-job.entity';
import { SubtitleResult } from '../domain/subtitle-result.entity';

interface Utterance {
  start: number;
  end: number;
  transcript: string;
}

interface Transcription {
  utterances: Utterance[];
}

interface GenerateSubtitleInput {
  jobId: string;
  taskId: string;
  payload: SubtitleJobPayload;
}

const ProgressWeights = {
  AUDIO_EXTRACTION: 0.15,
  TRANSCRIPTION: 0.35,
  TRANSLATION: 0.5,
};

@injectable()
export class GenerateSubtitleUseCase {
  constructor(
    @inject(DI_TOKENS.AudioExtractor)
    private audioExtractor: IAudioExtractor,
    @inject(TranscriptionServiceToken)
    private transcriptionService: ITranscriptionService,
    @inject(TranslationServiceToken)
    private translationService: ITranslationService,
    @inject(DI_TOKENS.TaskRepository) private taskRepository: ITaskRepository,
    @inject(DI_TOKENS.Storage) private storage: IStorage,
  ) {}

  public async execute(input: GenerateSubtitleInput): Promise<SubtitleResult> {
    const { jobId, taskId, payload } = input;
    const { sourceFileUrl, sourceLanguage, targetLanguages } = payload;

    logger.info('starting subtitle generation');

    try {
      await this.taskRepository.updateTaskStatus(jobId, taskId, 'running', 0);

      let baseProgress = 0;

      this.audioExtractor.on('progress', (progress) => {
        this.taskRepository.updateTaskStatus(
          jobId,
          taskId,
          'running',
          baseProgress + progress * ProgressWeights.AUDIO_EXTRACTION,
        );
      });

      logger.info('starting audio extraction');
      // 1. Download video and extract audio
      const tempSourcePath = await this.storage.downloadFile(sourceFileUrl);
      const tempOutputDir = path.dirname(tempSourcePath);
      const audioPath = await this.audioExtractor.extractAudio(
        tempSourcePath,
        tempOutputDir,
      );
      baseProgress += ProgressWeights.AUDIO_EXTRACTION * 100;

      logger.info('Audio extracted', { audioPath });

      this.transcriptionService.on('progress', (progress) => {
        this.taskRepository.updateTaskStatus(
          jobId,
          taskId,
          'running',
          baseProgress + progress * ProgressWeights.TRANSCRIPTION,
        );
      });

      logger.info('Starting Trascription');
      // 2. Transcribe audio
      const transcription = await this.transcriptionService.transcribe(
        audioPath,
        sourceLanguage,
      );
      baseProgress += ProgressWeights.TRANSCRIPTION * 100;
      logger.info('transcription complete');

      // 3. Generate and save source language VTT
      const sourceVtt = this.generateVtt(transcription);
      const vttPaths: Record<string, string> = {};

      const tempSourceVttPath = path.join(
        tempOutputDir,
        `${path.basename(sourceFileUrl, path.extname(sourceFileUrl))}.${sourceLanguage}.vtt`,
      );

      await fs.writeFile(tempSourceVttPath, sourceVtt);

      vttPaths[sourceLanguage] = await this.storage.saveFile(
        tempSourceVttPath,
        `${jobId}/${path.basename(tempSourceVttPath)}`,
      );

      // 4. Translate and save target language VTTs
      const translationErrors: Record<string, string> = {};
      const languagesToTranslate = targetLanguages.filter(
        (lang) => lang !== sourceLanguage,
      );

      for (let i = 0; i < languagesToTranslate.length; i++) {
        const targetLang = languagesToTranslate[i];
        try {
          this.translationService.on('progress', (progress) => {
            const translationProgress =
              ((i + progress / 100) / languagesToTranslate.length) *
              ProgressWeights.TRANSLATION *
              100;
            this.taskRepository.updateTaskStatus(
              jobId,
              taskId,
              'running',
              baseProgress + translationProgress,
            );
          });

          const translatedVtt = await this.translationService.translateVtt(
            sourceVtt,
            sourceLanguage,
            targetLang,
          );
          const tempTargetVttPath = path.join(
            tempOutputDir,
            `${path.basename(sourceFileUrl, path.extname(sourceFileUrl))}.${targetLang}.vtt`,
          );
          await fs.writeFile(tempTargetVttPath, translatedVtt);
          vttPaths[targetLang] = await this.storage.saveFile(
            tempTargetVttPath,
            `${jobId}/${path.basename(tempTargetVttPath)}`,
          );
        } catch (error) {
          const message =
            error instanceof Error ? error.message : 'Unknown error';
          translationErrors[targetLang] = message;
        }
      }

      // 5. Finalize task
      const output: SubtitleResult = {
        vttPaths,
        ...(Object.keys(translationErrors).length > 0 && {
          translationErrors,
        }),
      };

      return output;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      await this.taskRepository.failTask(jobId, taskId, message);
      throw error;
    }
  }

  private generateVtt(transcription: Transcription): string {
    if (!transcription?.utterances) {
      return 'WEBVTT\n\n';
    }

    let vttContent = 'WEBVTT\n\n';
    for (const utterance of transcription.utterances) {
      if (utterance.transcript.trim() === '') continue;

      const startTime = this.formatVttTime(utterance.start);
      const endTime = this.formatVttTime(utterance.end);

      vttContent += `${startTime} --> ${endTime}\n`;
      vttContent += `${utterance.transcript.trim()}\n\n`;
    }

    return vttContent;
  }

  private formatVttTime(seconds: number): string {
    const date = new Date(0);
    date.setSeconds(seconds);
    const hours = date.getUTCHours().toString().padStart(2, '0');
    const minutes = date.getUTCMinutes().toString().padStart(2, '0');
    const secs = date.getUTCSeconds().toString().padStart(2, '0');
    const ms = date.getUTCMilliseconds().toString().padStart(3, '0');
    return `${hours}:${minutes}:${secs}.${ms}`;
  }
}
