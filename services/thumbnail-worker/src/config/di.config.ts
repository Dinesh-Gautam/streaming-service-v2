import { container } from 'tsyringe';

import { DI_TOKENS } from '@monorepo/core';
import { MongoDbConnection } from '@monorepo/database';
import { WinstonLogger } from '@monorepo/logger';
import { RabbitMQAdapter } from '@monorepo/message-queue';
import { FfmpegProcessor } from '@thumbnail-worker/adapters/ffmpeg-adapter';
import { MongoTaskRepository } from '@thumbnail-worker/adapters/mongo-task.adapter';

export function setupDI() {
  container.register(DI_TOKENS.DatabaseConnection, {
    useClass: MongoDbConnection,
  });
  container.register(DI_TOKENS.MessageConsumer, { useClass: RabbitMQAdapter });
  container.register(DI_TOKENS.TaskRepository, {
    useClass: MongoTaskRepository,
  });
  container.register(DI_TOKENS.MediaProcessor, { useClass: FfmpegProcessor });
  container.register(DI_TOKENS.Logger, { useClass: WinstonLogger });
}
