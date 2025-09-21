import { container } from 'tsyringe';

import type { IDatabaseConnection } from '@monorepo/database';
import type { IMessageConsumer } from '@monorepo/message-queue';

import { DI_TOKENS, MongoTaskRepository } from '@monorepo/core';
import { MongoDbConnection } from '@monorepo/database';
import { IMessagePublisher, RabbitMQAdapter } from '@monorepo/message-queue';
import { FfmpegProcessor } from '@thumbnail-worker/adapters/ffmpeg.media-processor';
import { FsSourceResolver } from '@thumbnail-worker/adapters/fs.source-resolver';

export function setupDI() {
  container.registerSingleton<IDatabaseConnection>(
    DI_TOKENS.DatabaseConnection,
    MongoDbConnection,
  );

  container.registerSingleton(RabbitMQAdapter);

  container.register<IMessagePublisher>(DI_TOKENS.MessagePublisher, {
    useToken: RabbitMQAdapter,
  });

  container.register<IMessageConsumer>(DI_TOKENS.MessageConsumer, {
    useToken: RabbitMQAdapter,
  });

  container.register<IMessagePublisher>(DI_TOKENS.MessagePublisher, {
    useToken: RabbitMQAdapter,
  });

  container.register(DI_TOKENS.TaskRepository, MongoTaskRepository);

  container.register(DI_TOKENS.MediaProcessor, {
    useFactory: () => new FfmpegProcessor(),
  });

  container.register(DI_TOKENS.SourceResolver, {
    useClass: FsSourceResolver,
  });
}
