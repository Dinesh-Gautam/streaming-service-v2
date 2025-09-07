import { container } from 'tsyringe';

import type { IDatabaseConnection } from '@monorepo/database';
import type { IMessageConsumer } from '@monorepo/message-queue';

import { DI_TOKENS, IMediaProcessor, ITaskRepository } from '@monorepo/core';
import { MongoDbConnection } from '@monorepo/database';
import { WinstonLogger } from '@monorepo/logger';
import { IMessagePublisher, RabbitMQAdapter } from '@monorepo/message-queue';
import { FfmpegProcessor } from '@thumbnail-worker/adapters/ffmpeg-adapter';
import { MongoTaskRepository } from '@thumbnail-worker/adapters/mongo-task.adapter';

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

  container.register<ITaskRepository>(
    DI_TOKENS.TaskRepository,
    MongoTaskRepository,
  );

  container.register<IMediaProcessor>(
    DI_TOKENS.MediaProcessor,
    FfmpegProcessor,
  );
}
