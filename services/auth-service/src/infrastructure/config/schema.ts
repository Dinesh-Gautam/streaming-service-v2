import { z } from 'zod';

export const configSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']),
  PORT: z.coerce.number().int().positive(),
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(1),
  JWT_REFRESH_SECRET: z.string().min(1),
  CORS_ORIGIN: z.string().min(1),
  ACCESS_TOKEN_EXPIRATION: z.string().min(1),
  REFRESH_TOKEN_EXPIRATION: z.string().min(1),
  REDIS_URL: z.string().url(),
});

export type Config = z.infer<typeof configSchema>;
