import type { IDatabaseConnection } from '@monorepo/database';
import type { ILogger } from '@monorepo/logger';
import type {
  IMessageConsumer,
  IMessagePublisher,
} from '@monorepo/message-queue';
import type { WorkerTypes } from '@monorepo/workers';
import type { InjectionToken } from 'tsyringe';

import { IAudioExtractor } from './audio-extractor.interface';
import { IMediaProcessor } from './media.interface';
import { IStorage } from './storage.interface';
import { ITranscriptionService } from './transcription.interface';
import { ITranslationService } from './translation.interface';

export * from './audio-extractor.interface';
export * from './media.interface';
export * from './transcription.interface';
export * from './translation.interface';
export * from './storage.interface';

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

export interface IJobRepository {
  save(job: MediaJob): Promise<MediaJob>;
  getJobById(id: string): Promise<MediaJob | null>;
  getJobByMediaId(mediaId: string): Promise<MediaJob | null>;
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
  MediaProcessor: Symbol('MediaProcessor') as InjectionToken<
    IMediaProcessor<any>
  >,
  SourceResolver: Symbol('SourceResolver') as InjectionToken<ISourceResolver>,
  TranscriptionService: Symbol(
    'TranscriptionService',
  ) as InjectionToken<ITranscriptionService>,
  TranslationService: Symbol(
    'TranslationService',
  ) as InjectionToken<ITranslationService>,
  AudioExtractor: Symbol('AudioExtractor') as InjectionToken<IAudioExtractor>,
  Storage: Symbol('Storage') as InjectionToken<IStorage>,
};
