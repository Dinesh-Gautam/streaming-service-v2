import { ITokenGenerator } from "../interfaces/token-generator.interface";
import { IUserRepository } from "../interfaces/user-repository.interface";
import { AppError } from "../errors/app-error";
import { ICacheRepository } from "../interfaces/cache-repository.interface";
import { ITokenValidator } from "../interfaces/token-validator.interface";
import { logger } from "../../infrastructure/logger";

export class RefreshTokenUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly tokenGenerator: ITokenGenerator,
    private readonly tokenValidator: ITokenValidator,
    private readonly cacheRepository: ICacheRepository
  ) {}

  async execute(
    refreshToken: string
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const decoded = await this.tokenValidator.validateRefreshToken(
      refreshToken
    );

    if (!decoded) {
      logger.warn("Refresh token failed: decoded token is null");
      throw new AppError("Invalid refresh token", 401);
    }

    const { userId, jti } = decoded;

    if (!jti) {
      logger.warn("Refresh token failed: jti not found");
      throw new AppError("Invalid refresh token", 401);
    }

    const storedToken = await this.cacheRepository.get(`jti:${jti}`);
    if (storedToken !== "valid") {
      logger.warn("Refresh token failed: jti is invalidated or not found");
      throw new AppError("Invalid refresh token", 401);
    }

    const user = await this.userRepository.findById(userId);
    if (!user) {
      logger.warn("Refresh token failed: user not found", { userId });
      throw new AppError("User not found", 404);
    }

    const { accessToken, refreshToken: newRefreshToken } =
      this.tokenGenerator.generate(user.id, user.role);

    const newDecoded = await this.tokenValidator.validateRefreshToken(
      newRefreshToken
    );
    const { jti: newJti, exp } = newDecoded;

    if (newJti && exp) {
      const remainingTime = exp - Math.floor(Date.now() / 1000);
      await this.cacheRepository.set(`jti:${newJti}`, "valid", remainingTime);
    }
    await this.cacheRepository.delete(`jti:${jti}`);

    return { accessToken, refreshToken: newRefreshToken };
  }
}
