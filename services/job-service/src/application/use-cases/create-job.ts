import { inject, injectable } from 'tsyringe';

import { MediaJob, MediaTask } from '@monorepo/core';
import { IMessagePublisher } from '@monorepo/message-queue';

import { IJobRepository } from '../../domain/repositories/job-repository';

export interface CreateJobInput {
  mediaId: string;
  sourceUrl: string;
}

@injectable()
export class CreateJobUseCase {
  constructor(
    @inject('JobRepository') private jobRepository: IJobRepository,
    @inject('MessagePublisher') private messagePublisher: IMessagePublisher,
  ) {}

  async execute(input: CreateJobInput): Promise<MediaJob> {
    const initialTask = new MediaTask(
      'thumbnail-generation',
      'ThumbnailEngine',
    );
    const job = new MediaJob(input.mediaId, 'pending', [initialTask]);

    const createdJob = await this.jobRepository.createJob(job);

    await this.messagePublisher.publish('thumbnail:start', {
      jobId: createdJob._id,
      sourceUrl: input.sourceUrl,
    });

    return createdJob;
  }
}
