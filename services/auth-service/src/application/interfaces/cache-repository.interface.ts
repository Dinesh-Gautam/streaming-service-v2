export interface ICacheRepository {
  set(key: string, value: string, ttl?: number): Promise<void>;
  get(key: string): Promise<string | null>;
  delete(key: string): Promise<void>;
  has(key: string): Promise<boolean>;
}
