import * as winston from 'winston';

import { ILogger } from './logger.interface';

const customLevels = {
  fatal: 0,
  error: 1,
  warn: 2,
  info: 3,
  debug: 4,
};

const customColors = {
  fatal: 'red',
  error: 'red',
  warn: 'yellow',
  info: 'green',
  debug: 'blue',
};

winston.addColors(customColors);

export class WinstonLogger implements ILogger {
  private logger: winston.Logger;

  constructor() {
    this.logger = winston.createLogger({
      levels: customLevels,
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.splat(),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
          return `${timestamp} [${level}]: ${message} ${
            meta.stack ? `\nStack: ${meta.stack}`
            : Object.keys(meta).length ? JSON.stringify(meta, null, 2)
            : ''
          }`;
        }),
      ),
      transports: [new winston.transports.Console()],
    });
  }

  debug(message: string, ...args: unknown[]): void {
    this.logger.debug(message, ...args);
  }

  info(message: string, ...args: unknown[]): void {
    this.logger.info(message, ...args);
  }

  warn(message: string, ...args: unknown[]): void {
    this.logger.warn(message, ...args);
  }

  error(message: string, ...args: unknown[]): void {
    this.logger.error(message, ...args);
  }

  fatal(message: string, ...args: unknown[]): void {
    this.logger.log('fatal', message, ...args);
  }

  close(): void {
    this.logger.close();
  }
}
