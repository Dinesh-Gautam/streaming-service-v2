import { inject, injectable } from 'tsyringe';

import type { IJobRepository, WorkerMessages } from '@monorepo/core';

import { logger } from '@job-service/adapters/logger.adapter';
import { DI_TOKENS } from '@job-service/config';
import { JobNotFoundError } from '@job-service/entities/errors.entity';
import { MediaTask, MessageQueueChannels } from '@monorepo/core';
import { IMessagePublisher } from '@monorepo/message-queue';

export interface RetryJobInput {
  mediaId: string;
}

@injectable()
export class RetryJobUseCase {
  constructor(
    @inject(DI_TOKENS.JobRepository) private jobRepository: IJobRepository,
    @inject(DI_TOKENS.MessagePublisher)
    private messagePublisher: IMessagePublisher,
  ) {}

  async execute(input: RetryJobInput): Promise<void> {
    const job = await this.jobRepository.getJobByMediaId(input.mediaId);

    if (!job) {
      throw new JobNotFoundError(`Job for media ${input.mediaId} not found.`);
    }

    if (job.status !== 'failed') {
      logger.info(
        `Job for media ${input.mediaId} is not in a failed state. Current status: ${job.status}`,
      );
      return;
    }

    logger.info(`Retrying failed job for ${input.mediaId}.`);

    job.status = 'pending';
    job.tasks.forEach((task: MediaTask) => {
      if (task.status === 'failed') {
        task.status = 'pending';
        task.errorMessage = undefined;
        task.progress = 0;
      }
    });

    const savedJob = await this.jobRepository.save(job);

    const firstPendingTask = savedJob.tasks.find(
      (task) => task.status === 'pending',
    );

    if (firstPendingTask) {
      await this.messagePublisher.publish(
        MessageQueueChannels[firstPendingTask.worker],
        {
          jobId: savedJob._id,
          taskId: firstPendingTask.taskId,
          sourceUrl: savedJob.sourceUrl,
        } as WorkerMessages[typeof firstPendingTask.worker],
      );
    } else {
      logger.warn(`No pending tasks found for job ${savedJob._id}`);
    }
  }
}
