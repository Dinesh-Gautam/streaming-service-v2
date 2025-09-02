import { NextFunction, Request, Response } from 'express';

import { AppError } from '@auth-service/application/errors/app-error';
import { Role } from '@prisma/client';

export function authorize(requiredRole: Role) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;

    if (!user || user.role !== requiredRole) {
      return next(new AppError('Forbidden', 403));
    }

    next();
  };
}
