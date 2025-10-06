import { Request, Response } from 'express';
import { container } from 'tsyringe';

import { AppError } from '@auth-service/application/errors/app-error';
import { CreateUserUseCase } from '@auth-service/application/use-cases/user/create-user.use-case';
import { DeleteUserUseCase } from '@auth-service/application/use-cases/user/delete-user.use-case';
import { GetAllUsersUseCase } from '@auth-service/application/use-cases/user/get-all-users.use-case';
import { GetUserByIdUseCase } from '@auth-service/application/use-cases/user/get-user-by-id.use-case';
import { UpdateUserUseCase } from '@auth-service/application/use-cases/user/update-user.use-case';
import { logger } from '@auth-service/infrastructure/logger';

export class UserController {
  async getAllUsers(req: Request, res: Response): Promise<Response> {
    try {
      const getAllUsersUseCase = container.resolve(GetAllUsersUseCase);
      const users = await getAllUsersUseCase.execute();
      return res.status(200).json(users);
    } catch (error) {
      logger.error('Error fetching users:', error);
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({ error: error.message });
      }
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  async getUserById(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      const getUserByIdUseCase = container.resolve(GetUserByIdUseCase);
      const user = await getUserByIdUseCase.execute(id);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      return res.status(200).json(user);
    } catch (error) {
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({ error: error.message });
      }
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  async createUser(req: Request, res: Response): Promise<Response> {
    try {
      const createUserUseCase = container.resolve(CreateUserUseCase);
      const user = await createUserUseCase.execute(req.body);
      return res.status(201).json(user);
    } catch (error) {
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({ error: error.message });
      }
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  async updateUser(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      const updateUserUseCase = container.resolve(UpdateUserUseCase);
      const user = await updateUserUseCase.execute(id, req.body);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      return res.status(200).json(user);
    } catch (error) {
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({ error: error.message });
      }
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  async deleteUser(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      const deleteUserUseCase = container.resolve(DeleteUserUseCase);
      await deleteUserUseCase.execute(id);
      return res.status(204).send();
    } catch (error) {
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({ error: error.message });
      }
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }
}
