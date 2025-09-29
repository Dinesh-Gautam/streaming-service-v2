import { container } from 'tsyringe';

import type { ITaskRepository } from '@monorepo/core';

import { MongoJobRepository } from '@job-service/adapters/mongo-job.adapter';
import { MockMongoJobAdapter } from '@job-service/adapters/mongo-job.adapter.mock';
import { config } from '@job-service/config';
import { DI_TOKENS, IJobRepository } from '@monorepo/core';
import { MongoTaskRepository } from '@monorepo/core/server-index';
import {
  IDatabaseConnection,
  MockDatabaseConnection,
  MongoDbConnection,
} from '@monorepo/database';
import {
  IMessageConsumer,
  IMessagePublisher,
  MockMessageQueue,
  RabbitMQAdapter,
} from '@monorepo/message-queue';

export const setupDI = () => {
  if (config.NODE_ENV === 'test') {
    container.registerSingleton<IJobRepository>(
      DI_TOKENS.JobRepository,
      MockMongoJobAdapter,
    );
    container.registerSingleton<IMessagePublisher>(
      DI_TOKENS.MessagePublisher,
      MockMessageQueue,
    );
    container.registerSingleton<IMessageConsumer>(
      DI_TOKENS.MessageConsumer,
      MockMessageQueue,
    );
    container.registerSingleton<IDatabaseConnection>(
      DI_TOKENS.DatabaseConnection,
      MockDatabaseConnection,
    );

    return;
  }
  container.registerSingleton<IDatabaseConnection>(
    DI_TOKENS.DatabaseConnection,
    MongoDbConnection,
  );
  container.registerSingleton<IJobRepository>(
    DI_TOKENS.JobRepository,
    MongoJobRepository,
  );
  container.registerSingleton<ITaskRepository>(
    DI_TOKENS.TaskRepository,
    MongoTaskRepository,
  );
  container.registerSingleton(RabbitMQAdapter);
  container.register(DI_TOKENS.MessagePublisher, {
    useToken: RabbitMQAdapter,
  });
  container.register(DI_TOKENS.MessageConsumer, {
    useToken: RabbitMQAdapter,
  });
};
