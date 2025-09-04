import { inject, injectable } from 'tsyringe';

import type {
  IJobRepository,
  WorkerMessages,
  WorkerTypes,
} from '@monorepo/core';

import { logger } from '@job-service/adapters/logger.adapter';
import { DI_TOKENS } from '@job-service/config';
import { MediaJob, MediaTask, MessageQueueChannels } from '@monorepo/core';
import { IMessagePublisher } from '@monorepo/message-queue';

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
    let job = await this.jobRepository.getJobByMediaId(input.mediaId);

    if (job && job.status === 'completed') {
      logger.info(`Job for media ${input.mediaId} already completed.`);
      return job;
    }

    if (job && job.status === 'failed') {
      logger.info(`Retrying failed job for ${input.mediaId}.`);

      job.status = 'pending';

      job.tasks.forEach((task: MediaTask) => {
        if (task.status === 'failed') {
          task.status = 'pending';
          task.errorMessage = undefined;
          task.progress = 0;
        }
      });
    }

    if (!job) {
      const initialTasks = input.workers.map(
        (task, index) =>
          new MediaTask(`${task.type.toLowerCase()}-${index}`, task.type),
      );
      job = new MediaJob(
        input.mediaId,
        input.sourceUrl,
        'pending',
        initialTasks,
      );
    }

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
        } as WorkerMessages[typeof firstPendingTask.worker],
      );
    } else {
      logger.warn(`No pending tasks found for job ${savedJob._id}`);
    }

    return savedJob;
  }
}
