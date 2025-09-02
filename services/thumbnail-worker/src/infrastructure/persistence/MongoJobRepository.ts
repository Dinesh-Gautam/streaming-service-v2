import { injectable } from 'tsyringe';

import { Job } from '@thumbnail-worker/domain/entities/Job';
import { IJobRepository } from '@thumbnail-worker/domain/repositories/IJobRepository';

@injectable()
export class MongoJobRepository implements IJobRepository {
  private jobs: Job[] = [];

  async findById(id: string): Promise<Job | null> {
    const job = this.jobs.find((j) => j.id === id);
    return Promise.resolve(job || null);
  }

  async update(job: Job): Promise<void> {
    const index = this.jobs.findIndex((j) => j.id === job.id);
    if (index !== -1) {
      this.jobs[index] = job;
    } else {
      this.jobs.push(job); // For mock purposes, add if not found
    }
    return Promise.resolve();
  }
}
