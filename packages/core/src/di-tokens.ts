import type { IDatabaseConnection } from '@monorepo/database';
import type { ILogger } from '@monorepo/logger';
import type {
  IMessageConsumer,
  IMessagePublisher,
} from '@monorepo/message-queue';
import type { InjectionToken } from 'tsyringe';
import type {
  IJobRepository,
  ITaskRepository,
} from './interfaces/repositories';

import { IAudioExtractor } from './interfaces/audio-extractor.interface';
import { IMediaProcessor } from './interfaces/media.interface';
import { ISourceResolver } from './interfaces/source-resolver.interface';
import { IStorage } from './interfaces/storage.interface';

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
  AudioExtractor: Symbol('AudioExtractor') as InjectionToken<IAudioExtractor>,
  Storage: Symbol('Storage') as InjectionToken<IStorage>,
};
