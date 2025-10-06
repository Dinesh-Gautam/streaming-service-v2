import { inject, injectable } from 'tsyringe';

import { AppError } from '@auth-service/application/errors/app-error';
import { IUserRepository } from '@auth-service/application/interfaces/user-repository.interface';
import { User } from '@auth-service/domain/user.entity';

@injectable()
export class GetUserByIdUseCase {
  constructor(
    @inject('UserRepository')
    private userRepository: IUserRepository,
  ) {}

  async execute(id: string): Promise<User | null> {
    try {
      const user = await this.userRepository.findById(id);
      return user;
    } catch (error) {
      throw new AppError('Failed to fetch user', 500);
    }
  }
}
