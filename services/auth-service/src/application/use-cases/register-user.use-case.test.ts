import type { RegisterUserDto } from '@auth-service/application/dtos/register-user.dto';
import type { IPasswordHasher } from '@auth-service/application/interfaces/password-hasher.interface';
import type { IUserRepository } from '@auth-service/application/interfaces/user-repository.interface';

import { AppError } from '@auth-service/application/errors/app-error';
import { RegisterUserUseCase } from '@auth-service/application/use-cases/register-user.use-case';
import { UserCredential } from '@auth-service/domain/user-credential.entity';
import { User } from '@auth-service/domain/user.entity';
import { Role } from '@prisma/client';

import 'reflect-metadata';

describe('RegisterUserUseCase', () => {
  let registerUserUseCase: RegisterUserUseCase;
  let userRepository: jest.Mocked<IUserRepository>;
  let passwordHasher: jest.Mocked<IPasswordHasher>;

  beforeEach(() => {
    userRepository = {
      findByEmail: jest.fn(),
      save: jest.fn(),
      findCredentialByUserId: jest.fn(),
      findById: jest.fn(),
    };
    passwordHasher = {
      hash: jest.fn(),
      compare: jest.fn(),
    };
    registerUserUseCase = new RegisterUserUseCase(
      userRepository,
      passwordHasher,
    );
  });

  it('should register a new user successfully', async () => {
    const registerUserDto: RegisterUserDto = {
      name: 'John Doe',
      email: 'john.doe@example.com',
      password: 'password123',
    };

    userRepository.findByEmail.mockResolvedValue(null);
    passwordHasher.hash.mockResolvedValue('hashed_password');
    const expectedUser = new User(
      '1',
      registerUserDto.name ?? null,
      registerUserDto.email,
      Role.USER,
    );
    userRepository.save.mockResolvedValue(expectedUser);

    const result = await registerUserUseCase.execute(registerUserDto);

    expect(userRepository.findByEmail).toHaveBeenCalledWith(
      registerUserDto.email,
    );
    expect(passwordHasher.hash).toHaveBeenCalledWith(registerUserDto.password);
    expect(userRepository.save).toHaveBeenCalledWith(
      expect.any(User),
      expect.any(UserCredential),
    );
    expect(result).toEqual(expectedUser);
  });

  it('should throw an error if the email is already in use', async () => {
    const registerUserDto: RegisterUserDto = {
      email: 'john.doe@example.com',
      password: 'password123',
    };

    userRepository.findByEmail.mockResolvedValue(
      new User('1', 'John Doe', 'john.doe@example.com', Role.USER),
    );

    await expect(registerUserUseCase.execute(registerUserDto)).rejects.toThrow(
      new AppError('Email already in use', 409),
    );
  });

  it('should throw an error if the password is empty', async () => {
    const registerUserDto: RegisterUserDto = {
      name: 'John Doe',
      email: 'john.doe@example.com',
      password: '',
    };

    await expect(registerUserUseCase.execute(registerUserDto)).rejects.toThrow(
      new AppError('Password cannot be empty', 400),
    );
  });

  it('should throw an error if the user repository fails to find an email', async () => {
    const registerUserDto: RegisterUserDto = {
      name: 'John Doe',
      email: 'john.doe@example.com',
      password: 'password123',
    };

    userRepository.findByEmail.mockRejectedValue(new Error('DB error'));

    await expect(registerUserUseCase.execute(registerUserDto)).rejects.toThrow(
      'DB error',
    );
  });

  it('should throw an error if the password hasher fails', async () => {
    const registerUserDto: RegisterUserDto = {
      name: 'John Doe',
      email: 'john.doe@example.com',
      password: 'password123',
    };

    userRepository.findByEmail.mockResolvedValue(null);
    passwordHasher.hash.mockRejectedValue(new Error('Hash error'));

    await expect(registerUserUseCase.execute(registerUserDto)).rejects.toThrow(
      'Hash error',
    );
  });

  it('should throw an error if the user repository fails to save a user', async () => {
    const registerUserDto: RegisterUserDto = {
      name: 'John Doe',
      email: 'john.doe@example.com',
      password: 'password123',
    };

    userRepository.findByEmail.mockResolvedValue(null);
    passwordHasher.hash.mockResolvedValue('hashed_password');
    userRepository.save.mockRejectedValue(new Error('DB error'));

    await expect(registerUserUseCase.execute(registerUserDto)).rejects.toThrow(
      'DB error',
    );
  });
});
