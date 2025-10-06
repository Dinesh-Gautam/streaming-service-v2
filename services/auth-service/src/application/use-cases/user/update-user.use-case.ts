import { inject, injectable } from 'tsyringe';

import { AppError } from '@auth-service/application/errors/app-error';
import { IUserRepository } from '@auth-service/application/interfaces/user-repository.interface';
import { User } from '@auth-service/domain/user.entity';

@injectable()
export class UpdateUserUseCase {
  constructor(
    @inject('UserRepository')
    private userRepository: IUserRepository,
  ) {}

  async execute(id: string, data: Partial<User>): Promise<User | null> {
    try {
      const user = await this.userRepository.update(id, data);
      return user;
    } catch (error) {
      throw new AppError('Failed to update user', 500);
    }
  }
}
