import { container } from 'tsyringe';

import type { IMessagePublisher } from '@monorepo/message-queue';

import { DI_TOKENS } from '@monorepo/core';
import { MongoDbConnection } from '@monorepo/database';
import { ILogger, WinstonLogger } from '@monorepo/logger';
import { IMessageConsumer, RabbitMQAdapter } from '@monorepo/message-queue';
import { FFmpegAudioExtractor } from '@subtitle-worker/adapters/ffmpeg.audio-extractor';
import { FsSourceResolver } from '@subtitle-worker/adapters/fs.source-resolver';
import { FsStorage } from '@subtitle-worker/adapters/fs.storage';
import { GoogleTranslationService } from '@subtitle-worker/adapters/google.translation.service';
import { MongoTaskRepository } from '@subtitle-worker/adapters/mongo.task-repository';

import { DeepgramTranscriptionService } from '../adapters/deepgram.transcription.service';

export function setupDI(): void {
  // Shared services
  container.register(DI_TOKENS.Logger, {
    useClass: WinstonLogger,
  });
  container.register(DI_TOKENS.DatabaseConnection, {
    useClass: MongoDbConnection,
  });
  container.registerSingleton(RabbitMQAdapter);

  container.register<IMessageConsumer>(
    DI_TOKENS.MessageConsumer,
    RabbitMQAdapter,
  );

  container.register<IMessagePublisher>(
    DI_TOKENS.MessagePublisher,
    RabbitMQAdapter,
  );

  // Worker-specific services
  container.register(DI_TOKENS.TaskRepository, MongoTaskRepository);

  container.register(DI_TOKENS.AudioExtractor, {
    useClass: FFmpegAudioExtractor,
  });

  container.register(DI_TOKENS.TranscriptionService, {
    useClass: DeepgramTranscriptionService,
  });
  container.register(DI_TOKENS.TranslationService, {
    useClass: GoogleTranslationService,
  });
  container.register(DI_TOKENS.SourceResolver, {
    useClass: FsSourceResolver,
  });
  container.register(DI_TOKENS.Storage, {
    useClass: FsStorage,
  });
}
