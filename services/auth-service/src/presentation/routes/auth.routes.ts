import { Router } from "express";
import { AuthController } from "../controllers/auth.controller";
import { processRequest } from "zod-express-middleware";
import {
  loginUserSchema,
  registerUserSchema,
} from "../../application/dtos/zod-schemas";
import { PrismaUserRepository } from "../../infrastructure/database/repositories/prisma-user.repository";
import { prisma } from "../../infrastructure/database/prisma/client";
import { BcryptPasswordHasher } from "../../infrastructure/security/bcrypt-password-hasher";
import { JwtTokenGenerator } from "../../infrastructure/security/jwt-token-generator";
import { config } from "../../infrastructure/config";
import { JwtTokenValidator } from "../../infrastructure/security/jwt-token-validator";
import { RedisCacheRepository } from "../../infrastructure/cache/redis-cache.repository";
import { auth } from "../middleware/auth.middleware";
import { authorize } from "../middleware/authorization.middleware";
import { Role } from "@prisma/client";

const authRouter = Router();

const userRepository = new PrismaUserRepository(prisma);
const passwordHasher = new BcryptPasswordHasher();
const tokenGenerator = new JwtTokenGenerator(
  config.JWT_SECRET,
  config.JWT_REFRESH_SECRET,
  config.ACCESS_TOKEN_EXPIRATION as any
);
const tokenValidator = new JwtTokenValidator(
  config.JWT_SECRET,
  config.JWT_REFRESH_SECRET
);
const cacheRepository = new RedisCacheRepository();

const authController = new AuthController(
  userRepository,
  passwordHasher,
  tokenGenerator,
  tokenValidator,
  cacheRepository
);

authRouter.post(
  "/register",
  processRequest({ body: registerUserSchema }),
  authController.register.bind(authController)
);
authRouter.post(
  "/login",
  processRequest({ body: loginUserSchema }),
  authController.login.bind(authController)
);
authRouter.post(
  "/refresh-token",
  authController.refreshToken.bind(authController)
);
authRouter.post("/logout", auth(), authController.logout.bind(authController));

authRouter.get("/admin", auth(), authorize(Role.ADMIN), (req, res) => {
  res.status(200).json({ message: "Welcome, admin!" });
});

export { authRouter };
