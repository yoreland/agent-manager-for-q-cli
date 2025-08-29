import * as vscode from 'vscode';
import { ContextItem } from './context';

/**
 * Log levels for the extension logger
 */
export enum LogLevel {
    DEBUG = 0,
    INFO = 1,
    WARN = 2,
    ERROR = 3
}

/**
 * Logger interface for extension logging
 */
export interface Logger {
    /** Log debug message (only in debug mode) */
    debug(message: string, ...args: any[]): void;
    
    /** Log informational message */
    info(message: string, ...args: any[]): void;
    
    /** Log warning message */
    warn(message: string, ...args: any[]): void;
    
    /** Log error message with optional error object */
    error(message: string, error?: Error): void;
    
    /** Set the current log level */
    setLogLevel(level: LogLevel): void;
    
    /** Get the current log level */
    getLogLevel(): LogLevel;
    
    /** Set debug mode */
    setDebugMode(enabled: boolean): void;
    
    /** Get debug mode status */
    isDebugMode(): boolean;
    
    /** Show the output channel */
    show(): void;
    
    /** Clear the output channel */
    clear(): void;
    
    /** Log performance timing information */
    logTiming(operation: string, startTime: number, endTime?: number): void;
    
    /** Log extension lifecycle events */
    logLifecycle(event: string, details?: any): void;
    
    /** Log user actions for debugging */
    logUserAction(action: string, context?: any): void;
}

/**
 * Global state for the extension
 */
export interface ExtensionState {
    /** Whether the extension has been successfully activated */
    isActivated: boolean;
    
    /** Current context items displayed in the tree view */
    contextItems: ContextItem[];
    
    /** VS Code output channel for logging */
    outputChannel: vscode.OutputChannel;
    
    /** Extension logger instance */
    logger: Logger;
    
    /** Extension context from VS Code */
    extensionContext: vscode.ExtensionContext;
    
    /** Whether debug mode is enabled */
    debugMode: boolean;
    
    /** Context tree provider for Activity Bar integration */
    contextTreeProvider?: any; // Using any to avoid circular dependency
}

/**
 * Extension configuration constants
 */
export const EXTENSION_CONSTANTS = {
    /** Extension identifier */
    EXTENSION_ID: 'qcli-context-manager',
    
    /** Output channel name */
    OUTPUT_CHANNEL_NAME: 'Q CLI Context Manager',
    
    /** Command prefix */
    COMMAND_PREFIX: 'qcli-context',
    
    /** View container ID */
    VIEW_CONTAINER_ID: 'qcli-context-view',
    
    /** Tree view ID */
    TREE_VIEW_ID: 'qcli-context-tree',
    
    /** Maximum activation time in milliseconds */
    MAX_ACTIVATION_TIME: 100
} as const;

/**
 * Extension commands
 */
export const EXTENSION_COMMANDS = {
    /** Open Context Manager command */
    OPEN_CONTEXT_MANAGER: `${EXTENSION_CONSTANTS.COMMAND_PREFIX}.openContextManager`,
    
    /** Refresh context command */
    REFRESH_CONTEXT: `${EXTENSION_CONSTANTS.COMMAND_PREFIX}.refreshContext`
} as const;