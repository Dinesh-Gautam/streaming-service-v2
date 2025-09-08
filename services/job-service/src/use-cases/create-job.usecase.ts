import { inject, injectable } from 'tsyringe';

import type { IJobRepository } from '@monorepo/core';
import type { WorkerMessages, WorkerTypes } from '@monorepo/message-queue';

import { logger } from '@job-service/adapters/logger.adapter';
import { DI_TOKENS, MediaJob, MediaTask } from '@monorepo/core';
import {
  IMessagePublisher,
  MessageQueueChannels,
} from '@monorepo/message-queue';

export interface CreateJobInput {
  mediaId: string;
  sourceUrl: string;
  workers: { name: string; type: WorkerTypes }[];
}

@injectable()
export class CreateJobUseCase {
  constructor(
    @inject(DI_TOKENS.JobRepository) private jobRepository: IJobRepository,
    @inject(DI_TOKENS.MessagePublisher)
    private messagePublisher: IMessagePublisher,
  ) {}

  async execute(input: CreateJobInput): Promise<MediaJob> {
    const existingJob = await this.jobRepository.getJobByMediaId(input.mediaId);
    existingJob?._id;

    if (existingJob) {
      logger.info(
        `Job for media ${input.mediaId} already exists with status ${existingJob.status}.`,
      );
      return existingJob;
    }

    const initialTasks = input.workers.map(
      (task, index) =>
        new MediaTask(`${task.type.toLowerCase()}-${index}`, task.type),
    );
    const job = new MediaJob(
      input.mediaId,
      input.sourceUrl,
      'pending',
      initialTasks,
    );

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
          sourceUrl: input.sourceUrl,
        },
      );
    } else {
      logger.warn(`No pending tasks found for job ${savedJob._id}`);
    }

    return savedJob;
  }
}
