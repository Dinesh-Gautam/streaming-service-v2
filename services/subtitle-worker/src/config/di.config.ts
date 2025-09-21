import { container } from 'tsyringe';

import type { IMessagePublisher } from '@monorepo/message-queue';

import { DI_TOKENS, MongoTaskRepository } from '@monorepo/core';
import { MongoDbConnection } from '@monorepo/database';
import { IMessageConsumer, RabbitMQAdapter } from '@monorepo/message-queue';
import { FFmpegAudioExtractor } from '@subtitle-worker/adapters/ffmpeg.audio-extractor';
import { FsSourceResolver } from '@subtitle-worker/adapters/fs.source-resolver';
import { FsStorage } from '@subtitle-worker/adapters/fs.storage';
import { GoogleTranslationService } from '@subtitle-worker/adapters/google.translation.service';
import { MockTranslaionService } from '@subtitle-worker/adapters/translation.service.mock';

import { MockTranscriptionService } from '../adapters/transcription.service.mock';

export function setupDI(): void {
  container.registerSingleton(DI_TOKENS.DatabaseConnection, MongoDbConnection);
  container.registerSingleton(RabbitMQAdapter);

  container.register<IMessageConsumer>(DI_TOKENS.MessageConsumer, {
    useToken: RabbitMQAdapter,
  });

  container.register<IMessagePublisher>(DI_TOKENS.MessagePublisher, {
    useToken: RabbitMQAdapter,
  });

  // Worker-specific services
  container.register(DI_TOKENS.TaskRepository, MongoTaskRepository);

  container.register(DI_TOKENS.AudioExtractor, {
    useClass: FFmpegAudioExtractor,
  });

  container.register(DI_TOKENS.TranscriptionService, {
    useClass: MockTranscriptionService,
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
