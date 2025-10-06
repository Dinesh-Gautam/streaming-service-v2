import 'reflect-metadata';

import express, { Express } from 'express';
import request from 'supertest';
import { container } from 'tsyringe';

import type { ICacheRepository } from '@auth-service/application/interfaces/cache-repository.interface';
import type { IPasswordHasher } from '@auth-service/application/interfaces/password-hasher.interface';
import type { ITokenGenerator } from '@auth-service/application/interfaces/token-generator.interface';
import type { ITokenValidator } from '@auth-service/application/interfaces/token-validator.interface';
import type { IUserRepository } from '@auth-service/application/interfaces/user-repository.interface';

import { RegisterUserUseCase } from '@auth-service/application/use-cases/register-user.use-case';
import { User } from '@auth-service/domain/user.entity';
import { AuthController } from '@auth-service/presentation/controllers/auth.controller';

const app: Express = express();
app.use(express.json());

const mockUserRepository: IUserRepository = {
  findByEmail: jest.fn(),
  save: jest.fn(),
  findCredentialByUserId: jest.fn(),
  findById: jest.fn(),
  findAll: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};
const mockPasswordHasher: IPasswordHasher = {
  hash: jest.fn(),
  compare: jest.fn(),
};

const mockTokenGenerator: ITokenGenerator = {
  generate: jest.fn(),
};

const mockTokenValidator: ITokenValidator = {
  validateRefreshToken: jest.fn(),
  validate: jest.fn(),
};

const mockCacheRepository: ICacheRepository = {
  get: jest.fn(),
  set: jest.fn(),
  has: jest.fn(),
  delete: jest.fn(),
};

container.register('RegisterUserUseCase', {
  useClass: RegisterUserUseCase,
});

const authController = new AuthController(
  mockUserRepository,
  mockPasswordHasher,
  mockTokenGenerator,
  mockTokenValidator,
  mockCacheRepository,
);

app.post('/register', (req, res) => authController.register(req, res));

describe('AuthController - Register (Integration)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should register a new user and return 201', async () => {
    const user = new User('1', 'Test User', 'test@example.com', 'USER');
    (mockUserRepository.findByEmail as jest.Mock).mockResolvedValue(null);
    (mockPasswordHasher.hash as jest.Mock).mockResolvedValue('hashedpassword');
    (mockUserRepository.save as jest.Mock).mockResolvedValue(user);

    const response = await request(app).post('/register').send({
      email: 'test@example.com',
      password: 'password',
      name: 'Test User',
    });

    expect(response.status).toBe(201);
    expect(response.body).toEqual({
      id: '1',
      email: 'test@example.com',
      name: 'Test User',
      role: 'USER',
      createdAt: expect.any(String),
      updatedAt: expect.any(String),
    });
  });

  it('should return 409 if email is already in use', async () => {
    const user = new User('1', 'Test User', 'test@example.com', 'USER');
    (mockUserRepository.findByEmail as jest.Mock).mockResolvedValue(user);

    const response = await request(app).post('/register').send({
      email: 'test@example.com',
      password: 'password',
      name: 'Test User',
    });

    expect(response.status).toBe(409);
    expect(response.body).toEqual({ message: 'Email already in use' });
  });

  it('should return 500 for internal server errors', async () => {
    (mockUserRepository.findByEmail as jest.Mock).mockRejectedValue(
      new Error('Database error'),
    );

    const response = await request(app).post('/register').send({
      email: 'test@example.com',
      password: 'password',
      name: 'Test User',
    });

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ message: 'Internal server error' });
  });
});
