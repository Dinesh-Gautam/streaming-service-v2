import { container } from 'tsyringe';

import type { IMessagePublisher } from '@monorepo/message-queue';

import { DI_TOKENS, LocalStorage } from '@monorepo/core';
import { MongoTaskRepository } from '@monorepo/core/server-index';
import { MongoDbConnection } from '@monorepo/database';
import { IMessageConsumer, RabbitMQAdapter } from '@monorepo/message-queue';
import { DeepgramTranscriptionService } from '@subtitle-worker/adapters/deepgram.transcription.service';
import { FFmpegAudioExtractor } from '@subtitle-worker/adapters/ffmpeg.audio-extractor';
import { GoogleTranslationService } from '@subtitle-worker/adapters/google.translation.service';
import { MockTranslaionService } from '@subtitle-worker/adapters/translation.service.mock';
import { TranscriptionServiceToken } from '@subtitle-worker/interfaces/transcription.interface';
import { TranslationServiceToken } from '@subtitle-worker/interfaces/translation.interface';

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

  // container.register(TranscriptionServiceToken, {
  //   useClass: DeepgramTranscriptionService,
  // });
  // container.register(TranslationServiceToken, {
  //   useClass: GoogleTranslationService,
  // });

  container.register(TranscriptionServiceToken, {
    useClass: MockTranscriptionService,
  });
  container.register(TranslationServiceToken, {
    useClass: MockTranslaionService,
  });

  container.register(DI_TOKENS.Storage, {
    useClass: LocalStorage,
  });
}
