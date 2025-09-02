import { Role } from "@prisma/client";
export { Role };

export class User {
  id: string;
  name: string | null;
  email: string;
  role: Role;
  emailVerifiedAt?: Date;
  createdAt: Date;
  updatedAt: Date;

  constructor(
    id: string,
    name: string | null,
    email: string,
    role: Role,
    emailVerifiedAt?: Date,
    createdAt?: Date,
    updatedAt?: Date
  ) {
    if (!id) {
      throw new Error("User ID cannot be empty");
    }

    if (name === "") {
      throw new Error("User name cannot be empty");
    }

    if (!this.isValidEmail(email)) {
      throw new Error("Invalid email format");
    }

    this.id = id;
    this.name = name;
    this.email = email;
    this.role = role;
    this.emailVerifiedAt = emailVerifiedAt;
    this.createdAt = createdAt || new Date();
    this.updatedAt = updatedAt || new Date();
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}
