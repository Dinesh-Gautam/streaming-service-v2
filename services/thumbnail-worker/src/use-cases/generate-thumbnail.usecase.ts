import { inject, injectable } from 'tsyringe';

import type { IMediaProcessor, ITaskRepository } from '@monorepo/core';

import { DI_TOKENS } from '@monorepo/core';
import { ILogger } from '@monorepo/logger';

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
    @inject(DI_TOKENS.Logger) private logger: ILogger,
  ) {}

  async execute(input: GenerateThumbnailInput): Promise<void> {
    const { jobId, taskId, sourceUrl } = input;
    this.logger.info(
      `Starting thumbnail generation for job: ${jobId}, task: ${taskId}`,
    );

    try {
      await this.taskRepository.updateTaskStatus(jobId, taskId, 'running', 0);

      this.mediaProcessor.on('progress', (progress) => {
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

      if (result.success && result.output) {
        await this.taskRepository.updateTaskOutput(
          jobId,
          taskId,
          result.output,
        );
        await this.taskRepository.updateTaskStatus(
          jobId,
          taskId,
          'completed',
          100,
        );
        this.logger.info(`Task ${taskId} completed successfully.`);
      } else {
        throw new Error(result.error || 'Unknown processing error');
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      await this.taskRepository.failTask(jobId, taskId, errorMessage);
      this.logger.error(`Task ${taskId} failed: ${errorMessage}`, {
        stack: error instanceof Error ? error.stack : undefined,
      });
    }
  }
}
