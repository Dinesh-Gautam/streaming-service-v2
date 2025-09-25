import * as dotenv from 'dotenv';
import { z } from 'zod';

import { logger } from '@job-service/adapters/logger.adapter';

dotenv.config();

export const configSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']),
  PORT: z.coerce.number().int().positive(),
  MONGO_URL: z.string().url(),
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
