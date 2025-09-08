import { inject, injectable } from 'tsyringe';

import type {
  IMediaProcessor,
  ISourceResolver,
  ITaskRepository,
  ThumbnailOutput,
  WorkerOutput,
} from '@monorepo/core';
import type { IMessagePublisher } from '@monorepo/message-queue';

import {
  DI_TOKENS,
  MediaPrcessorEvent,
  MessageQueueChannels,
} from '@monorepo/core';
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
    @inject(DI_TOKENS.MediaProcessor) private mediaProcessor: IMediaProcessor,
    @inject(DI_TOKENS.SourceResolver) private sourceResolver: ISourceResolver,
    @inject(DI_TOKENS.MessagePublisher)
    private messagePublisher: IMessagePublisher,
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

      const resolvedSource = await this.sourceResolver.resolveSource(sourceUrl);

      const result = await this.mediaProcessor.process(
        resolvedSource,
        `${config.OUTPUT_DIR}/${jobId}`,
      );

      await this.taskRepository.updateTaskOutput(jobId, taskId, result.output);
      await this.taskRepository.updateTaskStatus(
        jobId,
        taskId,
        'completed',
        100,
      );

      logger.info(`Task ${taskId} completed successfully.`);

      return result;
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
