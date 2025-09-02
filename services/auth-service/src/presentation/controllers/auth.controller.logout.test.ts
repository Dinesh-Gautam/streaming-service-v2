import "reflect-metadata";
import request from "supertest";
import express, { Express } from "express";
import { AuthController } from "./auth.controller";
import { IUserRepository } from "../../application/interfaces/user-repository.interface";
import { IPasswordHasher } from "../../application/interfaces/password-hasher.interface";
import { ITokenGenerator } from "../../application/interfaces/token-generator.interface";
import { ITokenValidator } from "../../application/interfaces/token-validator.interface";
import { ICacheRepository } from "../../application/interfaces/cache-repository.interface";
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

app.post("/logout", (req, res) => authController.logout(req, res));

describe("AuthController - Logout (Integration)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should clear the refresh token cookie and return 200", async () => {
    (mockTokenValidator.validateRefreshToken as jest.Mock).mockResolvedValue({
      jti: "123",
      exp: Date.now() / 1000 + 3600,
    });

    const response = await request(app)
      .post("/logout")
      .set("Cookie", "refreshToken=some-refresh-token");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ message: "Logged out" });
    expect(response.headers["set-cookie"][0]).toContain("refreshToken=;");
    expect(mockCacheRepository.set).toHaveBeenCalledWith(
      "jti:123",
      "invalidated",
      expect.any(Number)
    );
  });

  it("should return 200 even if refresh token is not provided", async () => {
    const response = await request(app).post("/logout");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ message: "Logged out" });
    expect(mockCacheRepository.set).not.toHaveBeenCalled();
  });

  it("should return 200 even if token validation fails", async () => {
    (mockTokenValidator.validateRefreshToken as jest.Mock).mockRejectedValue(
      new Error("Invalid token")
    );

    const response = await request(app)
      .post("/logout")
      .set("Cookie", "refreshToken=some-refresh-token");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ message: "Logged out" });
  });
});
