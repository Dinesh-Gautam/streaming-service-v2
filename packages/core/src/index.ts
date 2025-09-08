import type { IDatabaseConnection } from '@monorepo/database';
import type { ILogger } from '@monorepo/logger';
import type {
  IMessageConsumer,
  IMessagePublisher,
  ThumbnailOutput,
  WorkerOutput,
  WorkerTypes,
} from '@monorepo/message-queue';
import type { InjectionToken } from 'tsyringe';

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

export const MediaPrcessorEvent = {
  Progress: 'progress',
  Completed: 'completed',
  Error: 'error',
} as const;

export interface IMediaProcessor extends NodeJS.EventEmitter {
  process(
    inputFile: string,
    outputDir: string,
  ): Promise<WorkerOutput<ThumbnailOutput>>;

  on(
    event: (typeof MediaPrcessorEvent)[keyof typeof MediaPrcessorEvent],
    listener: (progress: number) => void,
  ): this;
}

export interface ISourceResolver {
  /**
   * Gives the file path.
   * It should download the file if it's a remote URL.
   * @param url The original source URL.
   * @returns The local file path where the source can be accessed.
   */
  resolveSource(url: string): Promise<string>;
}

export const DI_TOKENS = {
  DatabaseConnection: Symbol(
    'DatabaseConnection',
  ) as InjectionToken<IDatabaseConnection>,
  JobRepository: Symbol('JobRepository') as InjectionToken<IJobRepository>,
  TaskRepository: Symbol('TaskRepository') as InjectionToken<ITaskRepository>,
  MessageConsumer: Symbol(
    'MessageConsumer',
  ) as InjectionToken<IMessageConsumer>,
  MessagePublisher: Symbol(
    'MessagePublisher',
  ) as InjectionToken<IMessagePublisher>,
  Logger: Symbol('Logger') as InjectionToken<ILogger>,
  MediaProcessor: Symbol('MediaProcessor') as InjectionToken<IMediaProcessor>,
  SourceResolver: Symbol('SourceResolver') as InjectionToken<ISourceResolver>,
};

export interface ITaskRepository {
  findJobById(id: string): Promise<MediaJob | null>;
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
