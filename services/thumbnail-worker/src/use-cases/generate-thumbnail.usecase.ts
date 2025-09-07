import { inject, injectable } from 'tsyringe';

import type { IMediaProcessor, ITaskRepository } from '@monorepo/core';

import { DI_TOKENS, MediaPrcessorEvent } from '@monorepo/core';
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
    @inject(DI_TOKENS.MediaProcessor) private mediaProcessor: IMediaProcessor,
  ) {}

  async execute(input: GenerateThumbnailInput): Promise<void> {
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

      const result = await this.mediaProcessor.process(
        sourceUrl,
        `/tmp/output/${jobId}`, // Configurable path
      );

      await this.taskRepository.updateTaskOutput(jobId, taskId, result.output);
      await this.taskRepository.updateTaskStatus(
        jobId,
        taskId,
        'completed',
        100,
      );

      logger.info(`Task ${taskId} completed successfully.`);
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
