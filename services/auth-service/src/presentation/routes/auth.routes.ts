import { IRouter, Router } from 'express';
import { processRequest } from 'zod-express-middleware';

import {
  loginUserSchema,
  registerUserSchema,
} from '@auth-service/application/dtos/zod-schemas';
import { RedisCacheRepository } from '@auth-service/infrastructure/cache/redis-cache.repository';
import { config } from '@auth-service/infrastructure/config';
import { prisma } from '@auth-service/infrastructure/database/prisma/client';
import { PrismaUserRepository } from '@auth-service/infrastructure/database/repositories/prisma-user.repository';
import { BcryptPasswordHasher } from '@auth-service/infrastructure/security/bcrypt-password-hasher';
import { JwtTokenGenerator } from '@auth-service/infrastructure/security/jwt-token-generator';
import { JwtTokenValidator } from '@auth-service/infrastructure/security/jwt-token-validator';
import { AuthController } from '@auth-service/presentation/controllers/auth.controller';
import { auth } from '@auth-service/presentation/middleware/auth.middleware';
import { authorize } from '@auth-service/presentation/middleware/authorization.middleware';
import { Role } from '@prisma/client';

const authRouter: IRouter = Router();

const userRepository = new PrismaUserRepository(prisma);
const passwordHasher = new BcryptPasswordHasher();
const tokenGenerator = new JwtTokenGenerator(
  config.JWT_SECRET,
  config.JWT_REFRESH_SECRET,
  config.ACCESS_TOKEN_EXPIRATION as any,
);
const tokenValidator = new JwtTokenValidator(
  config.JWT_SECRET,
  config.JWT_REFRESH_SECRET,
);
const cacheRepository = new RedisCacheRepository();

const authController = new AuthController(
  userRepository,
  passwordHasher,
  tokenGenerator,
  tokenValidator,
  cacheRepository,
);

authRouter.post(
  '/register',
  processRequest({ body: registerUserSchema }),
  authController.register.bind(authController),
);
authRouter.post(
  '/login',
  processRequest({ body: loginUserSchema }),
  authController.login.bind(authController),
);
authRouter.post(
  '/refresh-token',
  authController.refreshToken.bind(authController),
);
authRouter.post('/logout', auth(), authController.logout.bind(authController));

authRouter.get('/admin', auth(), authorize(Role.ADMIN), (req, res) => {
  res.status(200).json({ message: 'Welcome, admin!' });
});

export { authRouter };
