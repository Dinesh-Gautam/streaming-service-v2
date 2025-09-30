import { inject, injectable } from 'tsyringe';

import { JobNotFoundError } from '@job-service/entities/errors.entity';
import { DI_TOKENS, IJobRepository } from '@monorepo/core';

@injectable()
export class GetJobByMediaIdUseCase {
  constructor(
    @inject(DI_TOKENS.JobRepository)
    private jobRepository: IJobRepository,
  ) {}

  async execute(mediaId: string) {
    const job = await this.jobRepository.getJobByMediaId(mediaId);
    if (!job) {
      throw new JobNotFoundError(`Job with mediaId ${mediaId} not found`);
    }
    return job;
  }
}
