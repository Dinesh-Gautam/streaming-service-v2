import "reflect-metadata";
import request from "supertest";
import express, { Express } from "express";
import { AuthController } from "./auth.controller";
import { IUserRepository } from "../../application/interfaces/user-repository.interface";
import { IPasswordHasher } from "../../application/interfaces/password-hasher.interface";
import { ITokenGenerator } from "../../application/interfaces/token-generator.interface";
import { ITokenValidator } from "../../application/interfaces/token-validator.interface";
import { ICacheRepository } from "../../application/interfaces/cache-repository.interface";
import { User } from "../../domain/user.entity";
import { container } from "tsyringe";
import cookieParser from "cookie-parser";

const app: Express = express();
app.use(express.json());
app.use(cookieParser());

const mockUserRepository: IUserRepository = {
  findByEmail: jest.fn(),
  save: jest.fn(),
  findCredentialByUserId: jest.fn(),
  findById: jest.fn(),
};

const mockPasswordHasher: IPasswordHasher = {
  hash: jest.fn(),
  compare: jest.fn(),
};

const mockTokenGenerator: ITokenGenerator = {
  generate: jest.fn(),
};

const mockTokenValidator: ITokenValidator = {
  validate: jest.fn(),
  validateRefreshToken: jest.fn(),
};

const mockCacheRepository: ICacheRepository = {
  get: jest.fn(),
  set: jest.fn(),
  has: jest.fn(),
  delete: jest.fn(),
};

const authController = new AuthController(
  mockUserRepository,
  mockPasswordHasher,
  mockTokenGenerator,
  mockTokenValidator,
  mockCacheRepository
);

app.post("/refresh", (req, res) => authController.refreshToken(req, res));

describe("AuthController - Refresh Token (Integration)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return a new access token and set a new refresh token cookie", async () => {
    const user = new User("1", "Test User", "test@example.com", "USER");
    const tokens = {
      accessToken: "new-access-token",
      refreshToken: "new-refresh-token",
    };

    (mockTokenValidator.validateRefreshToken as jest.Mock).mockResolvedValue({
      userId: "1",
      jti: "123",
      exp: Math.floor(Date.now() / 1000) + 3600,
    });
    (mockCacheRepository.get as jest.Mock).mockResolvedValue("valid");
    (mockUserRepository.findById as jest.Mock).mockResolvedValue(user);
    (mockTokenGenerator.generate as jest.Mock).mockReturnValue(tokens);
    (
      mockTokenValidator.validateRefreshToken as jest.Mock
    ).mockResolvedValueOnce({
      userId: "1",
      jti: "123",
      exp: Math.floor(Date.now() / 1000) + 3600,
    });

    const response = await request(app)
      .post("/refresh")
      .set("Cookie", "refreshToken=old-refresh-token");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ accessToken: tokens.accessToken });
    expect(response.headers["set-cookie"][0]).toContain(
      `refreshToken=${tokens.refreshToken}`
    );
  });

  it("should return 401 if refresh token is not provided", async () => {
    const response = await request(app).post("/refresh");

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ message: "Refresh token not found" });
  });

  it("should return 401 if refresh token is invalid", async () => {
    (mockTokenValidator.validateRefreshToken as jest.Mock).mockRejectedValue(
      new Error("Invalid token")
    );

    const response = await request(app)
      .post("/refresh")
      .set("Cookie", "refreshToken=invalid-refresh-token");

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ message: "Invalid refresh token" });
  });

  it("should return 401 if refresh token is invalidated", async () => {
    (mockTokenValidator.validate as jest.Mock).mockResolvedValue({
      jti: "123",
      email: "test@example.com",
    });
    (mockCacheRepository.get as jest.Mock).mockResolvedValue("invalidated");

    const response = await request(app)
      .post("/refresh")
      .set("Cookie", "refreshToken=invalidated-refresh-token");

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ message: "Invalid refresh token" });
  });
});
