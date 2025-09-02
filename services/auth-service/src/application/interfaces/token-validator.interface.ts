import type { Role } from "@prisma/client";

export interface ValidatedTokenPayload {
  userId: string;
  role: Role;
  jti: string;
  exp: number;
}

export interface ValidRefreshTokenPayload {
  userId: string;
  jti: string;
  exp: number;
}

export interface ITokenValidator {
  validate(token: string): Promise<ValidatedTokenPayload>;
  validateRefreshToken(token: string): Promise<ValidRefreshTokenPayload>;
}
