import type { ICacheRepository } from '@auth-service/application/interfaces/cache-repository.interface';
import type { ITokenGenerator } from '@auth-service/application/interfaces/token-generator.interface';
import type { ITokenValidator } from '@auth-service/application/interfaces/token-validator.interface';
import type { IUserRepository } from '@auth-service/application/interfaces/user-repository.interface';

import { AppError } from '@auth-service/application/errors/app-error';
import { RefreshTokenUseCase } from '@auth-service/application/use-cases/refresh-token.use-case';
import { User } from '@auth-service/domain/user.entity';
import { Role } from '@prisma/client';

import 'reflect-metadata';

describe('RefreshTokenUseCase', () => {
  let refreshTokenUseCase: RefreshTokenUseCase;
  let userRepository: jest.Mocked<IUserRepository>;
  let tokenGenerator: jest.Mocked<ITokenGenerator>;
  let tokenValidator: jest.Mocked<ITokenValidator>;
  let cacheRepository: jest.Mocked<ICacheRepository>;

  beforeEach(() => {
    userRepository = {
      findByEmail: jest.fn(),
      save: jest.fn(),
      findCredentialByUserId: jest.fn(),
      findById: jest.fn(),
    };
    tokenGenerator = {
      generate: jest.fn(),
    };
    tokenValidator = {
      validateRefreshToken: jest.fn(),
      validate: jest.fn(),
    };
    cacheRepository = {
      get: jest.fn(),
      set: jest.fn(),
      has: jest.fn(),
      delete: jest.fn(),
    };
    refreshTokenUseCase = new RefreshTokenUseCase(
      userRepository,
      tokenGenerator,
      tokenValidator,
      cacheRepository,
    );
  });

  it('should refresh the token successfully', async () => {
    const refreshToken = 'valid_refresh_token';
    const decodedToken = {
      jti: '123',
      exp: Date.now() / 1000 + 3600,
      userId: '1',
      role: Role.USER,
    };
    const user = new User('1', 'John Doe', 'john.doe@example.com', Role.USER);
    const newTokens = {
      accessToken: 'new_access_token',
      refreshToken: 'new_refresh_token',
    };

    tokenValidator.validateRefreshToken.mockResolvedValueOnce(decodedToken);
    cacheRepository.get.mockResolvedValue('valid');
    userRepository.findById.mockResolvedValue(user);
    tokenGenerator.generate.mockReturnValue(newTokens);
    tokenValidator.validateRefreshToken.mockResolvedValueOnce({
      jti: '456',
      exp: Date.now() / 1000 + 3600,
      userId: '1',
    });

    const result = await refreshTokenUseCase.execute(refreshToken);

    expect(result).toEqual(newTokens);
    expect(tokenValidator.validateRefreshToken).toHaveBeenCalledWith(
      refreshToken,
    );
    expect(cacheRepository.get).toHaveBeenCalledWith(`jti:${decodedToken.jti}`);
    expect(userRepository.findById).toHaveBeenCalledWith(decodedToken.userId);
    expect(tokenGenerator.generate).toHaveBeenCalledWith(user.id, user.role);
    expect(cacheRepository.set).toHaveBeenCalledWith(
      'jti:456',
      'valid',
      expect.any(Number),
    );
    expect(cacheRepository.delete).toHaveBeenCalledWith(
      `jti:${decodedToken.jti}`,
    );
  });

  it('should throw an error for an invalid refresh token', async () => {
    const refreshToken = 'invalid_refresh_token';
    tokenValidator.validateRefreshToken.mockRejectedValue(
      new AppError('Invalid refresh token'),
    );

    await expect(refreshTokenUseCase.execute(refreshToken)).rejects.toThrow(
      AppError,
    );
  });

  it('should throw an error if the token is invalidated', async () => {
    const refreshToken = 'invalidated_refresh_token';
    const decodedToken = {
      jti: '456',
      exp: Date.now() / 1000 + 3600,
      userId: '1',
    };

    tokenValidator.validateRefreshToken.mockResolvedValue(decodedToken);
    cacheRepository.get.mockResolvedValue('invalidated');

    await expect(refreshTokenUseCase.execute(refreshToken)).rejects.toThrow(
      'Invalid refresh token',
    );
  });

  it('should throw an error if the user is not found', async () => {
    const refreshToken = 'user_not_found_token';
    const decodedToken = {
      jti: '789',
      exp: Date.now() / 1000 + 3600,
      userId: '1',
    };

    tokenValidator.validateRefreshToken.mockResolvedValue(decodedToken);
    cacheRepository.get.mockResolvedValue('valid');
    userRepository.findById.mockResolvedValue(null);

    await expect(refreshTokenUseCase.execute(refreshToken)).rejects.toThrow(
      'User not found',
    );
  });
});
