import { config } from ".";

describe("Config Module", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it("should load and validate environment variables", () => {
    process.env.NODE_ENV = "test";
    process.env.PORT = "3001";
    process.env.DATABASE_URL =
      "postgresql://user:password@localhost:5432/mydatabase?schema=public";
    process.env.JWT_SECRET = "secret";
    process.env.JWT_REFRESH_SECRET = "refresh-secret";
    process.env.CORS_ORIGIN = "http://localhost:3000";
    process.env.ACCESS_TOKEN_EXPIRATION = "15m";
    process.env.REFRESH_TOKEN_EXPIRATION = "7d";

    const { config } = require(".");

    expect(config.NODE_ENV).toBe("test");
    expect(config.PORT).toBe(3001);
  });

  it("should throw an error if validation fails", () => {
    process.env.NODE_ENV = "invalid";
    expect(() => require(".")).toThrow("Invalid environment variables");
  });
});
