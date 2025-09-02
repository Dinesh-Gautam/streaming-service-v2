import { ILogger } from "./logger.interface";
export declare class WinstonLogger implements ILogger {
    private logger;
    constructor();
    debug(message: string, ...args: unknown[]): void;
    info(message: string, ...args: unknown[]): void;
    warn(message: string, ...args: unknown[]): void;
    error(message: string, ...args: unknown[]): void;
    fatal(message: string, ...args: unknown[]): void;
    close(): void;
}
