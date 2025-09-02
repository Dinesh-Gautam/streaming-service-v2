import "reflect-metadata";
import { AppError } from "../errors/app-error";
import { Role } from "@prisma/client";
import { IUserRepository } from "../interfaces/user-repository.interface";
import { IPasswordHasher } from "../interfaces/password-hasher.interface";
import { User } from "../../domain/user.entity";
import { UserCredential } from "../../domain/user-credential.entity";
import { RegisterUserDto } from "../dtos/register-user.dto";
import { RegisterUserUseCase } from "./register-user.use-case";

describe("RegisterUserUseCase", () => {
  let registerUserUseCase: RegisterUserUseCase;
  let userRepository: jest.Mocked<IUserRepository>;
  let passwordHasher: jest.Mocked<IPasswordHasher>;

  beforeEach(() => {
    userRepository = {
      findByEmail: jest.fn(),
      save: jest.fn(),
      findCredentialByUserId: jest.fn(),
      findById: jest.fn(),
    };
    passwordHasher = {
      hash: jest.fn(),
      compare: jest.fn(),
    };
    registerUserUseCase = new RegisterUserUseCase(
      userRepository,
      passwordHasher
    );
  });

  it("should register a new user successfully", async () => {
    const registerUserDto: RegisterUserDto = {
      name: "John Doe",
      email: "john.doe@example.com",
      password: "password123",
    };

    userRepository.findByEmail.mockResolvedValue(null);
    passwordHasher.hash.mockResolvedValue("hashed_password");
    const expectedUser = new User(
      "1",
      registerUserDto.name ?? null,
      registerUserDto.email,
      Role.USER
    );
    userRepository.save.mockResolvedValue(expectedUser);

    const result = await registerUserUseCase.execute(registerUserDto);

    expect(userRepository.findByEmail).toHaveBeenCalledWith(
      registerUserDto.email
    );
    expect(passwordHasher.hash).toHaveBeenCalledWith(registerUserDto.password);
    expect(userRepository.save).toHaveBeenCalledWith(
      expect.any(User),
      expect.any(UserCredential)
    );
    expect(result).toEqual(expectedUser);
  });

  it("should throw an error if the email is already in use", async () => {
    const registerUserDto: RegisterUserDto = {
      email: "john.doe@example.com",
      password: "password123",
    };

    userRepository.findByEmail.mockResolvedValue(
      new User("1", "John Doe", "john.doe@example.com", Role.USER)
    );

    await expect(registerUserUseCase.execute(registerUserDto)).rejects.toThrow(
      new AppError("Email already in use", 409)
    );
  });

  it("should throw an error if the password is empty", async () => {
    const registerUserDto: RegisterUserDto = {
      name: "John Doe",
      email: "john.doe@example.com",
      password: "",
    };

    await expect(registerUserUseCase.execute(registerUserDto)).rejects.toThrow(
      new AppError("Password cannot be empty", 400)
    );
  });

  it("should throw an error if the user repository fails to find an email", async () => {
    const registerUserDto: RegisterUserDto = {
      name: "John Doe",
      email: "john.doe@example.com",
      password: "password123",
    };

    userRepository.findByEmail.mockRejectedValue(new Error("DB error"));

    await expect(registerUserUseCase.execute(registerUserDto)).rejects.toThrow(
      "DB error"
    );
  });

  it("should throw an error if the password hasher fails", async () => {
    const registerUserDto: RegisterUserDto = {
      name: "John Doe",
      email: "john.doe@example.com",
      password: "password123",
    };

    userRepository.findByEmail.mockResolvedValue(null);
    passwordHasher.hash.mockRejectedValue(new Error("Hash error"));

    await expect(registerUserUseCase.execute(registerUserDto)).rejects.toThrow(
      "Hash error"
    );
  });

  it("should throw an error if the user repository fails to save a user", async () => {
    const registerUserDto: RegisterUserDto = {
      name: "John Doe",
      email: "john.doe@example.com",
      password: "password123",
    };

    userRepository.findByEmail.mockResolvedValue(null);
    passwordHasher.hash.mockResolvedValue("hashed_password");
    userRepository.save.mockRejectedValue(new Error("DB error"));

    await expect(registerUserUseCase.execute(registerUserDto)).rejects.toThrow(
      "DB error"
    );
  });
});
