import { Role } from '@prisma/client';

export { Role };

function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export class User {
  id: string;
  name: string | null;
  email: string;
  role: Role;
  createdAt: Date;
  updatedAt: Date;

  constructor(
    id: string,
    name: string | null,
    email: string,
    role: Role,
    createdAt?: Date,
    updatedAt?: Date,
  ) {
    if (!id) {
      throw new Error('User ID cannot be empty');
    }

    if (name === '') {
      throw new Error('User name cannot be empty');
    }

    if (!isValidEmail(email)) {
      throw new Error('Invalid email format');
    }

    this.id = id;
    this.name = name;
    this.email = email;
    this.role = role;
    this.createdAt = createdAt || new Date();
    this.updatedAt = updatedAt || new Date();
  }
}
