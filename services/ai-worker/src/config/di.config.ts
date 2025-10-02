import { container } from 'tsyringe';

import type { IMessagePublisher } from '@monorepo/message-queue';

import { AIMediaProcessor } from '@ai-worker/adapters/ai.media-processor';
import { MockAIMediaProcessor } from '@ai-worker/adapters/mock-ai.media-processor';
import {
  AudioService,
  AudioServiceToken,
} from '@ai-worker/services/audio.service';
import {
  GeminiTtsService,
  GeminiTtsServiceToken,
} from '@ai-worker/services/gemini-tts.service';
import { TtsService, TtsServiceToken } from '@ai-worker/services/tts.service';
import { DI_TOKENS, LocalStorage } from '@monorepo/core';
import { MongoTaskRepository } from '@monorepo/core/server-index';
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
  container.registerSingleton(GeminiTtsServiceToken, GeminiTtsService);
  container.registerSingleton(AudioServiceToken, AudioService);

  // container.register(DI_TOKENS.MediaProcessor, {
  //   useClass: AIMediaProcessor,
  // });
  container.register(DI_TOKENS.MediaProcessor, {
    useClass: MockAIMediaProcessor,
  });

  container.register(DI_TOKENS.Storage, {
    useClass: LocalStorage,
  });
}
