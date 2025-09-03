import { MediaJob, TaskStatus } from '@monorepo/core';

export interface IJobRepository {
  createJob(job: MediaJob): Promise<MediaJob>;
  getJobById(id: string): Promise<MediaJob | null>;
  updateTaskStatus(
    jobId: string,
    taskId: string,
    status: TaskStatus,
    progress?: number,
    errorMessage?: string,
  ): Promise<void>;
  // Add other necessary methods here
}
