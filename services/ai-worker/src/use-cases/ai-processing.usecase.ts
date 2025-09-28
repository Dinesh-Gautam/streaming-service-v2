import { inject, injectable } from 'tsyringe';

import type {
  IMediaProcessor,
  IStorage,
  ITaskRepository,
} from '@monorepo/core';
import type { AIEngineOutput, WorkerOutput } from '@monorepo/workers';

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

      const outputDir = jobId;

      const result = await this.mediaProcessor.process(
        tempInputPath,
        outputDir,
      );

      logger.info(`Task ${taskId} completed successfully.`);

      return result;
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
