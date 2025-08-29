import * as vscode from 'vscode';
import { Logger, LogLevel } from '../types/extension';

/**
 * Logger implementation for the Q CLI Context Manager extension
 */
export class ExtensionLogger implements Logger {
    private outputChannel: vscode.OutputChannel;
    private logLevel: LogLevel;
    private debugMode: boolean;
    private showOutputOnError: boolean;
    private logToConsole: boolean;

    constructor(
        outputChannel: vscode.OutputChannel, 
        logLevel: LogLevel = LogLevel.INFO, 
        debugMode: boolean = false,
        showOutputOnError: boolean = true,
        logToConsole: boolean = false
    ) {
        this.outputChannel = outputChannel;
        this.logLevel = logLevel;
        this.debugMode = debugMode;
        this.showOutputOnError = showOutputOnError;
        this.logToConsole = logToConsole;
    }

    /**
     * Set the minimum log level
     */
    setLogLevel(level: LogLevel): void {
        this.logLevel = level;
        this.debug(`Log level changed to: ${LogLevel[level]}`);
    }

    /**
     * Get the current log level
     */
    getLogLevel(): LogLevel {
        return this.logLevel;
    }

    /**
     * Set debug mode
     */
    setDebugMode(enabled: boolean): void {
        this.debugMode = enabled;
        this.info(`Debug mode ${enabled ? 'enabled' : 'disabled'}`);
    }

    /**
     * Get debug mode status
     */
    isDebugMode(): boolean {
        return this.debugMode;
    }

    /**
     * Log debug message (only shown when debug mode is enabled or log level is DEBUG)
     */
    debug(message: string, ...args: any[]): void {
        if (this.debugMode || this.logLevel <= LogLevel.DEBUG) {
            this.log('DEBUG', message, ...args);
        }
    }

    /**
     * Log info message
     */
    info(message: string, ...args: any[]): void {
        if (this.logLevel <= LogLevel.INFO) {
            this.log('INFO', message, ...args);
        }
    }

    /**
     * Log warning message
     */
    warn(message: string, ...args: any[]): void {
        if (this.logLevel <= LogLevel.WARN) {
            this.log('WARN', message, ...args);
        }
    }

    /**
     * Log error message
     */
    error(message: string, error?: Error): void {
        if (this.logLevel <= LogLevel.ERROR) {
            const errorDetails = error ? `\nError: ${error.message}\nStack: ${error.stack}` : '';
            this.log('ERROR', `${message}${errorDetails}`);
            
            // Automatically show output channel on error if configured
            if (this.showOutputOnError) {
                this.show();
            }
        }
    }

    /**
     * Internal log method
     * Optimized for performance and memory efficiency
     */
    private log(level: string, message: string, ...args: any[]): void {
        // Use a more efficient timestamp format
        const timestamp = new Date().toISOString().slice(0, 19).replace('T', ' ');
        let formattedMessage = `[${timestamp}] [${level}] ${message}`;
        
        // Add arguments if present, with optimized string handling
        if (args.length > 0) {
            const argsString = args.map(arg => {
                if (typeof arg === 'object' && arg !== null) {
                    try {
                        // Use compact JSON format to reduce memory usage
                        return JSON.stringify(arg);
                    } catch {
                        return String(arg);
                    }
                }
                return String(arg);
            }).join(' ');
            formattedMessage += ` ${argsString}`;
        }
        
        // Write to output channel
        this.outputChannel.appendLine(formattedMessage);
        
        // Also log to console based on configuration (optimized conditions)
        const shouldLogToConsole = this.logToConsole || this.debugMode || level === 'ERROR' || level === 'WARN';
        if (shouldLogToConsole) {
            switch (level) {
                case 'ERROR':
                    console.error(formattedMessage);
                    break;
                case 'WARN':
                    console.warn(formattedMessage);
                    break;
                default:
                    console.log(formattedMessage);
                    break;
            }
        }
    }

    /**
     * Show the output channel
     */
    show(): void {
        this.outputChannel.show();
    }

    /**
     * Clear the output channel
     */
    clear(): void {
        this.outputChannel.clear();
        this.info('Output channel cleared');
    }

    /**
     * Log performance timing information
     */
    logTiming(operation: string, startTime: number, endTime?: number): void {
        const actualEndTime = endTime || Date.now();
        const duration = actualEndTime - startTime;
        this.debug(`Performance: ${operation} completed in ${duration}ms`);
    }

    /**
     * Log extension lifecycle events
     */
    logLifecycle(event: string, details?: any): void {
        if (details) {
            this.info(`Lifecycle: ${event}`, details);
        } else {
            this.info(`Lifecycle: ${event}`);
        }
    }

    /**
     * Log user actions for debugging
     */
    logUserAction(action: string, context?: any): void {
        if (this.debugMode) {
            if (context) {
                this.debug(`User Action: ${action}`, context);
            } else {
                this.debug(`User Action: ${action}`);
            }
        }
    }

    /**
     * Log compatibility-related information
     */
    logCompatibility(message: string, details?: any): void {
        const compatibilityMessage = `[COMPATIBILITY] ${message}`;
        if (details) {
            this.info(compatibilityMessage, details);
        } else {
            this.info(compatibilityMessage);
        }
    }

    /**
     * Update configuration settings
     */
    updateConfiguration(config: {
        showOutputOnError?: boolean;
        logToConsole?: boolean;
    }): void {
        if (config.showOutputOnError !== undefined) {
            this.showOutputOnError = config.showOutputOnError;
            this.debug(`Show output on error: ${config.showOutputOnError}`);
        }
        
        if (config.logToConsole !== undefined) {
            this.logToConsole = config.logToConsole;
            this.debug(`Log to console: ${config.logToConsole}`);
        }
    }
}