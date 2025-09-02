export class UserCredential {
  id: string;
  userId: string;
  passwordHash: string;
  createdAt: Date;
  updatedAt: Date;

  constructor(
    id: string,
    userId: string | null | undefined,
    passwordHash: string | null | undefined,
    createdAt?: Date,
    updatedAt?: Date,
  ) {
    if (!userId) {
      throw new Error('User ID cannot be empty');
    }
    if (!passwordHash) {
      throw new Error('Password hash cannot be empty');
    }

    this.id = id;
    this.userId = userId;
    this.passwordHash = passwordHash;
    this.createdAt = createdAt || new Date();
    this.updatedAt = updatedAt || new Date();
  }
}
