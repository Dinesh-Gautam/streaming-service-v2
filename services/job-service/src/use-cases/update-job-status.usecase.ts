import { inject, injectable } from 'tsyringe';

import type { IJobRepository, JobStatus } from '@monorepo/core';

import { DI_TOKENS } from '@job-service/config';
import { JobNotFoundError } from '@job-service/entities/errors.entity';

type UpdateStatusInput = {
  jobId: string;
  status: JobStatus;
};

@injectable()
export class UpdateJobStatusUseCase {
  constructor(
    @inject(DI_TOKENS.JobRepository) private jobRepository: IJobRepository,
  ) {}

  async execute(input: UpdateStatusInput): Promise<void> {
    const job = await this.jobRepository.getJobById(input.jobId);

    if (!job) {
      throw new JobNotFoundError(`Job with ID ${input.jobId} not found`);
    }

    job.status = input.status;

    await this.jobRepository.save(job);
  }
}
