import { inject, injectable } from 'tsyringe';

import type { IJobRepository } from '@job-service/domain/repositories/job-repository';

import { DI_TOKENS } from '@job-service/infrastructure/config';
import { logger } from '@job-service/infrastructure/logger';
import { BaseJob as MediaJob, Task as MediaTask } from '@monorepo/core';
import { IMessagePublisher } from '@monorepo/message-queue';

type WorkerTypes = 'thumbnail-worker' | 'transcode-worker';

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
        (engine, index) =>
          new MediaTask(
            `${engine.name.toLowerCase().replace('engine', '')}-${index}`,
            engine.name,
          ),
      );
      job = new MediaJob(
        input.mediaId,
        input.sourceUrl,
        'pending',
        initialTasks,
      );
    }

    const savedJob = await this.jobRepository.save(job);

    for (const task of savedJob.tasks) {
      if (task.status === 'pending') {
        await this.messagePublisher.publish('thumbnail-jobs', {
          jobId: savedJob._id,
          taskId: task.taskId,
          sourceUrl: input.sourceUrl,
        });
      }
    }
    return savedJob;
  }
}
