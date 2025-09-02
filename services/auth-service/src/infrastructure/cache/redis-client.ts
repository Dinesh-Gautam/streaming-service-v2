import { createClient, RedisClientType } from 'redis';

import { config } from '@auth-service/infrastructure/config';
import { logger } from '@auth-service/infrastructure/logger';

let redisClient: RedisClientType | null = null;

const initializeRedis = async (): Promise<RedisClientType> => {
  if (redisClient) {
    return redisClient;
  }

  const client = createClient({
    url: config.REDIS_URL,
  });

  client.on('error', (err) => {
    logger.error(`Redis Client Error: ${err}`);
  });

  await client.connect();
  redisClient = client as RedisClientType;
  return redisClient;
};

export const getRedisClient = async (): Promise<RedisClientType> => {
  if (!redisClient) {
    return await initializeRedis();
  }
  return redisClient;
};
