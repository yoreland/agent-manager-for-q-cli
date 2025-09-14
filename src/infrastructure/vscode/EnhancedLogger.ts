import * as vscode from 'vscode';
import { ILogger, LogLevel, LogEntry } from './ILogger';

export class EnhancedLogger implements ILogger {
    private outputChannel: vscode.OutputChannel;
    private logLevel: LogLevel = LogLevel.INFO;
    private disposed = false;

    constructor(
        outputChannel: vscode.OutputChannel,
        logLevel: LogLevel = LogLevel.INFO
    ) {
        this.outputChannel = outputChannel;
        this.logLevel = logLevel;
    }

    debug(message: string, metadata?: Record<string, any>): void {
        this.log(LogLevel.DEBUG, message, undefined, metadata);
    }

    info(message: string, metadata?: Record<string, any>): void {
        this.log(LogLevel.INFO, message, undefined, metadata);
    }

    warn(message: string, metadata?: Record<string, any>): void {
        this.log(LogLevel.WARN, message, undefined, metadata);
    }

    error(message: string, error?: Error, metadata?: Record<string, any>): void {
        this.log(LogLevel.ERROR, message, error, metadata);
    }

    setLogLevel(level: LogLevel): void {
        this.logLevel = level;
    }

    getLogLevel(): LogLevel {
        return this.logLevel;
    }

    private log(level: LogLevel, message: string, error?: Error, metadata?: Record<string, any>): void {
        if (this.disposed || level < this.logLevel) {
            return;
        }

        const entry: LogEntry = {
            level,
            message,
            timestamp: new Date(),
            metadata,
            error
        };

        const formattedMessage = this.formatLogEntry(entry);
        this.outputChannel.appendLine(formattedMessage);
    }

    private formatLogEntry(entry: LogEntry): string {
        const timestamp = entry.timestamp.toISOString();
        const levelName = LogLevel[entry.level];
        
        let formatted = `[${timestamp}] ${levelName}: ${entry.message}`;
        
        if (entry.metadata) {
            formatted += ` | ${JSON.stringify(entry.metadata)}`;
        }
        
        if (entry.error) {
            formatted += `\nError: ${entry.error.message}\nStack: ${entry.error.stack}`;
        }
        
        return formatted;
    }

    dispose(): void {
        if (!this.disposed) {
            this.disposed = true;
            this.outputChannel.dispose();
        }
    }
}
