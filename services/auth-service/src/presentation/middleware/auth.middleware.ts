import { NextFunction, Request, Response } from 'express';

import type { ITokenValidator } from '@auth-service/application/interfaces/token-validator.interface';

import { AppError } from '@auth-service/application/errors/app-error';
import { config } from '@auth-service/infrastructure/config';
import { JwtTokenValidator } from '@auth-service/infrastructure/security/jwt-token-validator';
import { Role } from '@prisma/client';

export interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    role: Role;
    jti: string;
  };
}

export function auth(
  tokenValidator: ITokenValidator = new JwtTokenValidator(
    config.JWT_SECRET,
    config.JWT_REFRESH_SECRET,
  ),
) {
  return async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(new AppError('Unauthorized', 401));
    }

    const token = authHeader.substring(7);
    try {
      const decoded = await tokenValidator.validate(token);
      req.user = {
        userId: decoded.userId,
        role: decoded.role,
        jti: decoded.jti,
      };
      next();
    } catch (error) {
      return next(new AppError('Unauthorized', 401));
    }
  };
}
