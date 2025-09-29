import { Role } from '@prisma/client';

export interface ITokenGenerator {
  generate(
    userId: string,
    role: Role,
    name: string,
    email: string,
  ): {
    accessToken: string;
    refreshToken: string;
  };
}
