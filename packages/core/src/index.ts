export type TaskStatus = 'pending' | 'running' | 'completed' | 'failed';

export type WorkerTypes = 'thumbnail-worker' | 'transcode-worker';

export const MessageQueueChannels = {
  'thumbnail-worker': 'thumbnail_tasks',
  'transcode-worker': 'transcode_tasks',
  TaskCompleted: 'task_completed',
  TaskFailed: 'task_failed',
};

export type WorkerMessages = {
  'thumbnail-worker': {
    jobId: string;
    taskId: string;
    sourceUrl: string;
  };
  'transcode-worker': {
    jobId: string;
    taskId: string;
    sourceUrl: string;
  };
};

export class MediaTask {
  constructor(
    public taskId: string,
    public worker: WorkerTypes,
    public status: TaskStatus = 'pending',
    public progress: number = 0,
    public errorMessage?: string,
    public startTime?: Date,
    public endTime?: Date,
    public output?: any,
  ) {}
}

export type JobStatus = 'pending' | 'processing' | 'completed' | 'failed';

export class MediaJob {
  public _id?: any;

  constructor(
    public mediaId: string,
    public sourceUrl: string,
    public status: JobStatus = 'pending',
    public tasks: MediaTask[] = [],
    public outputUrl?: string,
    public createdAt: Date = new Date(),
    public updatedAt: Date = new Date(),
    public error?: string,
  ) {}
}

export interface ITaskRepository {
  updateTaskStatus(
    jobId: string,
    taskId: string,
    status: TaskStatus,
    progress?: number,
    errorMessage?: string,
  ): Promise<void>;
}

export interface IJobRepository {
  save(job: MediaJob): Promise<MediaJob>;
  getJobById(id: string): Promise<MediaJob | null>;
  getJobByMediaId(mediaId: string): Promise<MediaJob | null>;
}
