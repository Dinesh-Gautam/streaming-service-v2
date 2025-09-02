import { IUserRepository } from "../interfaces/user-repository.interface";
import { IPasswordHasher } from "../interfaces/password-hasher.interface";
import { ITokenGenerator } from "../interfaces/token-generator.interface";
import { ICacheRepository } from "../interfaces/cache-repository.interface";
import { ITokenValidator } from "../interfaces/token-validator.interface";
import { AppError } from "../errors/app-error";
import { LoginUserDto } from "../dtos/login-user.dto";
import { injectable, inject } from "tsyringe";
import { logger } from "../../infrastructure/logger";

@injectable()
export class LoginUserUseCase {
  constructor(
    @inject("IUserRepository") private userRepository: IUserRepository,
    @inject("IPasswordHasher") private passwordHasher: IPasswordHasher,
    @inject("ITokenGenerator") private tokenGenerator: ITokenGenerator,
    @inject("ICacheRepository") private cacheRepository: ICacheRepository,
    @inject("ITokenValidator") private tokenValidator: ITokenValidator
  ) {}

  async execute(
    dto: LoginUserDto
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const user = await this.userRepository.findByEmail(dto.email);

    if (!user) {
      logger.warn("Login failed: user not found", { email: dto.email });
      throw new AppError("Invalid credentials", 401);
    }

    const credential = await this.userRepository.findCredentialByUserId(
      user.id
    );

    if (!credential) {
      logger.warn("Login failed: credential not found", { userId: user.id });
      throw new AppError("Invalid credentials", 401);
    }

    const isPasswordValid = await this.passwordHasher.compare(
      dto.password,
      credential.passwordHash
    );

    if (!isPasswordValid) {
      logger.warn("Login failed: invalid password", { email: dto.email });
      throw new AppError("Invalid credentials", 401);
    }

    const { accessToken, refreshToken } = this.tokenGenerator.generate(
      user.id,
      user.role
    );

    const decoded = await this.tokenValidator.validateRefreshToken(
      refreshToken
    );

    const { jti, exp } = decoded;

    if (jti && exp) {
      const remainingTime = exp - Math.floor(Date.now() / 1000);
      await this.cacheRepository.set(`jti:${jti}`, "valid", remainingTime);
    }

    return { accessToken, refreshToken };
  }
}
