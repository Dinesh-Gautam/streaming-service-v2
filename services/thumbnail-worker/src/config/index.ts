import * as dotenv from 'dotenv';
import z from 'zod';

import { logger } from '@thumbnail-worker/config/logger';

dotenv.config();

export const configSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  RABBITMQ_URL: z.url(),
  MONGO_URL: z.url(),
});

export type Config = z.infer<typeof configSchema>;

const result = configSchema.safeParse(process.env);

if (!result.success) {
  logger.fatal(
    `Invalid environment variables: ${JSON.stringify(
      z.treeifyError(result.error),
      null,
      2,
    )}`,
  );
  throw new Error('Invalid environment variables');
}

export const config: Config = Object.freeze(result.data);
