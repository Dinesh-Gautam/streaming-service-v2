import type { JobStatus, MediaJob, TaskStatus } from '..';

export interface ITaskRepository {
  findJobById(id: string): Promise<MediaJob | null>;
  updateTaskStatus(
    jobId: string,
    taskId: string,
    status: TaskStatus,
    progress?: number,
  ): Promise<void>;
  updateTaskOutput(jobId: string, taskId: string, output: any): Promise<void>;
  failTask(jobId: string, taskId: string, errorMessage: string): Promise<void>;
}

export interface IJobRepository {
  save(job: MediaJob): Promise<MediaJob>;
  getJobById(id: string): Promise<MediaJob | null>;
  getJobByMediaId(mediaId: string): Promise<MediaJob | null>;
  updateJobStatus(jobId: string, status: JobStatus): Promise<void>;
}
