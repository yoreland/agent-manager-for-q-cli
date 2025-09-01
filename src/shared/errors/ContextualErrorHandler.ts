import { ExtensionError, ErrorCategory, ErrorContext } from './extensionError';
import { ErrorRecoveryManager } from './ErrorRecoveryManager';
import { ILogger } from '../infrastructure/ILogger';
import { IVSCodeAdapter } from '../infrastructure/IVSCodeAdapter';
import { Result, success, failure } from './result';

export class ContextualErrorHandler {
    constructor(
        private recoveryManager: ErrorRecoveryManager,
        private logger: ILogger,
        private vscodeAdapter: IVSCodeAdapter
    ) {}

    async handleFileSystemError(
        error: Error, 
        operation: string, 
        path: string
    ): Promise<Result<void>> {
        const context = new ErrorContext(operation, path, { 
            errorCode: (error as any).code,
            errno: (error as any).errno 
        });
        
        const extensionError = new ExtensionError(
            this.createFileSystemErrorMessage(error, operation, path),
            ErrorCategory.FILE_SYSTEM,
            context,
            error
        );

        return this.recoveryManager.handleError(extensionError);
    }

    async handleValidationError(
        errors: string[], 
        context: string,
        data?: any
    ): Promise<Result<void>> {
        const errorContext = new ErrorContext('validation', context, { 
            validationErrors: errors,
            data 
        });
        
        const message = `Validation failed in ${context}: ${errors.join(', ')}`;
        const extensionError = new ExtensionError(
            message,
            ErrorCategory.VALIDATION,
            errorContext
        );

        return this.recoveryManager.handleError(extensionError);
    }

    async handleNetworkError(
        error: Error,
        operation: string,
        url?: string
    ): Promise<Result<void>> {
        const context = new ErrorContext(operation, url, {
            statusCode: (error as any).status,
            timeout: (error as any).timeout
        });

        const extensionError = new ExtensionError(
            `Network error during ${operation}: ${error.message}`,
            ErrorCategory.NETWORK,
            context,
            error
        );

        return this.recoveryManager.handleError(extensionError);
    }

    async handleUserInputError(
        message: string,
        inputType: string,
        value?: any
    ): Promise<Result<void>> {
        const context = new ErrorContext('user_input', inputType, { 
            inputValue: value,
            inputType 
        });

        const extensionError = new ExtensionError(
            message,
            ErrorCategory.USER_INPUT,
            context
        );

        return this.recoveryManager.handleError(extensionError);
    }

    async handleSystemError(
        error: Error,
        operation: string,
        component?: string
    ): Promise<Result<void>> {
        const context = new ErrorContext(operation, component, {
            stack: error.stack,
            name: error.name
        });

        const extensionError = new ExtensionError(
            `System error in ${operation}: ${error.message}`,
            ErrorCategory.SYSTEM,
            context,
            error
        );

        return this.recoveryManager.handleError(extensionError);
    }

    createUserFriendlyMessage(error: ExtensionError): string {
        switch (error.category) {
            case ErrorCategory.FILE_SYSTEM:
                return this.createFileSystemMessage(error);
            case ErrorCategory.VALIDATION:
                return this.createValidationMessage(error);
            case ErrorCategory.NETWORK:
                return this.createNetworkMessage(error);
            case ErrorCategory.USER_INPUT:
                return this.createUserInputMessage(error);
            case ErrorCategory.SYSTEM:
                return this.createSystemMessage(error);
            default:
                return `An error occurred: ${error.message}`;
        }
    }

    private createFileSystemErrorMessage(error: Error, operation: string, path: string): string {
        const errorCode = (error as any).code;
        
        switch (errorCode) {
            case 'ENOENT':
                return `File or directory not found: ${path}`;
            case 'EACCES':
                return `Permission denied accessing: ${path}`;
            case 'EEXIST':
                return `File already exists: ${path}`;
            case 'EISDIR':
                return `Expected file but found directory: ${path}`;
            case 'ENOTDIR':
                return `Expected directory but found file: ${path}`;
            default:
                return `File system error during ${operation}: ${error.message}`;
        }
    }

    private createFileSystemMessage(error: ExtensionError): string {
        const path = error.context.resource;
        const operation = error.context.operation;
        
        if (error.message.includes('ENOENT')) {
            return `The file '${path}' could not be found. Please check if the file exists and try again.`;
        }
        
        if (error.message.includes('EACCES')) {
            return `Permission denied accessing '${path}'. Please check file permissions.`;
        }
        
        return `Failed to ${operation} file '${path}': ${error.message}`;
    }

    private createValidationMessage(error: ExtensionError): string {
        const context = error.context.resource || 'input';
        return `Please correct the following issues in ${context}: ${error.message}`;
    }

    private createNetworkMessage(error: ExtensionError): string {
        const operation = error.context.operation;
        return `Network connection failed during ${operation}. Please check your internet connection and try again.`;
    }

    private createUserInputMessage(error: ExtensionError): string {
        return `Invalid input: ${error.message}. Please provide valid input and try again.`;
    }

    private createSystemMessage(error: ExtensionError): string {
        const operation = error.context.operation;
        return `A system error occurred during ${operation}. Please try again or restart the extension.`;
    }
}
