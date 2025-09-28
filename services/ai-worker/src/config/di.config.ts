import { container } from 'tsyringe';

import type { IMessagePublisher } from '@monorepo/message-queue';

import { AIMediaProcessor } from '@ai-worker/adapters/ai.media-processor';
import {
  AudioService,
  AudioServiceToken,
} from '@ai-worker/services/audio.service';
import { TtsService, TtsServiceToken } from '@ai-worker/services/tts.service';
import { DI_TOKENS, LocalStorage, MongoTaskRepository } from '@monorepo/core';
import { MongoDbConnection } from '@monorepo/database';
import { IMessageConsumer, RabbitMQAdapter } from '@monorepo/message-queue';

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

  container.registerSingleton(TtsServiceToken, TtsService);
  container.registerSingleton(AudioServiceToken, AudioService);

  container.register(DI_TOKENS.MediaProcessor, {
    useClass: AIMediaProcessor,
  });

  container.register(DI_TOKENS.Storage, {
    useClass: LocalStorage,
  });
}
