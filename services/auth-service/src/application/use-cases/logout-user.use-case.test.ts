import "reflect-metadata";
import { LogoutUserUseCase } from "./logout-user.use-case";
import { ICacheRepository } from "../interfaces/cache-repository.interface";
import { ITokenValidator } from "../interfaces/token-validator.interface";
import { Role } from "@prisma/client";

describe("LogoutUserUseCase", () => {
  let logoutUserUseCase: LogoutUserUseCase;
  let cacheRepository: jest.Mocked<ICacheRepository>;
  let tokenValidator: jest.Mocked<ITokenValidator>;

  beforeEach(() => {
    cacheRepository = {
      get: jest.fn(),
      set: jest.fn(),
      has: jest.fn(),
      delete: jest.fn(),
    };
    tokenValidator = {
      validateRefreshToken: jest.fn(),
      validate: jest.fn(),
    };
    logoutUserUseCase = new LogoutUserUseCase(cacheRepository, tokenValidator);
  });

  it("should invalidate the refresh token", async () => {
    const refreshToken = "valid_refresh_token";
    const decodedToken = {
      userId: "1",
      jti: "123",
      exp: Date.now() / 1000 + 3600,
    };

    tokenValidator.validateRefreshToken.mockResolvedValue(decodedToken);

    await logoutUserUseCase.execute(refreshToken);

    expect(tokenValidator.validateRefreshToken).toHaveBeenCalledWith(
      refreshToken
    );
    expect(cacheRepository.set).toHaveBeenCalledWith(
      `jti:${decodedToken.jti}`,
      "invalidated",
      expect.any(Number)
    );
  });

  it("should handle an invalid refresh token gracefully", async () => {
    const refreshToken = "invalid_refresh_token";
    tokenValidator.validate.mockRejectedValue(new Error());

    await logoutUserUseCase.execute(refreshToken);

    expect(cacheRepository.set).not.toHaveBeenCalled();
  });

  it("should not invalidate an expired token", async () => {
    const refreshToken = "expired_refresh_token";
    const decodedToken = {
      jti: "456",
      exp: Date.now() / 1000 - 3600,
      userId: "1",
      role: Role.USER,
      email: "test@test.com",
      sub: "1",
    };

    tokenValidator.validate.mockResolvedValue(decodedToken);

    await logoutUserUseCase.execute(refreshToken);

    expect(cacheRepository.set).not.toHaveBeenCalled();
  });
});
