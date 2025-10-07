import { inject, injectable } from 'tsyringe';
import { v4 as uuidv4 } from 'uuid';

import type { RegisterUserDto } from '@auth-service/application/dtos/register-user.dto';
import type { IPasswordHasher } from '@auth-service/application/interfaces/password-hasher.interface';
import type { IUserRepository } from '@auth-service/application/interfaces/user-repository.interface';

import { AppError } from '@auth-service/application/errors/app-error';
import { UserCredential } from '@auth-service/domain/user-credential.entity';
import { User } from '@auth-service/domain/user.entity';
import { logger } from '@auth-service/infrastructure/logger';
import { Role } from '@prisma/client';

@injectable()
export class RegisterUserUseCase {
  constructor(
    @inject('IUserRepository') private userRepository: IUserRepository,
    @inject('IPasswordHasher') private passwordHasher: IPasswordHasher,
  ) {}

  async execute(dto: RegisterUserDto): Promise<User> {
    if (!dto.password) {
      logger.warn('Registration failed: password cannot be empty');
      throw new AppError('Password cannot be empty', 400);
    }

    const existingUser = await this.userRepository.findByEmail(dto.email);
    if (existingUser) {
      logger.warn('Registration failed: email already in use', {
        email: dto.email,
      });
      throw new AppError('Email already in use', 409);
    }

    const hashedPassword = await this.passwordHasher.hash(dto.password);

    const newUser = new User(uuidv4(), dto.name ?? null, dto.email, Role.ADMIN);
    const newUserCredential = new UserCredential(
      uuidv4(),
      newUser.id,
      hashedPassword,
    );

    const savedUser = await this.userRepository.save(
      newUser,
      newUserCredential,
    );

    return savedUser;
  }
}
