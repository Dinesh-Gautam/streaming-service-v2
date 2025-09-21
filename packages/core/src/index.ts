import type { WorkerTypes } from '@monorepo/workers';

export * from './interfaces/audio-extractor.interface';
export * from './interfaces/media.interface';
export * from './interfaces/storage.interface';
export * from './interfaces/source-resolver.interface';
export * from './adapters/mongo.task-repository';
export * from './di-tokens';

export type TaskStatus = 'pending' | 'running' | 'completed' | 'failed';

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
