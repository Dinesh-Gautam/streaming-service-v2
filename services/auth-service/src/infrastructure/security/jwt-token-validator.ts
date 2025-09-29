import * as jwt from 'jsonwebtoken';

import type {
  ITokenValidator,
  ValidatedTokenPayload,
  ValidRefreshTokenPayload,
} from '@auth-service/application/interfaces/token-validator.interface';

import { AppError } from '@auth-service/application/errors/app-error';

export class JwtTokenValidator implements ITokenValidator {
  constructor(
    private readonly secret: string,
    private readonly refreshSecret: string,
  ) {}

  async validate(token: string): Promise<ValidatedTokenPayload> {
    try {
      const decoded = jwt.verify(token, this.secret) as ValidatedTokenPayload;

      if (!decoded || !decoded.role || !decoded.jti || !decoded.exp) {
        throw new AppError('Invalid token', 401);
      }

      return {
        userId: decoded.userId,
        role: decoded.role,
        jti: decoded.jti,
        exp: decoded.exp,
        name: decoded.name,
        email: decoded.email,
      };
    } catch (error) {
      throw new AppError('Invalid token', 401);
    }
  }

  async validateRefreshToken(token: string): Promise<ValidRefreshTokenPayload> {
    try {
      const decoded = jwt.verify(
        token,
        this.refreshSecret,
      ) as ValidatedTokenPayload;

      if (!decoded || !decoded.userId || !decoded.exp || !decoded.jti) {
        throw new AppError('Invalid token', 401);
      }

      return {
        userId: decoded.userId,
        jti: decoded.jti,
        exp: decoded.exp,
      };
    } catch (error) {
      console.log('Token validation error:', error);
      throw new AppError('Invalid token', 401);
    }
  }
}
