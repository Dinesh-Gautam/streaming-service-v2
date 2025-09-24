import { inject, injectable } from 'tsyringe';

import type {
  IMediaProcessor,
  IStorage,
  ITaskRepository,
} from '@monorepo/core';
import type { ThumbnailOutput, WorkerOutput } from '@monorepo/workers';

import { DI_TOKENS, MediaPrcessorEvent } from '@monorepo/core';
import { config } from '@thumbnail-worker/config';
import { logger } from '@thumbnail-worker/config/logger';
import { MediaProcessorError } from '@thumbnail-worker/entities/errors.entity';

interface GenerateThumbnailInput {
  jobId: string;
  taskId: string;
  sourceUrl: string;
}

@injectable()
export class GenerateThumbnailUseCase {
  constructor(
    @inject(DI_TOKENS.TaskRepository) private taskRepository: ITaskRepository,
    @inject(DI_TOKENS.MediaProcessor)
    private mediaProcessor: IMediaProcessor<ThumbnailOutput>,
    @inject(DI_TOKENS.Storage) private storage: IStorage,
  ) {}

  async execute(
    input: GenerateThumbnailInput,
  ): Promise<WorkerOutput<ThumbnailOutput>> {
    const { jobId, taskId, sourceUrl } = input;

    logger.info(
      `Starting thumbnail generation for job: ${jobId}, task: ${taskId}`,
    );

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

      const finalPaths = {
        vtt: await this.storage.saveFile(
          output.paths.vtt,
          `${jobId}/thumbnails.vtt`,
        ),
        thumbnailsDir: await this.storage.saveFile(
          output.paths.thumbnailsDir,
          `${jobId}/thumbnails`,
        ),
      };

      await this.taskRepository.updateTaskOutput(jobId, taskId, {
        paths: finalPaths,
      });
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
          paths: finalPaths,
        },
      };
    } catch (error) {
      if (error instanceof MediaProcessorError) {
        logger.error(`Media processing error: ${error.message}`, {
          stack: error.stack,
        });
      }

      if (error instanceof Error) {
        logger.error(`Error during thumbnail generation: ${error.message}`, {
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
