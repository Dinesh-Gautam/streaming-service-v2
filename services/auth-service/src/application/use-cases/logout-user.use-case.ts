import { ICacheRepository } from "../interfaces/cache-repository.interface";
import { ITokenValidator } from "../interfaces/token-validator.interface";
import { AppError } from "../errors/app-error";
import { logger } from "../../infrastructure/logger";

export class LogoutUserUseCase {
  constructor(
    private readonly cacheRepository: ICacheRepository,
    private readonly tokenValidator: ITokenValidator
  ) {}

  async execute(refreshToken: string): Promise<void> {
    try {
      const decoded = await this.tokenValidator.validateRefreshToken(
        refreshToken
      );
      const { jti, exp } = decoded;

      if (!jti || !exp) {
        throw new AppError("Invalid refresh token", 401);
      }

      const remainingTime = exp - Math.floor(Date.now() / 1000);
      console.log("remaining time :", { remainingTime });
      if (remainingTime > 0) {
        await this.cacheRepository.set(
          `jti:${jti}`,
          "invalidated",
          remainingTime
        );
      }
    } catch (error) {
      console.log(error);
      logger.warn("Logout failed: invalid refresh token");
      // Do not expose token validation errors
      return;
    }
  }
}
