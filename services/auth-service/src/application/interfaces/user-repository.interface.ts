import { User } from "../../domain/user.entity";
import { UserCredential } from "../../domain/user-credential.entity";

export interface IUserRepository {
  findByEmail(email: string): Promise<User | null>;
  save(user: User, credential: UserCredential): Promise<User>;
  findCredentialByUserId(userId: string): Promise<UserCredential | null>;
  findById(id: string): Promise<User | null>;
}
