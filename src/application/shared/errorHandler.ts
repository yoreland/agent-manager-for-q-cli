import * as vscode from 'vscode';
import { ExtensionLogger } from './logger';
import { ISafeExtensionContext, IDEType } from './compatibilityService';
import { ValidationResult } from '../../shared/types/validation';

/**
 * File system error types
 */
export enum FileSystemErrorType {
    PERMISSION_DENIED = 'EACCES',
    FILE_NOT_FOUND = 'ENOENT',
    DISK_FULL = 'ENOSPC',
    FILE_EXISTS = 'EEXIST',
    INVALID_PATH = 'EINVAL',
    NETWORK_ERROR = 'ENETWORK',
    UNKNOWN = 'UNKNOWN'
}

/**
 * Agent related error types
 */
export enum AgentErrorType {
    VALIDATION_FAILED = 'VALIDATION_FAILED',
    NAME_ALREADY_EXISTS = 'NAME_ALREADY_EXISTS',
    INVALID_CONFIG = 'INVALID_CONFIG',
    TEMPLATE_ERROR = 'TEMPLATE_ERROR',
    FILE_SYSTEM_ERROR = 'FILE_SYSTEM_ERROR'
}

/**
 * Error handler interface
 */
export interface IErrorHandler {
    handleActivationError(error: Error, context: ISafeExtensionContext): void;
    logCompatibilityIssue(issue: string, context: ISafeExtensionContext): void;
    
    // Agent related error handling
    handleAgentCreationError(error: Error, agentName?: string): Promise<void>;
    handleFileSystemError(error: Error, operation: string, filePath?: string): Promise<void>;
    handleValidationError(validation: ValidationResult, context?: string): Promise<void>;
    handleFileAccessError(error: Error, filePath: string): Promise<void>;
    
    // User feedback
    showSuccessMessage(message: string, actions?: string[]): Promise<string | undefined>;
    showErrorMessage(message: string, error?: Error, actions?: string[]): Promise<string | undefined>;
    showWarningMessage(message: string, actions?: string[]): Promise<string | undefined>;
    
    // Error analysis
    categorizeError(error: Error): FileSystemErrorType | AgentErrorType;
    getErrorSuggestions(error: Error, context?: string): string[];
    isRecoverableError(error: Error): boolean;
}

/**
 * Comprehensive error handling service
 * Handles errors from agent management, file system, validation, etc. and provides user feedback
 */
export class ErrorHandler implements IErrorHandler {
    private readonly logger: ExtensionLogger;

    constructor(logger: ExtensionLogger) {
        this.logger = logger;
    }

    /**
     * Handle extension activation errors
     */
    public handleActivationError(error: Error, context: ISafeExtensionContext): void {
        const errorMessage = `Extension activation failed on ${context.ideType} IDE`;
        
        this.logger.error(errorMessage, error);
        this.logger.logCompatibility(`Activation error details`, {
            ideType: context.ideType,
            errorName: error.name,
            errorMessage: error.message,
            stack: error.stack
        });

        // IDE-specific error messages
        let userMessage = 'Unable to activate Agent Manager for Q CLI extension.';
        
        switch (context.ideType) {
            case IDEType.Kiro:
                userMessage += ' This may be a Kiro IDE compatibility issue. Please ensure you are using the latest version.';
                break;
            case IDEType.VSCode:
                userMessage += ' Try restarting VS Code or reinstalling the extension.';
                break;
            default:
                userMessage += ' This may be an unsupported IDE or compatibility issue.';
                break;
        }

        vscode.window.showErrorMessage(userMessage, 'Show Details').then(selection => {
            if (selection === 'Show Details') {
                this.showDetailedError(error, context);
            }
        });
    }

    // Webview creation error handler removed - using tree view only

    /**
     * Log compatibility issues
     */
    public logCompatibilityIssue(issue: string, context: ISafeExtensionContext): void {
        this.logger.logCompatibility(`Compatibility issue detected: ${issue}`, {
            ideType: context.ideType,
            extensionUri: context.extensionUri.toString(),
            extensionPath: context.extensionPath
        });
    }

    /**
     * Show detailed error information
     */
    private showDetailedError(error: Error, context: ISafeExtensionContext): void {
        const errorDetails = [
            `Error Name: ${error.name}`,
            `Error Message: ${error.message}`,
            `IDE Type: ${context.ideType}`,
            `Extension URI: ${context.extensionUri.toString()}`,
            `Extension Path: ${context.extensionPath}`,
            '',
            'Stack Trace:',
            error.stack || 'Stack trace not available.'
        ].join('\n');

        // Display error information in a new document
        vscode.workspace.openTextDocument({
            content: errorDetails,
            language: 'plaintext'
        }).then(doc => {
            vscode.window.showTextDocument(doc);
        });
    }

    // Error action handler removed - no longer needed without webview

    /**
     * Handle agent creation errors
     */
    public async handleAgentCreationError(error: Error, agentName?: string): Promise<void> {
        const errorType = this.categorizeError(error);
        const context = agentName ? `agent '${agentName}'` : 'agent';
        
        this.logger.error(`Agent creation failed for ${context}`, error);
        
        let userMessage = `Failed to create agent`;
        if (agentName) {
            userMessage += ` (${agentName})`;
        }
        
        const suggestions = this.getErrorSuggestions(error, 'agent_creation');
        
        switch (errorType) {
            case AgentErrorType.NAME_ALREADY_EXISTS:
                userMessage = `Agent '${agentName}' already exists. Please use a different name.`;
                await this.showErrorMessage(userMessage);
                break;
                
            case AgentErrorType.VALIDATION_FAILED:
                userMessage += ': The entered information is not valid.';
                await this.showErrorMessage(userMessage, error, suggestions);
                break;
                
            case FileSystemErrorType.PERMISSION_DENIED:
                userMessage += ': Permission denied to create file.';
                await this.showErrorMessage(userMessage, error, [
                    'Check folder permissions',
                    'Run as administrator',
                    'Try in a different location'
                ]);
                break;
                
            case FileSystemErrorType.DISK_FULL:
                userMessage += ': Insufficient disk space.';
                await this.showErrorMessage(userMessage, error, [
                    'Clean up disk space',
                    'Use a different drive'
                ]);
                break;
                
            default:
                await this.showErrorMessage(userMessage, error, suggestions);
                break;
        }
    }

    /**
     * Handle file system errors
     */
    public async handleFileSystemError(error: Error, operation: string, filePath?: string): Promise<void> {
        const errorType = this.categorizeError(error);
        const context = filePath ? ` (${filePath})` : '';
        
        this.logger.error(`File system error during ${operation}${context}`, error);
        
        let userMessage = `File system operation failed: ${operation}`;
        const suggestions: string[] = [];
        
        switch (errorType) {
            case FileSystemErrorType.PERMISSION_DENIED:
                userMessage = `Permission denied for ${operation} operation${context}`;
                suggestions.push('Check file/folder permissions');
                suggestions.push('Run VS Code as administrator');
                if (filePath) {
                    suggestions.push('Check if file is being used by another program');
                }
                break;
                
            case FileSystemErrorType.FILE_NOT_FOUND:
                userMessage = `File or folder not found${context}`;
                suggestions.push('Check if the path is correct');
                suggestions.push('Check if file was deleted or moved');
                break;
                
            case FileSystemErrorType.DISK_FULL:
                userMessage = `Cannot complete ${operation} operation due to insufficient disk space`;
                suggestions.push('Perform disk cleanup');
                suggestions.push('Delete unnecessary files');
                suggestions.push('Use a different drive');
                break;
                
            case FileSystemErrorType.FILE_EXISTS:
                userMessage = `Cannot complete ${operation} operation because file already exists${context}`;
                suggestions.push('Use a different name');
                suggestions.push('Delete or move existing file');
                break;
                
            case FileSystemErrorType.INVALID_PATH:
                userMessage = `Cannot perform ${operation} operation due to invalid path${context}`;
                suggestions.push('Check if path contains special characters');
                suggestions.push('Check if path is too long');
                break;
                
            default:
                userMessage += context;
                suggestions.push('Try again later');
                suggestions.push('Restart VS Code');
                break;
        }
        
        await this.showErrorMessage(userMessage, error, suggestions);
    }

    /**
     * Handle validation errors
     */
    public async handleValidationError(validation: ValidationResult, context?: string): Promise<void> {
        if (validation.isValid) {
            return;
        }
        
        const contextStr = context ? ` (${context})` : '';
        this.logger.warn(`Validation failed${contextStr}`, { errors: validation.errors, warnings: validation.warnings });
        
        let message = 'The entered information is not valid';
        if (context) {
            message += ` - ${context}`;
        }
        
        // Generate specific error message
        if (validation.errors.length === 1 && validation.errors[0]) {
            message = validation.errors[0];
        } else if (validation.errors.length > 1) {
            message += ':\n' + validation.errors.map(error => `• ${error}`).join('\n');
        }
        
        // Handle warnings separately
        if (validation.warnings && validation.warnings.length > 0) {
            const warningMessage = 'Please check the following:\n' + 
                validation.warnings.map(warning => `• ${warning}`).join('\n');
            await this.showWarningMessage(warningMessage);
        }
        
        await this.showErrorMessage(message);
    }

    /**
     * Handle file access errors (opening agent files, etc.)
     */
    public async handleFileAccessError(error: Error, filePath: string): Promise<void> {
        const errorType = this.categorizeError(error);
        
        this.logger.error(`File access error for ${filePath}`, error);
        
        let userMessage = `Cannot access file: ${filePath}`;
        const suggestions: string[] = [];
        
        switch (errorType) {
            case FileSystemErrorType.FILE_NOT_FOUND:
                userMessage = `File not found: ${filePath}`;
                suggestions.push('Check if file was deleted or moved');
                suggestions.push('Refresh agent list');
                suggestions.push('Recreate the agent');
                break;
                
            case FileSystemErrorType.PERMISSION_DENIED:
                userMessage = `Permission denied to access file: ${filePath}`;
                suggestions.push('Check file permissions');
                suggestions.push('Run VS Code as administrator');
                suggestions.push('Check if file is being used by another program');
                break;
                
            default:
                suggestions.push('Check if file path is correct');
                suggestions.push('Try again later');
                suggestions.push('Restart VS Code');
                break;
        }
        
        await this.showErrorMessage(userMessage, error, suggestions);
    }

    /**
     * Show success message
     */
    public async showSuccessMessage(message: string, actions?: string[]): Promise<string | undefined> {
        this.logger.info(`Success: ${message}`);
        
        if (actions && actions.length > 0) {
            return await vscode.window.showInformationMessage(message, ...actions);
        } else {
            await vscode.window.showInformationMessage(message);
            return undefined;
        }
    }

    /**
     * Show error message
     */
    public async showErrorMessage(message: string, error?: Error, actions?: string[]): Promise<string | undefined> {
        this.logger.error(`Error shown to user: ${message}`, error);
        
        if (actions && actions.length > 0) {
            return await vscode.window.showErrorMessage(message, ...actions);
        } else {
            await vscode.window.showErrorMessage(message);
            return undefined;
        }
    }

    /**
     * Show warning message
     */
    public async showWarningMessage(message: string, actions?: string[]): Promise<string | undefined> {
        this.logger.warn(`Warning shown to user: ${message}`);
        
        if (actions && actions.length > 0) {
            return await vscode.window.showWarningMessage(message, ...actions);
        } else {
            await vscode.window.showWarningMessage(message);
            return undefined;
        }
    }

    /**
     * Categorize errors
     */
    public categorizeError(error: Error): FileSystemErrorType | AgentErrorType {
        const errorCode = (error as NodeJS.ErrnoException).code;
        const errorMessage = error.message.toLowerCase();
        
        // File system error classification
        switch (errorCode) {
            case 'EACCES':
            case 'EPERM':
                return FileSystemErrorType.PERMISSION_DENIED;
            case 'ENOENT':
                return FileSystemErrorType.FILE_NOT_FOUND;
            case 'ENOSPC':
                return FileSystemErrorType.DISK_FULL;
            case 'EEXIST':
                return FileSystemErrorType.FILE_EXISTS;
            case 'EINVAL':
                return FileSystemErrorType.INVALID_PATH;
        }
        
        // Agent related error classification
        if (errorMessage.includes('already exists')) {
            return AgentErrorType.NAME_ALREADY_EXISTS;
        }
        
        if (errorMessage.includes('invalid') && (
            errorMessage.includes('name') || 
            errorMessage.includes('validation') ||
            errorMessage.includes('config')
        )) {
            return AgentErrorType.VALIDATION_FAILED;
        }
        
        if (errorMessage.includes('json') || errorMessage.includes('parse')) {
            return AgentErrorType.INVALID_CONFIG;
        }
        
        if (errorMessage.includes('template')) {
            return AgentErrorType.TEMPLATE_ERROR;
        }
        
        // Check file system related keywords
        if (errorMessage.includes('permission') || errorMessage.includes('access')) {
            return FileSystemErrorType.PERMISSION_DENIED;
        }
        
        if (errorMessage.includes('not found') || errorMessage.includes('no such file')) {
            return FileSystemErrorType.FILE_NOT_FOUND;
        }
        
        if (errorMessage.includes('space') || errorMessage.includes('disk full')) {
            return FileSystemErrorType.DISK_FULL;
        }
        
        return FileSystemErrorType.UNKNOWN;
    }

    /**
     * Generate error resolution suggestions
     */
    public getErrorSuggestions(error: Error, context?: string): string[] {
        const errorType = this.categorizeError(error);
        const suggestions: string[] = [];
        
        switch (errorType) {
            case FileSystemErrorType.PERMISSION_DENIED:
                suggestions.push('Run VS Code as administrator');
                suggestions.push('Check file/folder permissions');
                suggestions.push('Check antivirus software');
                break;
                
            case FileSystemErrorType.DISK_FULL:
                suggestions.push('Perform disk cleanup');
                suggestions.push('Delete temporary files');
                suggestions.push('Use a different drive');
                break;
                
            case FileSystemErrorType.FILE_NOT_FOUND:
                suggestions.push('Check path');
                suggestions.push('Check if file exists');
                suggestions.push('Refresh workspace');
                break;
                
            case AgentErrorType.VALIDATION_FAILED:
                suggestions.push('Check input format');
                suggestions.push('Check special character restrictions');
                suggestions.push('Check length restrictions');
                break;
                
            case AgentErrorType.NAME_ALREADY_EXISTS:
                suggestions.push('Use a different name');
                suggestions.push('Check existing agents');
                break;
                
            case AgentErrorType.INVALID_CONFIG:
                suggestions.push('Check JSON format');
                suggestions.push('Check required fields');
                suggestions.push('Validate schema');
                break;
                
            default:
                suggestions.push('Try again later');
                suggestions.push('Restart VS Code');
                suggestions.push('Reinstall extension');
                break;
        }
        
        // Context-specific additional suggestions
        if (context === 'agent_creation') {
            suggestions.push('Check agent name rules');
            suggestions.push('Check .amazonq/cli-agents/ folder permissions');
        }
        
        return suggestions;
    }

    /**
     * Check if error is recoverable
     */
    public isRecoverableError(error: Error): boolean {
        const errorType = this.categorizeError(error);
        
        const recoverableTypes = [
            FileSystemErrorType.FILE_NOT_FOUND,
            FileSystemErrorType.INVALID_PATH,
            AgentErrorType.VALIDATION_FAILED,
            AgentErrorType.NAME_ALREADY_EXISTS,
            AgentErrorType.INVALID_CONFIG
        ];
        
        return recoverableTypes.includes(errorType as any);
    }

    /**
     * Generate recovery suggestions for errors (maintaining backward compatibility)
     */
    public getRecoverySuggestions(error: Error, context: ISafeExtensionContext): string[] {
        const suggestions: string[] = [];

        if (error.message.includes('tree view')) {
            suggestions.push('Check Agent Manager for Q CLI icon in Activity Bar');
            suggestions.push('Restart IDE and try again');
        }

        if (error.message.includes('extension')) {
            suggestions.push('Reinstall extension');
            suggestions.push('Check VS Code/Kiro IDE updates');
        }

        if (context.ideType === IDEType.Kiro) {
            suggestions.push('Run in Kiro IDE compatibility mode');
            suggestions.push('Test in VS Code');
        }

        return suggestions;
    }
}