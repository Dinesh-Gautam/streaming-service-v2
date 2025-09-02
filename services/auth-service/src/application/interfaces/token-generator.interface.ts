import { Role } from '@prisma/client';

export interface ITokenGenerator {
  generate(
    userId: string,
    role: Role,
  ): {
    accessToken: string;
    refreshToken: string;
  };
}
