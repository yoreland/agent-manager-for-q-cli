import { ExtensionError, ErrorCategory, ErrorContext } from './extensionError';

/**
 * Interface for logging service
 */
export interface ILogger {
    error(message: string, error?: Error): void;
    warn(message: string): void;
    info(message: string): void;
    debug(message: string): void;
}

/**
 * Interface for VS Code adapter
 */
export interface IVSCodeAdapter {
    showErrorMessage(message: string, ...items: string[]): Promise<string | undefined>;
    showWarningMessage(message: string, ...items: string[]): Promise<string | undefined>;
    showInformationMessage(message: string, ...items: string[]): Promise<string | undefined>;
}

/**
 * Interface for error handling service
 */
export interface IErrorHandler {
    handleError(error: Error, context?: ErrorContext): Promise<void>;
    handleFileSystemError(error: Error, operation: string, path: string): Promise<void>;
    handleValidationError(errors: string[], context: string): Promise<void>;
    handleUserInputError(error: Error, inputType: string): Promise<void>;
    createUserFriendlyMessage(error: ExtensionError): string;
}

/**
 * Enhanced error handler with contextual error messages and recovery strategies
 */
export class ErrorHandler implements IErrorHandler {
    constructor(
        private logger: ILogger,
        private vscodeAdapter: IVSCodeAdapter
    ) {}

    /**
     * Main error handling method that processes any error
     */
    async handleError(error: Error, context?: ErrorContext): Promise<void> {
        let extensionError: ExtensionError;

        if (error instanceof ExtensionError) {
            extensionError = error;
        } else {
            // Convert generic error to ExtensionError
            extensionError = ExtensionError.fromError(
                error,
                this.categorizeError(error),
                context || new ErrorContext('unknown')
            );
        }

        // Log the error with full context
        this.logger.error('Extension error occurred', extensionError);

        // Show user-friendly message
        const userMessage = this.createUserFriendlyMessage(extensionError);
        
        if (extensionError.recoverable) {
            await this.vscodeAdapter.showWarningMessage(userMessage, 'Retry', 'Ignore');
        } else {
            await this.vscodeAdapter.showErrorMessage(userMessage, 'OK');
        }
    }

    /**
     * Handles file system specific errors
     */
    async handleFileSystemError(error: Error, operation: string, path: string): Promise<void> {
        const extensionError = ExtensionError.fileSystem(
            `Failed to ${operation}: ${error.message}`,
            operation,
            path,
            error
        );

        await this.handleError(extensionError);
    }

    /**
     * Handles validation errors with multiple error messages
     */
    async handleValidationError(errors: string[], context: string): Promise<void> {
        const message = `Validation failed for ${context}: ${errors.join(', ')}`;
        const extensionError = ExtensionError.validation(
            message,
            context,
            { errors }
        );

        await this.handleError(extensionError);
    }

    /**
     * Handles user input errors
     */
    async handleUserInputError(error: Error, inputType: string): Promise<void> {
        const extensionError = ExtensionError.userInput(
            `Invalid ${inputType}: ${error.message}`,
            inputType,
            undefined,
            error
        );

        await this.handleError(extensionError);
    }

    /**
     * Creates user-friendly error messages based on error category and context
     */
    createUserFriendlyMessage(error: ExtensionError): string {
        switch (error.category) {
            case ErrorCategory.FILE_SYSTEM:
                return this.createFileSystemMessage(error);
            case ErrorCategory.VALIDATION:
                return this.createValidationMessage(error);
            case ErrorCategory.PERMISSION:
                return this.createPermissionMessage(error);
            case ErrorCategory.CONFIGURATION:
                return this.createConfigurationMessage(error);
            case ErrorCategory.USER_INPUT:
                return this.createUserInputMessage(error);
            case ErrorCategory.NETWORK:
                return this.createNetworkMessage(error);
            case ErrorCategory.SYSTEM:
                return this.createSystemMessage(error);
            default:
                return `An unexpected error occurred: ${error.message}`;
        }
    }

    /**
     * Categorizes generic errors into appropriate categories
     */
    private categorizeError(error: Error): ErrorCategory {
        const message = error.message.toLowerCase();

        if (message.includes('enoent') || message.includes('file not found')) {
            return ErrorCategory.FILE_SYSTEM;
        }
        if (message.includes('eacces') || message.includes('permission denied')) {
            return ErrorCategory.PERMISSION;
        }
        if (message.includes('invalid') || message.includes('validation')) {
            return ErrorCategory.VALIDATION;
        }
        if (message.includes('network') || message.includes('timeout')) {
            return ErrorCategory.NETWORK;
        }
        if (message.includes('config')) {
            return ErrorCategory.CONFIGURATION;
        }

        return ErrorCategory.SYSTEM;
    }

    private createFileSystemMessage(error: ExtensionError): string {
        const { operation, resource } = error.context;
        const cause = error.cause;

        if (cause?.message.includes('ENOENT')) {
            return `File not found: ${resource}. Please check if the file exists and try again.`;
        }
        if (cause?.message.includes('EACCES')) {
            return `Permission denied: ${resource}. Please check file permissions and try again.`;
        }
        if (cause?.message.includes('EISDIR')) {
            return `Expected a file but found a directory: ${resource}`;
        }
        if (cause?.message.includes('ENOTDIR')) {
            return `Expected a directory but found a file: ${resource}`;
        }

        return `Failed to ${operation} "${resource}": ${error.message}. Please check the file path and permissions.`;
    }

    private createValidationMessage(error: ExtensionError): string {
        const { resource, metadata } = error.context;
        
        if (metadata?.['errors'] && Array.isArray(metadata['errors'])) {
            return `Validation failed for ${resource}:\n• ${metadata['errors'].join('\n• ')}`;
        }

        return `Invalid ${resource}: ${error.message}. Please check your input and try again.`;
    }

    private createPermissionMessage(error: ExtensionError): string {
        const { operation, resource } = error.context;
        
        return `Permission denied while trying to ${operation} "${resource}". Please check your file permissions or run VS Code with appropriate privileges.`;
    }

    private createConfigurationMessage(error: ExtensionError): string {
        const { resource } = error.context;
        
        return `Configuration error in ${resource}: ${error.message}. Please check your configuration file format and values.`;
    }

    private createUserInputMessage(error: ExtensionError): string {
        const { resource } = error.context;
        
        return `Invalid ${resource}: ${error.message}. Please provide a valid value and try again.`;
    }

    private createNetworkMessage(error: ExtensionError): string {
        return `Network error: ${error.message}. Please check your internet connection and try again.`;
    }

    private createSystemMessage(error: ExtensionError): string {
        return `System error: ${error.message}. Please try again or restart VS Code if the problem persists.`;
    }
}

/**
 * Error message builder utility for creating consistent error messages
 */
export class ErrorMessageBuilder {
    /**
     * Builds a file system error message
     */
    static buildFileSystemErrorMessage(error: Error, operation: string, path: string): string {
        if (error.message.includes('ENOENT')) {
            return `File not found: ${path}. Please check if the file exists and try again.`;
        }
        if (error.message.includes('EACCES')) {
            return `Permission denied: ${path}. Please check file permissions.`;
        }
        if (error.message.includes('EISDIR')) {
            return `Expected a file but found a directory: ${path}`;
        }
        return `Failed to ${operation}: ${error.message}`;
    }

    /**
     * Builds a validation error message
     */
    static buildValidationErrorMessage(field: string, value: any, constraint: string): string {
        return `Invalid ${field}: "${value}" ${constraint}`;
    }

    /**
     * Builds a configuration error message
     */
    static buildConfigurationErrorMessage(configFile: string, issue: string): string {
        return `Configuration error in ${configFile}: ${issue}`;
    }
}