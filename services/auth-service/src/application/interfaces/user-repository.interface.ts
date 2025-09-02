import type { User, UserCredential } from '@prisma/client';

export interface IUserRepository {
  findByEmail(email: string): Promise<User | null>;
  save(user: User, credential: UserCredential): Promise<User>;
  findCredentialByUserId(userId: string): Promise<UserCredential | null>;
  findById(id: string): Promise<User | null>;
}
