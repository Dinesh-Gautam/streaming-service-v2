import type { IUserRepository } from '@auth-service/application/interfaces/user-repository.interface';

import { UserCredential } from '@auth-service/domain/user-credential.entity';
import { User } from '@auth-service/domain/user.entity';
import { PrismaClient } from '@prisma/client';

export class PrismaUserRepository implements IUserRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findByEmail(email: string): Promise<User | null> {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return null;
    }

    return new User(
      user.id,
      user.name,
      user.email,
      user.role,
      user.createdAt,
      user.updatedAt,
    );
  }

  async save(user: User, credential: UserCredential): Promise<User> {
    const createdUser = await this.prisma.user.create({
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        credential: {
          create: {
            id: credential.userId,
            passwordHash: credential.passwordHash,
          },
        },
      },
    });

    return new User(
      createdUser.id,
      createdUser.name,
      createdUser.email,
      createdUser.role,
      createdUser.createdAt,
      createdUser.updatedAt,
    );
  }

  async findCredentialByUserId(userId: string): Promise<UserCredential | null> {
    const credential = await this.prisma.userCredential.findUnique({
      where: { userId },
    });

    if (!credential) {
      return null;
    }

    return new UserCredential(
      credential.id,
      credential.userId,
      credential.passwordHash,
      credential.createdAt,
      credential.updatedAt,
    );
  }

  async findById(id: string): Promise<User | null> {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      return null;
    }

    return new User(
      user.id,
      user.name,
      user.email,
      user.role,
      user.createdAt,
      user.updatedAt,
    );
  }
}
