import { NextFunction, Request, Response } from 'express';

import { AppError } from '@auth-service/application/errors/app-error';
import { config } from '@auth-service/infrastructure/config';
import { logger } from '@auth-service/infrastructure/logger';

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction,
) => {
  logger.error(err.message, {
    stack: config.NODE_ENV === 'development' ? err.stack : undefined,
  });

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      status: 'error',
      message: err.message,
    });
  }

  if (config.NODE_ENV === 'production' && !(err instanceof AppError)) {
    return res.status(500).json({
      status: 'error',
      message: 'Something went very wrong',
    });
  }

  return res.status(500).json({
    status: 'error',
    message: err.message,
    stack: err.stack,
  });
};
