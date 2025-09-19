import 'reflect-metadata';

import dotenv from 'dotenv';
import z from 'zod';

dotenv.config();

export const configSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  PORT: z.coerce.number().int().positive(),
  RABBITMQ_URL: z.url(),
  SUBTITLE_QUEUE: z.string(),
  MONGO_URL: z.url(),
  OUTPUT_DIR: z.string().default('/tmp/output'),
  DEEPGRAM_API_KEY: z.string(),
  GOOGLE_APPLICATION_CREDENTIALS: z.string(),
});

export type Config = z.infer<typeof configSchema>;

const result = configSchema.safeParse(process.env);

if (!result.success) {
  console.error(
    `Invalid environment variables: ${JSON.stringify(
      z.treeifyError(result.error),
      null,
      2,
    )}`,
  );
  throw new Error('Invalid environment variables');
}

const config: Config = Object.freeze(result.data);

export default config;
