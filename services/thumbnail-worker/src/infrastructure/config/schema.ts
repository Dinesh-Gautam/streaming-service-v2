import { z } from 'zod';

export const configSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  RABBITMQ_URL: z.string().url(),
  MONGO_URL: z.string().url(),
  MONGO_DB_NAME: z.string().min(1),
  THUMBNAIL_QUEUE: z.string().min(1),
});

export type Config = z.infer<typeof configSchema>;
