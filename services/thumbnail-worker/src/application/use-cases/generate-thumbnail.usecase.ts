import { inject, injectable } from 'tsyringe';

import { ILogger } from '@monorepo/logger';
import { IMediaProcessor } from '@thumbnail-worker/application/ports/IMediaProcessor';
import { IJobRepository } from '@thumbnail-worker/domain/repositories/IJobRepository';

interface GenerateThumbnailInput {
  jobId: string;
  taskId: string;
  sourceUrl: string;
}

@injectable()
export class GenerateThumbnailUseCase {
  constructor(
    @inject('JobRepository') private jobRepository: IJobRepository,
    @inject('MediaProcessor') private mediaProcessor: IMediaProcessor,
    @inject('Logger') private logger: ILogger,
  ) {}

  async execute(input: GenerateThumbnailInput): Promise<void> {
    const { jobId, taskId, sourceUrl } = input;
    this.logger.info(
      `Starting thumbnail generation for job: ${jobId}, task: ${taskId}`,
    );

    try {
      await this.jobRepository.updateTaskStatus(jobId, taskId, 'running', 0);

      this.mediaProcessor.on('progress', (progress) => {
        this.jobRepository.updateTaskStatus(jobId, taskId, 'running', progress);
      });

      const result = await this.mediaProcessor.process(
        sourceUrl,
        `/tmp/output/${jobId}`, // Configurable path
      );

      if (result.success && result.output) {
        await this.jobRepository.updateTaskOutput(jobId, taskId, result.output);
        await this.jobRepository.updateTaskStatus(
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
      await this.jobRepository.failTask(jobId, taskId, errorMessage);
      this.logger.error(`Task ${taskId} failed: ${errorMessage}`, {
        stack: error instanceof Error ? error.stack : undefined,
      });
    }
  }
}
