import { container } from 'tsyringe';

import type { Db } from 'mongodb';

import { MongoJobRepository } from '@job-service/adapters/mongo-job.adapter';
// Mock implementations for testing
import { MockMongoJobAdapter } from '@job-service/adapters/mongo-job.adapter.mock';
import { config, DI_TOKENS } from '@job-service/config';
import { IJobRepository } from '@monorepo/core';
import { IDatabaseConnection, MongoDbConnection } from '@monorepo/database';
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
      class MockDb {
        getDb() {
          return null as any;
        }
        connect() {
          return Promise.resolve();
        }
        close() {
          return Promise.resolve();
        }
      },
    );
  } else {
    container.registerSingleton<IDatabaseConnection>(
      DI_TOKENS.DatabaseConnection,
      MongoDbConnection,
    );
    container.registerSingleton<IJobRepository>(
      DI_TOKENS.JobRepository,
      MongoJobRepository,
    );
    container.registerSingleton<IMessagePublisher>(
      DI_TOKENS.MessagePublisher,
      RabbitMQAdapter,
    );
    container.registerSingleton<IMessageConsumer>(
      DI_TOKENS.MessageConsumer,
      RabbitMQAdapter,
    );
  }
};
