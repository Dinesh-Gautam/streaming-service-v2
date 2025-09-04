import { BaseJob as Job, TaskStatus } from '@monorepo/core';

import { ThumbnailOutput } from '../../application/ports/IMediaProcessor';

export interface IJobRepository {
  findById(id: string): Promise<Job | null>;
  updateTaskStatus(
    jobId: string,
    taskId: string,
    status: TaskStatus,
    progress?: number,
  ): Promise<void>;
  updateTaskOutput(
    jobId: string,
    taskId: string,
    output: ThumbnailOutput,
  ): Promise<void>;
  failTask(jobId: string, taskId: string, errorMessage: string): Promise<void>;
}
