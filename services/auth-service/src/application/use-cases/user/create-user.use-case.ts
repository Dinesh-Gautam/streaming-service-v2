import { inject, injectable } from 'tsyringe';
import { v4 as uuidv4 } from 'uuid';

import { AppError } from '@auth-service/application/errors/app-error';
import { IPasswordHasher } from '@auth-service/application/interfaces/password-hasher.interface';
import { IUserRepository } from '@auth-service/application/interfaces/user-repository.interface';
import { UserCredential } from '@auth-service/domain/user-credential.entity';
import { User } from '@auth-service/domain/user.entity';

@injectable()
export class CreateUserUseCase {
  constructor(
    @inject('UserRepository')
    private userRepository: IUserRepository,
    @inject('PasswordHasher')
    private passwordHasher: IPasswordHasher,
  ) {}

  async execute(data: any): Promise<User> {
    try {
      const { name, email, password, role } = data;
      const userExists = await this.userRepository.findByEmail(email);

      if (userExists) {
        throw new AppError('User with this email already exists', 409);
      }

      const passwordHash = await this.passwordHasher.hash(password);
      const id = uuidv4();
      const user = new User(id, name, email, role);
      const credential = new UserCredential(id, user.id, passwordHash);
      const newUser = await this.userRepository.save(user, credential);

      return newUser;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to create user', 500);
    }
  }
}
