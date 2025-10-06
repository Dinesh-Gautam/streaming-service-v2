import { inject, injectable } from 'tsyringe';

import { AppError } from '@auth-service/application/errors/app-error';
import { IUserRepository } from '@auth-service/application/interfaces/user-repository.interface';

@injectable()
export class DeleteUserUseCase {
  constructor(
    @inject('UserRepository')
    private userRepository: IUserRepository,
  ) {}

  async execute(id: string): Promise<void> {
    try {
      await this.userRepository.delete(id);
    } catch (error) {
      throw new AppError('Failed to delete user', 500);
    }
  }
}
