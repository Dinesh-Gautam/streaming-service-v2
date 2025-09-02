import { AppError } from "../errors/app-error";
import { Role } from "@prisma/client";
import { User } from "../../domain/user.entity";
import { UserCredential } from "../../domain/user-credential.entity";
import { IUserRepository } from "../interfaces/user-repository.interface";
import { IPasswordHasher } from "../interfaces/password-hasher.interface";
import { RegisterUserDto } from "../dtos/register-user.dto";
import { v4 as uuidv4 } from "uuid";
import { injectable, inject } from "tsyringe";
import { logger } from "../../infrastructure/logger";

@injectable()
export class RegisterUserUseCase {
  constructor(
    @inject("IUserRepository") private userRepository: IUserRepository,
    @inject("IPasswordHasher") private passwordHasher: IPasswordHasher
  ) {}

  async execute(dto: RegisterUserDto): Promise<User> {
    if (!dto.password) {
      logger.warn("Registration failed: password cannot be empty");
      throw new AppError("Password cannot be empty", 400);
    }

    const existingUser = await this.userRepository.findByEmail(dto.email);
    if (existingUser) {
      logger.warn("Registration failed: email already in use", {
        email: dto.email,
      });
      throw new AppError("Email already in use", 409);
    }

    const hashedPassword = await this.passwordHasher.hash(dto.password);

    const newUser = new User(uuidv4(), dto.name ?? null, dto.email, Role.USER);
    const newUserCredential = new UserCredential(newUser.id, hashedPassword);

    const savedUser = await this.userRepository.save(
      newUser,
      newUserCredential
    );

    return savedUser;
  }
}
