import { inject, injectable } from 'tsyringe';

import { AppError } from '@auth-service/application/errors/app-error';
import { IUserRepository } from '@auth-service/application/interfaces/user-repository.interface';
import { User } from '@auth-service/domain/user.entity';

@injectable()
export class GetAllUsersUseCase {
  constructor(
    @inject('UserRepository')
    private userRepository: IUserRepository,
  ) {}

  async execute(): Promise<User[]> {
    try {
      const users = await this.userRepository.findAll();
      return users;
    } catch (error) {
      throw new AppError('Failed to fetch users', 500);
    }
  }
}
