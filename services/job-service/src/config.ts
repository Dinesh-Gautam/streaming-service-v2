import * as dotenv from 'dotenv';
import { z } from 'zod';

import type { IJobRepository } from '@monorepo/core';
import type { IDatabaseConnection } from '@monorepo/database';
import type {
  IMessageConsumer,
  IMessagePublisher,
} from '@monorepo/message-queue';
import type { InjectionToken } from 'tsyringe';

import { logger } from '@job-service/adapters/logger.adapter';

dotenv.config();

export const DI_TOKENS = {
  DatabaseConnection: Symbol(
    'DatabaseConnection',
  ) as InjectionToken<IDatabaseConnection>,
  JobRepository: Symbol('JobRepository') as InjectionToken<IJobRepository>,
  MessageConsumer: Symbol(
    'MessageConsumer',
  ) as InjectionToken<IMessageConsumer>,
  MessagePublisher: Symbol(
    'MessagePublisher',
  ) as InjectionToken<IMessagePublisher>,
};

export const configSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']),
  PORT: z.coerce.number().int().positive(),
  MONGO_URI: z.string().url(),
  CORS_ORIGIN: z.string().min(1),
  RABBITMQ_URL: z.string().url(),
});

const result = configSchema.safeParse(process.env);

if (!result.success) {
  logger.fatal(
    `Invalid environment variables: ${JSON.stringify(
      result.error.flatten(),
      null,
      2,
    )}`,
  );
  throw new Error('Invalid environment variables');
}

export const config = Object.freeze(result.data);
