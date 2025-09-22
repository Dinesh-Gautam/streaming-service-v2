import { container } from 'tsyringe';

import type { IMessagePublisher } from '@monorepo/message-queue';

import { AIMediaProcessor } from '@ai-worker/adapters/ai.media-processor';
import { FsSourceResolver } from '@ai-worker/adapters/fs.source-resolver';
import { DI_TOKENS, MongoTaskRepository } from '@monorepo/core';
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

  container.register(DI_TOKENS.SourceResolver, {
    useClass: FsSourceResolver,
  });
  container.register(DI_TOKENS.MediaProcessor, {
    useFactory: (c) => c.resolve(AIMediaProcessor),
  });
}
