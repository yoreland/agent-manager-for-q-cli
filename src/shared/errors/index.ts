/**
 * Error handling framework exports
 * Provides consistent error handling patterns across the extension
 */

// Result pattern
export { Result, ResultBuilder, ResultUtils } from './result';

// Extension error types
export { 
    ExtensionError, 
    ErrorCategory, 
    ErrorContext 
} from './extensionError';

// Error handling service
export { 
    IErrorHandler, 
    ErrorHandler, 
    ErrorMessageBuilder,
    ILogger,
    IVSCodeAdapter 
} from './errorHandler';

// Error recovery strategies
export { 
    ErrorRecoveryStrategy,
    RecoveryAction,
    RecoveryStrategy,
    FileSystemRecoveryStrategy,
    ConfigurationRecoveryStrategy,
    ValidationRecoveryStrategy 
} from './errorRecovery';