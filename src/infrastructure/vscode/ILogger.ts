export interface ILogger {
    debug(message: string, metadata?: Record<string, any>): void;
    info(message: string, metadata?: Record<string, any>): void;
    warn(message: string, metadata?: Record<string, any>): void;
    error(message: string, error?: Error, metadata?: Record<string, any>): void;
    
    setLogLevel(level: LogLevel): void;
    getLogLevel(): LogLevel;
    
    dispose(): void;
}

export enum LogLevel {
    DEBUG = 0,
    INFO = 1,
    WARN = 2,
    ERROR = 3
}

export interface LogEntry {
    level: LogLevel;
    message: string;
    timestamp: Date;
    metadata?: Record<string, any> | undefined;
    error?: Error | undefined;
}
