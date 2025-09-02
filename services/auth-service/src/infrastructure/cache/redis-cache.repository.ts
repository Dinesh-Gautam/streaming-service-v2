import type { ICacheRepository } from '@auth-service/application/interfaces/cache-repository.interface';

import { getRedisClient } from '@auth-service/infrastructure/cache/redis-client';

export class RedisCacheRepository implements ICacheRepository {
  public async set(key: string, value: string, ttl?: number): Promise<void> {
    const client = await getRedisClient();
    if (ttl) {
      await client.set(key, value, { EX: ttl });
    } else {
      await client.set(key, value);
    }
  }

  public async get(key: string): Promise<string | null> {
    const client = await getRedisClient();
    return client.get(key);
  }

  public async delete(key: string): Promise<void> {
    const client = await getRedisClient();
    await client.del(key);
  }

  public async has(key: string): Promise<boolean> {
    const client = await getRedisClient();
    const result = await client.exists(key);
    return result === 1;
  }
}
