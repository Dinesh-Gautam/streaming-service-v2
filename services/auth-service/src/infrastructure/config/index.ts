import * as dotenv from 'dotenv';

import { configSchema } from '@auth-service/infrastructure/config/schema';
import { logger } from '@auth-service/infrastructure/logger';

dotenv.config();

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
