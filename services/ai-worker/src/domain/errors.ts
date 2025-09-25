import { logger } from '../config/logger';

export class AppError extends Error {
  public readonly name: string;
  public readonly details: Record<string, any>;

  constructor(
    name: string,
    message: string,
    details: Record<string, any> = {},
  ) {
    super(message);
    this.name = name;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class CommandExecutionError extends AppError {
  constructor(
    command: string,
    originalError: any,
    details: Record<string, any> = {},
  ) {
    super(
      'CommandExecutionError',
      `Command failed: ${command}\nError: ${originalError.message}`,
      {
        ...details,
        stdout: originalError.stdout,
        stderr: originalError.stderr,
      },
    );
  }
}

export function logError(error: any, context: string) {
  if (error instanceof AppError) {
    logger.error(`[${context}] ${error.name}: ${error.message}`, {
      details: error.details,
      stack: error.stack,
    });
  } else if (error instanceof Error) {
    logger.error(`[${context}] Unexpected error: ${error.message}`, {
      stack: error.stack,
    });
  } else {
    logger.error(`[${context}] Unexpected error: ${String(error)}`);
  }
}
