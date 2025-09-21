import type { WorkerOutput, WorkerOutputs } from '@monorepo/workers';
import type { MediaJob, TaskStatus } from '.';

export const MediaPrcessorEvent = {
  Progress: 'progress',
  Completed: 'completed',
  Error: 'error',
} as const;

export interface IMediaProcessor<T extends WorkerOutputs[keyof WorkerOutputs]>
  extends NodeJS.EventEmitter {
  process(inputFile: string, outputDir: string): Promise<WorkerOutput<T>>;

  on(
    event: (typeof MediaPrcessorEvent)[keyof typeof MediaPrcessorEvent],
    listener: (progress: number) => void,
  ): this;
}

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
}
