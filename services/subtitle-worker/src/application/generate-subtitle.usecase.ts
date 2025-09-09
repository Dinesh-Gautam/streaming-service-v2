import * as path from 'path';
import { inject, injectable } from 'tsyringe';

import type { IStorage } from '@monorepo/core';

import {
  DI_TOKENS,
  IAudioExtractor,
  ISourceResolver,
  ITaskRepository,
  ITranscriptionService,
  ITranslationService,
} from '@monorepo/core';

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
    @inject(DI_TOKENS.TranscriptionService)
    private transcriptionService: ITranscriptionService,
    @inject(DI_TOKENS.TranslationService)
    private translationService: ITranslationService,
    @inject(DI_TOKENS.TaskRepository) private taskRepository: ITaskRepository,
    @inject(DI_TOKENS.SourceResolver) private sourceResolver: ISourceResolver,
    @inject(DI_TOKENS.Storage) private storage: IStorage,
  ) {}

  public async execute(input: GenerateSubtitleInput): Promise<SubtitleResult> {
    const { jobId, taskId, payload } = input;
    const { sourceFileUrl, outputDir, sourceLanguage, targetLanguages } =
      payload;

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

      // 1. Extract audio from video
      const resolvedSource =
        await this.sourceResolver.resolveSource(sourceFileUrl);
      const audioPath = await this.audioExtractor.extractAudio(
        resolvedSource,
        '/tmp/audio',
      );
      baseProgress += ProgressWeights.AUDIO_EXTRACTION * 100;

      this.transcriptionService.on('progress', (progress) => {
        this.taskRepository.updateTaskStatus(
          jobId,
          taskId,
          'running',
          baseProgress + progress * ProgressWeights.TRANSCRIPTION,
        );
      });

      // 2. Transcribe audio
      const transcription = await this.transcriptionService.transcribe(
        audioPath,
        sourceLanguage,
      );
      baseProgress += ProgressWeights.TRANSCRIPTION * 100;

      // 3. Generate and save source language VTT
      const sourceVtt = this.generateVtt(transcription);
      const vttPaths: Record<string, string> = {};
      const sourceVttPath = path.join(
        outputDir,
        `${path.basename(sourceFileUrl, path.extname(sourceFileUrl))}.${sourceLanguage}.vtt`,
      );
      await this.storage.writeFile(sourceVttPath, sourceVtt);
      vttPaths[sourceLanguage] = sourceVttPath;

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
          const targetVttPath = path.join(
            outputDir,
            `${path.basename(sourceFileUrl, path.extname(sourceFileUrl))}.${targetLang}.vtt`,
          );
          await this.storage.writeFile(targetVttPath, translatedVtt);
          vttPaths[targetLang] = targetVttPath;
        } catch (error) {
          const message =
            error instanceof Error ? error.message : 'Unknown error';
          translationErrors[targetLang] = message;
        }
      }

      // 5. Finalize task
      const output: SubtitleResult = {
        vttPaths,
        transcriptionData: transcription,
        ...(Object.keys(translationErrors).length > 0 && {
          translationErrors,
        }),
      };

      await this.taskRepository.updateTaskOutput(jobId, taskId, output);
      await this.taskRepository.updateTaskStatus(
        jobId,
        taskId,
        'completed',
        100,
      );
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
