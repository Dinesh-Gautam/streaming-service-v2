import { inject, injectable } from 'tsyringe';

import type { IJobRepository } from '@job-service/domain/repositories/job-repository';

import { BaseJob as MediaJob, Task as MediaTask } from '@monorepo/core';
import { IMessagePublisher } from '@monorepo/message-queue';

export interface CreateJobInput {
  mediaId: string;
  sourceUrl: string;
  engines: { name: string; type: 'thumbnail' /* other types can be added */ }[];
}

@injectable()
export class CreateJobUseCase {
  constructor(
    @inject('JobRepository') private jobRepository: IJobRepository,
    @inject('MessagePublisher') private messagePublisher: IMessagePublisher,
  ) {}

  async execute(input: CreateJobInput): Promise<MediaJob> {
    let job = await this.jobRepository.getJobByMediaId(input.mediaId);

    if (job) {
      if (job.status === 'completed') {
        console.log(
          `[JobService] Job for media ${input.mediaId} already completed.`,
        );
        return job;
      }

      if (job.status === 'failed') {
        console.log(`[JobService] Retrying failed job for ${input.mediaId}.`);
        job.status = 'pending';
        job.tasks.forEach((task: MediaTask) => {
          if (task.status === 'failed') {
            task.status = 'pending';
            task.errorMessage = undefined;
            task.progress = 0;
          }
        });
      }
    } else {
      const initialTasks = input.engines.map(
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

    // For now, we only handle the thumbnail engine.
    // This will be expanded to handle a sequence of tasks.
    const thumbnailTask = savedJob.tasks.find((t: MediaTask) =>
      t.engine.includes('Thumbnail'),
    );

    if (thumbnailTask && thumbnailTask.status === 'pending') {
      await this.messagePublisher.publish('thumbnail-jobs', {
        jobId: savedJob._id,
        taskId: thumbnailTask.taskId,
        sourceUrl: input.sourceUrl,
      });
    }

    return savedJob;
  }
}
