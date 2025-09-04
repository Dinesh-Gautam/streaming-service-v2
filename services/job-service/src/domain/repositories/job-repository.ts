import { BaseJob, TaskStatus } from '@monorepo/core';

export interface IJobRepository {
  save(job: BaseJob): Promise<BaseJob>;
  getJobById(id: string): Promise<BaseJob | null>;
  getJobByMediaId(mediaId: string): Promise<BaseJob | null>;
  updateTaskStatus(
    jobId: string,
    taskId: string,
    status: TaskStatus,
    progress?: number,
    errorMessage?: string,
  ): Promise<void>;
  // Add other necessary methods here
}
