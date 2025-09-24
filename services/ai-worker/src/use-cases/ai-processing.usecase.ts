import { inject, injectable } from 'tsyringe';

import type {
  IMediaProcessor,
  ISourceResolver,
  IStorage,
  ITaskRepository,
} from '@monorepo/core';
import type { AIEngineOutput, WorkerOutput } from '@monorepo/workers';

import config from '@ai-worker/config';
import { logger } from '@ai-worker/config/logger';
import { DI_TOKENS, MediaPrcessorEvent } from '@monorepo/core';

interface AIProcessingInput {
  jobId: string;
  taskId: string;
  sourceUrl: string;
}

@injectable()
export class AIProcessingUseCase {
  constructor(
    @inject(DI_TOKENS.TaskRepository) private taskRepository: ITaskRepository,
    @inject(DI_TOKENS.MediaProcessor)
    private mediaProcessor: IMediaProcessor<AIEngineOutput>,
    @inject(DI_TOKENS.SourceResolver) private sourceResolver: ISourceResolver,
    @inject(DI_TOKENS.Storage) private storage: IStorage,
  ) {}

  async execute(
    input: AIProcessingInput,
  ): Promise<WorkerOutput<AIEngineOutput>> {
    const { jobId, taskId, sourceUrl } = input;

    logger.info(`Starting AI processing for job: ${jobId}, task: ${taskId}`);

    try {
      await this.taskRepository.updateTaskStatus(jobId, taskId, 'running', 0);

      this.mediaProcessor.on(MediaPrcessorEvent.Progress, (progress) => {
        this.taskRepository.updateTaskStatus(
          jobId,
          taskId,
          'running',
          progress,
        );
      });

      const tempInputPath = await this.storage.downloadFile(sourceUrl);

      const tempOutputDir = `${config.TEMP_OUT_DIR}/${jobId}`;

      const { output } = await this.mediaProcessor.process(
        tempInputPath,
        tempOutputDir,
      );

      const finalOutputData: AIEngineOutput['data'] = {};

      if (output.data.posterImagePath) {
        finalOutputData.posterImagePath = output.data.posterImagePath;
      }

      if (output.data.backdropImagePath) {
        finalOutputData.backdropImagePath = output.data.backdropImagePath;
      }

      if (output.data.chapters?.vttPath) {
        finalOutputData.chapters = {
          vttPath: await this.storage.saveFile(
            output.data.chapters.vttPath,
            `${jobId}/chapters.vtt`,
          ),
        };
      }

      if (output.data.subtitles?.vttPaths) {
        finalOutputData.subtitles = { vttPaths: {} };
        for (const lang in output.data.subtitles.vttPaths) {
          finalOutputData.subtitles.vttPaths[lang] =
            await this.storage.saveFile(
              output.data.subtitles.vttPaths[lang],
              `${jobId}/subtitles/${lang}.vtt`,
            );
        }
      }

      if (output.data.dubbedAudioPaths) {
        finalOutputData.dubbedAudioPaths = {};
        for (const lang in output.data.dubbedAudioPaths) {
          const ext = output.data.dubbedAudioPaths[lang].split('.').pop();
          finalOutputData.dubbedAudioPaths[lang] = await this.storage.saveFile(
            output.data.dubbedAudioPaths[lang],
            `${jobId}/dubbed-audio/${lang}.${ext}`,
          );
        }
      }

      // Copy other non-path related data directly
      if (output.data.title) finalOutputData.title = output.data.title;
      if (output.data.description)
        finalOutputData.description = output.data.description;
      if (output.data.genres) finalOutputData.genres = output.data.genres;
      if (output.data.subtitleErrors)
        finalOutputData.subtitleErrors = output.data.subtitleErrors;
      if (output.data.audioProcessingErrors)
        finalOutputData.audioProcessingErrors =
          output.data.audioProcessingErrors;

      await this.taskRepository.updateTaskOutput(
        jobId,
        taskId,
        finalOutputData,
      );
      await this.taskRepository.updateTaskStatus(
        jobId,
        taskId,
        'completed',
        100,
      );

      logger.info(`Task ${taskId} completed successfully.`);

      return {
        success: true,
        output: {
          data: finalOutputData,
        },
      };
    } catch (error) {
      logger.error(`Error during AI processing: ${(error as Error).message}`, {
        stack: (error as Error).stack,
      });

      await this.taskRepository.failTask(
        jobId,
        taskId,
        (error as any)?.message || 'Unknown error',
      );

      throw error;
    }
  }
}
