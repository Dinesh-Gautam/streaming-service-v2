import { Job } from '../entities/Job';

export interface IJobRepository {
  findById(id: string): Promise<Job | null>;
  update(job: Job): Promise<void>;
}
