import { Router } from 'express';
import { container } from 'tsyringe';

import { prisma } from '@auth-service/infrastructure/database/prisma/client';
import { PrismaUserRepository } from '@auth-service/infrastructure/database/repositories/prisma-user.repository';
import { BcryptPasswordHasher } from '@auth-service/infrastructure/security/bcrypt-password-hasher';
import { UserController } from '@auth-service/presentation/controllers/user.controller';
import { auth } from '@auth-service/presentation/middleware/auth.middleware';
import { authorize } from '@auth-service/presentation/middleware/authorization.middleware';
import { Role } from '@prisma/client';

const userRouter: Router = Router();

const userRepository = new PrismaUserRepository(prisma);
const passwordHasher = new BcryptPasswordHasher();

container.register('UserRepository', { useValue: userRepository });
container.register('PasswordHasher', { useValue: passwordHasher });

const userController = container.resolve(UserController);

// userRouter.use(auth(), authorize(Role.ADMIN));

userRouter.get('/', userController.getAllUsers.bind(userController));
userRouter.get('/:id', userController.getUserById.bind(userController));
userRouter.post('/', userController.createUser.bind(userController));
userRouter.put('/:id', userController.updateUser.bind(userController));
userRouter.delete('/:id', userController.deleteUser.bind(userController));

export { userRouter };
