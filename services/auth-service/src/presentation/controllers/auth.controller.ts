import { Request, Response } from "express";
import { RegisterUserUseCase } from "../../application/use-cases/register-user.use-case";
import { LoginUserUseCase } from "../../application/use-cases/login-user.use-case";
import { RefreshTokenUseCase } from "../../application/use-cases/refresh-token.use-case";
import { LogoutUserUseCase } from "../../application/use-cases/logout-user.use-case";
import { IUserRepository } from "../../application/interfaces/user-repository.interface";
import { IPasswordHasher } from "../../application/interfaces/password-hasher.interface";
import { ITokenGenerator } from "../../application/interfaces/token-generator.interface";
import { ITokenValidator } from "../../application/interfaces/token-validator.interface";
import { ICacheRepository } from "../../application/interfaces/cache-repository.interface";
import { config } from "../../infrastructure/config";
import { logger } from "../../infrastructure/logger";
import { injectable, inject } from "tsyringe";
import type { AppError } from "../../application/errors/app-error";

@injectable()
export class AuthController {
  constructor(
    @inject("IUserRepository") private readonly userRepository: IUserRepository,
    @inject("IPasswordHasher") private readonly passwordHasher: IPasswordHasher,
    @inject("ITokenGenerator")
    private readonly tokenGenerator: ITokenGenerator,
    @inject("ITokenValidator")
    private readonly tokenValidator: ITokenValidator,
    @inject("ICacheRepository")
    private readonly cacheRepository: ICacheRepository
  ) {}

  async register(req: Request, res: Response): Promise<Response> {
    const registerUserUseCase = new RegisterUserUseCase(
      this.userRepository,
      this.passwordHasher
    );
    try {
      const user = await registerUserUseCase.execute(req.body);
      logger.info("User registered successfully", { userId: user.id });
      const { ...userWithoutPassword } = user;
      return res.status(201).json(userWithoutPassword);
    } catch (error: unknown) {
      if (error instanceof Error && error.message === "Email already in use") {
        logger.warn("Registration failed: email already in use", {
          email: req.body.email,
        });
        return res.status(409).json({ message: error.message });
      }
      logger.error("Error during user registration", { error });
      return res.status(500).json({ message: "Internal server error" });
    }
  }

  async login(req: Request, res: Response): Promise<Response> {
    const loginUserUseCase = new LoginUserUseCase(
      this.userRepository,
      this.passwordHasher,
      this.tokenGenerator,
      this.cacheRepository,
      this.tokenValidator
    );
    try {
      const { accessToken, refreshToken } = await loginUserUseCase.execute(
        req.body
      );

      res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: config.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      logger.info("User logged in successfully", { email: req.body.email });
      return res.status(200).json({ accessToken });
    } catch (error: unknown) {
      if (error instanceof Error && error.message === "Invalid credentials") {
        logger.warn("Login failed: invalid credentials", {
          email: req.body.email,
        });
        return res.status(401).json({ message: error.message });
      }
      logger.error("Error during user login", { error });
      return res
        .status((error as AppError)?.statusCode || 500)
        .json({ message: "Internal server error" });
    }
  }

  async refreshToken(req: Request, res: Response): Promise<Response> {
    const refreshTokenUseCase = new RefreshTokenUseCase(
      this.userRepository,
      this.tokenGenerator,
      this.tokenValidator,
      this.cacheRepository
    );
    try {
      const { refreshToken } = req.cookies;
      if (!refreshToken) {
        logger.warn("Refresh token not found");
        return res.status(401).json({ message: "Refresh token not found" });
      }

      const { accessToken, refreshToken: newRefreshToken } =
        await refreshTokenUseCase.execute(refreshToken);

      res.cookie("refreshToken", newRefreshToken, {
        httpOnly: true,
        secure: config.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      logger.info("Token refreshed successfully");
      return res.status(200).json({ accessToken });
    } catch (error: unknown) {
      logger.error("Error during token refresh", { error });
      return res.status(401).json({ message: "Invalid refresh token" });
    }
  }

  async logout(req: Request, res: Response): Promise<Response> {
    const logoutUserUseCase = new LogoutUserUseCase(
      this.cacheRepository,
      this.tokenValidator
    );
    try {
      const { refreshToken } = req.cookies;
      if (refreshToken) {
        await logoutUserUseCase.execute(refreshToken);
        logger.info("User logged out successfully");
      }
      res.cookie("refreshToken", "", {
        httpOnly: true,
        secure: config.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 0,
      });
      return res.status(200).json({ message: "Logged out" });
    } catch (error) {
      logger.error("Error during user logout", { error });
      return res.status(500).json({ message: "Internal server error" });
    }
  }
}
