import { ExtensionError, ErrorCategory } from './extensionError';
import { Result, ResultBuilder } from './result';

/**
 * Recovery action that can be taken for an error
 */
export interface RecoveryAction {
    readonly name: string;
    readonly description: string;
    readonly execute: () => Promise<Result<void>>;
}

/**
 * Recovery strategy for handling specific types of errors
 */
export interface RecoveryStrategy {
    canHandle(error: ExtensionError): boolean;
    getRecoveryActions(error: ExtensionError): RecoveryAction[];
}

/**
 * Error recovery strategies for common failure scenarios
 */
export class ErrorRecoveryStrategy {
    /**
     * Handles file system errors with appropriate recovery actions
     */
    static async handleFileSystemError(error: ExtensionError): Promise<Result<void>> {
        const { operation, resource } = error.context;
        const cause = error.cause;

        // Handle file not found errors
        if (cause?.message.includes('ENOENT')) {
            return await this.handleFileNotFound(operation, resource || '');
        }

        // Handle permission errors
        if (cause?.message.includes('EACCES')) {
            return await this.handlePermissionDenied(operation, resource || '');
        }

        // Handle directory/file type mismatches
        if (cause?.message.includes('EISDIR') || cause?.message.includes('ENOTDIR')) {
            return await this.handleTypeMismatch(operation, resource || '');
        }

        return ResultBuilder.failure(error);
    }

    /**
     * Handles validation errors with correction suggestions
     */
    static async handleValidationError(error: ExtensionError): Promise<Result<void>> {
        const { resource, metadata } = error.context;

        // For agent name validation
        if (resource === 'agentName') {
            return await this.handleAgentNameValidation(metadata?.['value']);
        }

        // For file path validation
        if (resource === 'filePath') {
            return await this.handleFilePathValidation(metadata?.['value']);
        }

        // For configuration validation
        if (resource?.includes('config')) {
            return await this.handleConfigurationValidation(error);
        }

        return ResultBuilder.failure(error);
    }

    /**
     * Handles configuration errors with repair attempts
     */
    static async handleConfigurationError(error: ExtensionError): Promise<Result<void>> {
        const { resource, metadata } = error.context;

        // Handle JSON parsing errors
        if (error.message.includes('JSON')) {
            return await this.handleJsonParsingError(resource || '', metadata);
        }

        // Handle missing configuration files
        if (error.message.includes('not found')) {
            return await this.handleMissingConfigFile(resource || '');
        }

        // Handle invalid configuration schema
        if (error.message.includes('schema') || error.message.includes('invalid')) {
            return await this.handleInvalidConfigSchema(resource || '', metadata);
        }

        return ResultBuilder.failure(error);
    }

    /**
     * Handles user input errors with guidance
     */
    static async handleUserInputError(error: ExtensionError): Promise<Result<void>> {
        const { resource } = error.context;

        // Provide specific guidance based on input type
        switch (resource) {
            case 'agentName':
                return ResultBuilder.fromMessage(
                    'Agent name must contain only letters, numbers, hyphens, and underscores. Please try again.'
                );
            case 'filePath':
                return ResultBuilder.fromMessage(
                    'Please provide a valid file path. Use absolute paths or paths relative to the workspace.'
                );
            case 'directoryPath':
                return ResultBuilder.fromMessage(
                    'Please provide a valid directory path that exists in your workspace.'
                );
            default:
                return ResultBuilder.failure(error);
        }
    }

    private static async handleFileNotFound(operation: string, filePath: string): Promise<Result<void>> {
        // Suggest creating the file if it's a write operation
        if (operation.includes('write') || operation.includes('create')) {
            return ResultBuilder.success(undefined);
        }

        return ResultBuilder.fromMessage(
            `File not found: ${filePath}. Please check if the file exists or create it first.`
        );
    }

    private static async handlePermissionDenied(operation: string, filePath: string): Promise<Result<void>> {
        return ResultBuilder.fromMessage(
            `Permission denied for ${operation} on ${filePath}. Please check file permissions or run VS Code with appropriate privileges.`
        );
    }

    private static async handleTypeMismatch(operation: string, path: string): Promise<Result<void>> {
        return ResultBuilder.fromMessage(
            `Type mismatch for ${operation} on ${path}. Please check if you're trying to perform a file operation on a directory or vice versa.`
        );
    }

    private static async handleAgentNameValidation(value: any): Promise<Result<void>> {
        if (typeof value !== 'string') {
            return ResultBuilder.fromMessage('Agent name must be a string.');
        }

        const suggestions: string[] = [];
        
        if (value.length === 0) {
            suggestions.push('Agent name cannot be empty');
        }
        
        if (value.length > 50) {
            suggestions.push('Agent name should be 50 characters or less');
        }
        
        if (!/^[a-zA-Z0-9_-]+$/.test(value)) {
            suggestions.push('Agent name can only contain letters, numbers, hyphens, and underscores');
        }

        if (suggestions.length > 0) {
            return ResultBuilder.fromMessage(`Invalid agent name: ${suggestions.join(', ')}`);
        }

        return ResultBuilder.success(undefined);
    }

    private static async handleFilePathValidation(value: any): Promise<Result<void>> {
        if (typeof value !== 'string') {
            return ResultBuilder.fromMessage('File path must be a string.');
        }

        if (value.length === 0) {
            return ResultBuilder.fromMessage('File path cannot be empty.');
        }

        // Check for invalid characters
        const invalidChars = /[<>:"|?*]/;
        if (invalidChars.test(value)) {
            return ResultBuilder.fromMessage('File path contains invalid characters.');
        }

        return ResultBuilder.success(undefined);
    }

    private static async handleConfigurationValidation(error: ExtensionError): Promise<Result<void>> {
        const { metadata } = error.context;
        
        if (metadata?.['errors'] && Array.isArray(metadata['errors'])) {
            const suggestions = metadata['errors'].map((err: string) => `• ${err}`).join('\n');
            return ResultBuilder.fromMessage(`Configuration validation failed:\n${suggestions}`);
        }

        return ResultBuilder.fromMessage('Configuration validation failed. Please check your configuration format.');
    }

    private static async handleJsonParsingError(filePath: string, metadata?: Record<string, any>): Promise<Result<void>> {
        const line = metadata?.['line'] ? ` at line ${metadata['line']}` : '';
        return ResultBuilder.fromMessage(
            `Invalid JSON in ${filePath}${line}. Please check for missing commas, brackets, or quotes.`
        );
    }

    private static async handleMissingConfigFile(filePath: string): Promise<Result<void>> {
        return ResultBuilder.fromMessage(
            `Configuration file not found: ${filePath}. The file will be created when you save your first agent configuration.`
        );
    }

    private static async handleInvalidConfigSchema(filePath: string, metadata?: Record<string, any>): Promise<Result<void>> {
        const field = metadata?.['field'] ? ` (field: ${metadata['field']})` : '';
        return ResultBuilder.fromMessage(
            `Invalid configuration schema in ${filePath}${field}. Please check the configuration format against the expected schema.`
        );
    }
}

/**
 * File system recovery strategy
 */
export class FileSystemRecoveryStrategy implements RecoveryStrategy {
    canHandle(error: ExtensionError): boolean {
        return error.category === ErrorCategory.FILE_SYSTEM;
    }

    getRecoveryActions(error: ExtensionError): RecoveryAction[] {
        const actions: RecoveryAction[] = [];
        const { resource } = error.context;
        const cause = error.cause;

        if (cause?.message.includes('ENOENT')) {
            actions.push({
                name: 'Create File',
                description: `Create the missing file: ${resource}`,
                execute: async () => {
                    // This would be implemented by the calling service
                    return ResultBuilder.success(undefined);
                }
            });
        }

        if (cause?.message.includes('EACCES')) {
            actions.push({
                name: 'Check Permissions',
                description: 'Open file location to check permissions',
                execute: async () => {
                    // This would open the file location in the system file manager
                    return ResultBuilder.success(undefined);
                }
            });
        }

        return actions;
    }
}

/**
 * Configuration recovery strategy
 */
export class ConfigurationRecoveryStrategy implements RecoveryStrategy {
    canHandle(error: ExtensionError): boolean {
        return error.category === ErrorCategory.CONFIGURATION;
    }

    getRecoveryActions(error: ExtensionError): RecoveryAction[] {
        const actions: RecoveryAction[] = [];
        const { resource } = error.context;

        if (error.message.includes('JSON')) {
            actions.push({
                name: 'Validate JSON',
                description: 'Open JSON validator to check syntax',
                execute: async () => {
                    // This would open a JSON validator or show syntax errors
                    return ResultBuilder.success(undefined);
                }
            });
        }

        actions.push({
            name: 'Reset Configuration',
            description: `Reset ${resource} to default values`,
            execute: async () => {
                // This would reset the configuration to defaults
                return ResultBuilder.success(undefined);
            }
        });

        return actions;
    }
}

/**
 * Validation recovery strategy
 */
export class ValidationRecoveryStrategy implements RecoveryStrategy {
    canHandle(error: ExtensionError): boolean {
        return error.category === ErrorCategory.VALIDATION;
    }

    getRecoveryActions(error: ExtensionError): RecoveryAction[] {
        const actions: RecoveryAction[] = [];
        const { resource } = error.context;

        actions.push({
            name: 'Show Examples',
            description: `Show valid examples for ${resource}`,
            execute: async () => {
                // This would show examples of valid input
                return ResultBuilder.success(undefined);
            }
        });

        return actions;
    }
}