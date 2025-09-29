import { inject, injectable } from 'tsyringe';

import { JobNotFoundError } from '@job-service/entities/errors.entity';
import { DI_TOKENS, ITaskRepository } from '@monorepo/core';

@injectable()
export class GetJobByIdUseCase {
  constructor(
    @inject(DI_TOKENS.TaskRepository)
    private jobRepository: ITaskRepository,
  ) {}

  async execute(jobId: string) {
    const job = await this.jobRepository.findJobById(jobId);
    if (!job) {
      throw new JobNotFoundError(`Job with id ${jobId} not found`);
    }
    return job;
  }
}
