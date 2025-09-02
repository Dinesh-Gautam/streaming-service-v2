import { RedisCacheRepository } from "./redis-cache.repository";
import { getRedisClient } from "./redis-client";

jest.mock("./redis-client");

const mockRedisClient = {
  set: jest.fn(),
  get: jest.fn(),
  del: jest.fn(),
  exists: jest.fn(),
  flushDb: jest.fn(),
  quit: jest.fn(),
};

(getRedisClient as jest.Mock).mockResolvedValue(mockRedisClient);

describe("RedisCacheRepository", () => {
  let cacheRepository: RedisCacheRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    cacheRepository = new RedisCacheRepository();
  });

  it("should set and get a value", async () => {
    mockRedisClient.get.mockResolvedValue("value");
    await cacheRepository.set("key", "value");
    const value = await cacheRepository.get("key");
    expect(mockRedisClient.set).toHaveBeenCalledWith("key", "value");
    expect(value).toBe("value");
  });

  it("should delete a value", async () => {
    await cacheRepository.delete("key");
    expect(mockRedisClient.del).toHaveBeenCalledWith("key");
  });

  it("should check if a key exists", async () => {
    mockRedisClient.exists.mockResolvedValue(1);
    const exists = await cacheRepository.has("key");
    expect(mockRedisClient.exists).toHaveBeenCalledWith("key");
    expect(exists).toBe(true);
  });

  it("should set a value with a TTL", async () => {
    await cacheRepository.set("key", "value", 3600);
    expect(mockRedisClient.set).toHaveBeenCalledWith("key", "value", {
      EX: 3600,
    });
  });
});
