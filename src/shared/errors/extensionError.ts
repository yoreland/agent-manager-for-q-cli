/**
 * Error categories for consistent error classification
 */
export enum ErrorCategory {
    VALIDATION = 'validation',
    FILE_SYSTEM = 'filesystem',
    NETWORK = 'network',
    USER_INPUT = 'user_input',
    SYSTEM = 'system',
    CONFIGURATION = 'configuration',
    PERMISSION = 'permission'
}

/**
 * Context information for errors to provide better debugging and user feedback
 */
export class ErrorContext {
    constructor(
        public readonly operation: string,
        public readonly resource?: string,
        public readonly metadata?: Record<string, any>
    ) {}

    /**
     * Creates an ErrorContext for file operations
     */
    static forFileOperation(operation: string, filePath: string, metadata?: Record<string, any>): ErrorContext {
        return new ErrorContext(operation, filePath, metadata);
    }

    /**
     * Creates an ErrorContext for validation operations
     */
    static forValidation(field: string, value?: any): ErrorContext {
        return new ErrorContext('validation', field, { value });
    }

    /**
     * Creates an ErrorContext for user input operations
     */
    static forUserInput(inputType: string, metadata?: Record<string, any>): ErrorContext {
        return new ErrorContext('user_input', inputType, metadata);
    }

    /**
     * Creates an ErrorContext for configuration operations
     */
    static forConfiguration(configType: string, metadata?: Record<string, any>): ErrorContext {
        return new ErrorContext('configuration', configType, metadata);
    }
}

/**
 * Enhanced error class with categorization and context for better error handling
 */
export class ExtensionError extends Error {
    constructor(
        message: string,
        public readonly category: ErrorCategory,
        public readonly context: ErrorContext,
        public readonly cause?: Error,
        public readonly recoverable: boolean = true
    ) {
        super(message);
        this.name = 'ExtensionError';
        
        // Maintain proper stack trace
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, ExtensionError);
        }
    }

    /**
     * Creates a validation error
     */
    static validation(message: string, field: string, value?: any, cause?: Error): ExtensionError {
        return new ExtensionError(
            message,
            ErrorCategory.VALIDATION,
            ErrorContext.forValidation(field, value),
            cause
        );
    }

    /**
     * Creates a file system error
     */
    static fileSystem(message: string, operation: string, filePath: string, cause?: Error): ExtensionError {
        return new ExtensionError(
            message,
            ErrorCategory.FILE_SYSTEM,
            ErrorContext.forFileOperation(operation, filePath),
            cause
        );
    }

    /**
     * Creates a permission error
     */
    static permission(message: string, operation: string, resource: string, cause?: Error): ExtensionError {
        return new ExtensionError(
            message,
            ErrorCategory.PERMISSION,
            new ErrorContext(operation, resource),
            cause,
            false // Permission errors are typically not recoverable
        );
    }

    /**
     * Creates a configuration error
     */
    static configuration(message: string, configType: string, metadata?: Record<string, any>, cause?: Error): ExtensionError {
        return new ExtensionError(
            message,
            ErrorCategory.CONFIGURATION,
            ErrorContext.forConfiguration(configType, metadata),
            cause
        );
    }

    /**
     * Creates a user input error
     */
    static userInput(message: string, inputType: string, metadata?: Record<string, any>, cause?: Error): ExtensionError {
        return new ExtensionError(
            message,
            ErrorCategory.USER_INPUT,
            ErrorContext.forUserInput(inputType, metadata),
            cause
        );
    }

    /**
     * Creates a system error
     */
    static system(message: string, operation: string, cause?: Error): ExtensionError {
        return new ExtensionError(
            message,
            ErrorCategory.SYSTEM,
            new ErrorContext(operation),
            cause,
            false // System errors are typically not recoverable
        );
    }

    /**
     * Converts a generic Error to an ExtensionError
     */
    static fromError(error: Error, category: ErrorCategory, context: ErrorContext): ExtensionError {
        return new ExtensionError(
            error.message,
            category,
            context,
            error
        );
    }

    /**
     * Returns a JSON representation of the error for logging
     */
    toJSON(): Record<string, any> {
        return {
            name: this.name,
            message: this.message,
            category: this.category,
            context: {
                operation: this.context.operation,
                resource: this.context.resource,
                metadata: this.context.metadata
            },
            recoverable: this.recoverable,
            stack: this.stack,
            cause: this.cause ? {
                name: this.cause.name,
                message: this.cause.message,
                stack: this.cause.stack
            } : undefined
        };
    }
}