import { LoginUserDto } from '@auth-service/application/dtos/login-user.dto';
import { AppError } from '@auth-service/application/errors/app-error';
import { ICacheRepository } from '@auth-service/application/interfaces/cache-repository.interface';
import { IPasswordHasher } from '@auth-service/application/interfaces/password-hasher.interface';
import { ITokenGenerator } from '@auth-service/application/interfaces/token-generator.interface';
import { ITokenValidator } from '@auth-service/application/interfaces/token-validator.interface';
import { IUserRepository } from '@auth-service/application/interfaces/user-repository.interface';
import { LoginUserUseCase } from '@auth-service/application/use-cases/login-user.use-case';
import { UserCredential } from '@auth-service/domain/user-credential.entity';
import { User } from '@auth-service/domain/user.entity';
import { Role } from '@prisma/client';

import 'reflect-metadata';

describe('LoginUserUseCase', () => {
  let loginUserUseCase: LoginUserUseCase;
  let userRepository: jest.Mocked<IUserRepository>;
  let passwordHasher: jest.Mocked<IPasswordHasher>;
  let tokenGenerator: jest.Mocked<ITokenGenerator>;
  let cacheRepository: jest.Mocked<ICacheRepository>;
  let tokenValidator: jest.Mocked<ITokenValidator>;

  beforeEach(() => {
    userRepository = {
      findByEmail: jest.fn(),
      save: jest.fn(),
      findCredentialByUserId: jest.fn(),
      findById: jest.fn(),
      findAll: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };
    passwordHasher = {
      hash: jest.fn(),
      compare: jest.fn(),
    };
    tokenGenerator = {
      generate: jest.fn(),
    };
    cacheRepository = {
      set: jest.fn(),
      get: jest.fn(),
      has: jest.fn(),
      delete: jest.fn(),
    };
    tokenValidator = {
      validateRefreshToken: jest.fn(),
      validate: jest.fn(),
    };
    loginUserUseCase = new LoginUserUseCase(
      userRepository,
      passwordHasher,
      tokenGenerator,
      cacheRepository,
      tokenValidator,
    );
  });

  it('should login a user and return tokens', async () => {
    const loginUserDto: LoginUserDto = {
      email: 'john.doe@example.com',
      password: 'password123',
    };
    const user = new User('1', 'John Doe', loginUserDto.email, Role.USER);
    const credential = new UserCredential('123', '1', 'hashed_password');
    const tokens = {
      accessToken: 'access_token',
      refreshToken: 'refresh_token',
    };

    userRepository.findByEmail.mockResolvedValue(user);
    userRepository.findCredentialByUserId.mockResolvedValue(credential);
    passwordHasher.compare.mockResolvedValue(true);
    tokenGenerator.generate.mockReturnValue(tokens);
    tokenValidator.validate.mockResolvedValue({
      userId: '1',
      jti: 'jti',
      exp: 12345,
      role: 'USER',
      name: 'user',
      email: 'user-email',
    });

    tokenValidator.validateRefreshToken.mockResolvedValue({
      userId: '1',
      jti: 'jti',
      exp: 12345,
    });

    const result = await loginUserUseCase.execute(loginUserDto);

    expect(result).toEqual(tokens);
    expect(tokenGenerator.generate).toHaveBeenCalledWith(user.id, user.role);
    expect(cacheRepository.set).toHaveBeenCalledWith(
      'jti:jti',
      'valid',
      expect.any(Number),
    );
  });

  it('should throw an error for invalid credentials', async () => {
    const loginUserDto: LoginUserDto = {
      email: 'john.doe@example.com',
      password: 'wrong_password',
    };
    const user = new User('1', 'John Doe', loginUserDto.email, Role.USER);
    const credential = new UserCredential('123', '1', 'hashed_password');

    userRepository.findByEmail.mockResolvedValue(user);
    userRepository.findCredentialByUserId.mockResolvedValue(credential);
    passwordHasher.compare.mockResolvedValue(false);

    await expect(loginUserUseCase.execute(loginUserDto)).rejects.toThrow(
      new AppError('Invalid credentials', 401),
    );
  });

  it('should throw an error if the user is not found', async () => {
    const loginUserDto: LoginUserDto = {
      email: 'nonexistent@example.com',
      password: 'password123',
    };

    userRepository.findByEmail.mockResolvedValue(null);

    await expect(loginUserUseCase.execute(loginUserDto)).rejects.toThrow(
      new AppError('Invalid credentials', 401),
    );
  });

  it('should throw an error if finding user credentials fails', async () => {
    const loginUserDto: LoginUserDto = {
      email: 'john.doe@example.com',
      password: 'password123',
    };
    const user = new User('1', 'John Doe', loginUserDto.email, Role.USER);

    userRepository.findByEmail.mockResolvedValue(user);
    userRepository.findCredentialByUserId.mockRejectedValue(
      new Error('DB error'),
    );

    await expect(loginUserUseCase.execute(loginUserDto)).rejects.toThrow(
      'DB error',
    );
  });

  it('should throw an error if password comparison fails', async () => {
    const loginUserDto: LoginUserDto = {
      email: 'john.doe@example.com',
      password: 'password123',
    };
    const user = new User('1', 'John Doe', loginUserDto.email, Role.USER);
    const credential = new UserCredential('123', '1', 'hashed_password');

    userRepository.findByEmail.mockResolvedValue(user);
    userRepository.findCredentialByUserId.mockResolvedValue(credential);
    passwordHasher.compare.mockRejectedValue(new Error('Compare error'));

    await expect(loginUserUseCase.execute(loginUserDto)).rejects.toThrow(
      'Compare error',
    );
  });

  it('should throw an error if token generation fails', async () => {
    const loginUserDto: LoginUserDto = {
      email: 'john.doe@example.com',
      password: 'password123',
    };
    const user = new User('1', 'John Doe', loginUserDto.email, Role.USER);
    const credential = new UserCredential('123', '1', 'hashed_password');

    userRepository.findByEmail.mockResolvedValue(user);
    userRepository.findCredentialByUserId.mockResolvedValue(credential);
    passwordHasher.compare.mockResolvedValue(true);
    tokenGenerator.generate.mockImplementation(() => {
      throw new Error('Token error');
    });

    await expect(loginUserUseCase.execute(loginUserDto)).rejects.toThrow(
      'Token error',
    );
  });
});
