/**
 * @fileoverview Core extension type definitions and interfaces.
 * 
 * This module defines fundamental types, interfaces, and enums used
 * throughout the Agent Manager extension including logging, state
 * management, and extension lifecycle types.
 * 
 * @author Agent Manager for Q CLI Extension
 * @since 0.1.0
 */

import * as vscode from 'vscode';
import { ContextItem } from './context';

/**
 * Enumeration of log levels for extension logging.
 * 
 * Defines the severity levels for log messages with numeric values
 * for easy comparison and filtering.
 * 
 * @enum {number}
 */
export enum LogLevel {
    /** Debug level - verbose logging for development */
    DEBUG = 0,
    /** Info level - general information messages */
    INFO = 1,
    /** Warning level - potential issues that don't break functionality */
    WARN = 2,
    /** Error level - serious issues that may break functionality */
    ERROR = 3
}

/**
 * Logger interface for extension logging operations.
 * 
 * Defines the contract for logging services throughout the extension
 * with support for different log levels and structured messaging.
 * 
 * @interface Logger
 */
export interface Logger {
    /** Logs debug messages (only displayed in debug mode) */
    debug(message: string, ...args: any[]): void;
    
    /** Logs informational messages for general operation tracking */
    info(message: string, ...args: any[]): void;
    
    /** Logs warning messages for potential issues */
    warn(message: string, ...args: any[]): void;
    
    /** Logs error messages with optional error object for debugging */
    error(message: string, error?: Error): void;
    
    /** Sets the current minimum log level for filtering */
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
    
    /** Agent tree provider for Activity Bar integration */
    agentTreeProvider?: any; // Using any to avoid circular dependency
    
    /** Context resource service for file management */
    contextResourceService?: any; // Using any to avoid circular dependency
}

/**
 * Extension configuration constants
 */
export const EXTENSION_CONSTANTS = {
    /** Extension identifier */
    EXTENSION_ID: 'qcli-context-manager',
    
    /** Output channel name */
    OUTPUT_CHANNEL_NAME: 'Agent Manager for Q CLI',
    
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
    /** Open Agent Manager command */
    OPEN_CONTEXT_MANAGER: `${EXTENSION_CONSTANTS.COMMAND_PREFIX}.openAgentManager`,
    
    /** Refresh context command */
    REFRESH_CONTEXT: `${EXTENSION_CONSTANTS.COMMAND_PREFIX}.refreshContext`
} as const;