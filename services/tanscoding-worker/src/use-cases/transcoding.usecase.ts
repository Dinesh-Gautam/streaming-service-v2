import * as path from 'path';
import { inject, injectable } from 'tsyringe';

import {
  DI_TOKENS,
  IMediaProcessor,
  IStorage,
  ITaskRepository,
  MediaPrcessorEvent,
} from '@monorepo/core';
import { TranscodingOutput, WorkerOutput } from '@monorepo/workers';

import { FfmpegTranscodingProcessor } from '../adapters/ffmpeg.media-processor';
import { config } from '../config';
import { logger } from '../config/logger';
import { MediaProcessorError } from '../entities/errors.entity';

interface TranscodingInput {
  jobId: string;
  taskId: string;
  sourceUrl: string;
  aiOutput?: { data?: { dubbedAudioPaths?: Record<string, string> } };
}

@injectable()
export class TranscodingUseCase {
  constructor(
    @inject(DI_TOKENS.TaskRepository) private taskRepository: ITaskRepository,
    @inject(DI_TOKENS.MediaProcessor)
    private mediaProcessor: IMediaProcessor<
      TranscodingOutput,
      { aiOutput?: { data?: { dubbedAudioPaths?: Record<string, string> } } }
    >,
    @inject(DI_TOKENS.Storage) private storage: IStorage,
  ) {}

  async execute(
    input: TranscodingInput,
  ): Promise<WorkerOutput<TranscodingOutput>> {
    const { jobId, taskId, sourceUrl, aiOutput } = input;

    logger.info(`Starting transcoding for job: ${jobId}, task: ${taskId}`);

    try {
      await this.taskRepository.updateTaskStatus(jobId, taskId, 'running', 0);

      this.mediaProcessor.on(
        MediaPrcessorEvent.Progress,
        (progress: number) => {
          this.taskRepository.updateTaskStatus(
            jobId,
            taskId,
            'running',
            progress,
          );
        },
      );

      const tempInputPath = await this.storage.downloadFile(sourceUrl);
      const tempOutputDir = `${config.TEMP_OUT_DIR}/${jobId}`;

      // Download dubbed audio files
      const dubbedAudioPaths = aiOutput?.data?.dubbedAudioPaths || {};
      const downloadedDubbedAudioPaths: Record<string, string> = {};
      for (const langCode in dubbedAudioPaths) {
        const audioUrl = dubbedAudioPaths[langCode];
        downloadedDubbedAudioPaths[langCode] =
          await this.storage.downloadFile(audioUrl);
      }

      const { output } = await this.mediaProcessor.process(
        tempInputPath,
        tempOutputDir,
        {
          aiOutput: {
            data: { dubbedAudioPaths: downloadedDubbedAudioPaths },
          },
        },
      );

      const finalOutput: TranscodingOutput = {
        ...output,
        manifest: await this.storage.saveFile(
          output.manifest,
          `${jobId}/${path.basename(output.manifest)}`,
        ),
      };

      await this.taskRepository.updateTaskOutput(jobId, taskId, finalOutput);
      await this.taskRepository.updateTaskStatus(
        jobId,
        taskId,
        'completed',
        100,
      );

      logger.info(`Task ${taskId} completed successfully.`);

      return {
        success: true,
        output: finalOutput,
      };
    } catch (error) {
      if (error instanceof MediaProcessorError) {
        logger.error(`Media processing error: ${error.message}`, {
          stack: error.stack,
        });
      } else if (error instanceof Error) {
        logger.error(`Error during transcoding: ${error.message}`, {
          stack: error.stack,
        });
      }

      await this.taskRepository.failTask(
        jobId,
        taskId,
        (error as any)?.message || 'Unknown error',
      );

      throw error;
    }
  }
}
