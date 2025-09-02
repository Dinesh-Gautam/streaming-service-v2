import { inject, injectable } from 'tsyringe';

import { ILogger } from '@monorepo/logger';
import { IMediaProcessor } from '@thumbnail-worker/application/ports/IMediaProcessor';
import { IJobRepository } from '@thumbnail-worker/domain/repositories/IJobRepository';

@injectable()
export class GenerateThumbnailUseCase {
  constructor(
    @inject('JobRepository') private jobRepository: IJobRepository,
    @inject('MediaProcessor') private mediaProcessor: IMediaProcessor,
    @inject('Logger') private logger: ILogger,
  ) {}

  async execute(jobId: string): Promise<void> {
    this.logger.info(`Starting thumbnail generation for job: ${jobId}`);
    const job = await this.jobRepository.findById(jobId);
    if (!job) {
      this.logger.error(`Job with id ${jobId} not found.`);
      return;
    }

    try {
      job.status = 'processing';
      await this.jobRepository.update(job);
      this.logger.info(`Job ${jobId} status updated to processing.`);

      const { thumbnailUrl } = await this.mediaProcessor.generateThumbnail(
        job.sourceUrl,
        '/tmp/output', // This should be a configurable path
      );

      job.status = 'completed';
      job.outputUrl = thumbnailUrl;
      await this.jobRepository.update(job);
      this.logger.info(
        `Job ${jobId} completed successfully. Thumbnail URL: ${thumbnailUrl}`,
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      job.status = 'failed';
      job.error = errorMessage;
      await this.jobRepository.update(job);
      this.logger.error(`Job ${jobId} failed: ${errorMessage}`, {
        stack: error instanceof Error ? error.stack : undefined,
      });
    }
  }
}
