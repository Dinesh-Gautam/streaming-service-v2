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
import { UserCredential } from "../../domain/user-credential.entity";
import { LoginUserUseCase } from "../../application/use-cases/login-user.use-case";
import { container } from "tsyringe";

const app: Express = express();
app.use(express.json());

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

container.register<IUserRepository>("IUserRepository", {
  useValue: mockUserRepository,
});
container.register<IPasswordHasher>("IPasswordHasher", {
  useValue: mockPasswordHasher,
});
container.register<ITokenGenerator>("ITokenGenerator", {
  useValue: mockTokenGenerator,
});
container.register<ICacheRepository>("ICacheRepository", {
  useValue: mockCacheRepository,
});
container.register<ITokenValidator>("ITokenValidator", {
  useValue: mockTokenValidator,
});

const authController = container.resolve(AuthController);

app.post("/login", (req, res) => authController.login(req, res));

describe("AuthController - Login (Integration)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return an access token and set a refresh token cookie on successful login", async () => {
    const user = new User("1", "Test User", "test@example.com", "USER");
    const credential = new UserCredential(user.id, "hashedpassword");
    const tokens = {
      accessToken: "new-access-token",
      refreshToken: "new-refresh-token",
    };

    (mockUserRepository.findByEmail as jest.Mock).mockResolvedValue(user);
    (mockUserRepository.findCredentialByUserId as jest.Mock).mockResolvedValue(
      credential
    );
    (mockPasswordHasher.compare as jest.Mock).mockResolvedValue(true);
    (mockTokenGenerator.generate as jest.Mock).mockReturnValue(tokens);
    (mockTokenValidator.validate as jest.Mock).mockResolvedValue({
      userId: "1",
      role: "USER",
      jti: "123",
      exp: Date.now() / 1000 + 3600,
    });
    (mockTokenValidator.validateRefreshToken as jest.Mock).mockResolvedValue({
      jti: "123",
      exp: Date.now() / 1000 + 3600,
    });

    const response = await request(app)
      .post("/login")
      .send({ email: "test@example.com", password: "password" });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ accessToken: tokens.accessToken });
    expect(response.headers["set-cookie"][0]).toContain(
      `refreshToken=${tokens.refreshToken}`
    );
  });

  it("should return 401 for invalid credentials", async () => {
    (mockUserRepository.findByEmail as jest.Mock).mockResolvedValue(null);

    const response = await request(app)
      .post("/login")
      .send({ email: "wrong@example.com", password: "password" });

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ message: "Invalid credentials" });
  });

  it("should return 500 for internal server errors", async () => {
    (mockUserRepository.findByEmail as jest.Mock).mockRejectedValue(
      new Error("Database error")
    );

    const response = await request(app)
      .post("/login")
      .send({ email: "test@example.com", password: "password" });

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ message: "Internal server error" });
  });
});
