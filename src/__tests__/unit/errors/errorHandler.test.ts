import { ErrorHandler, ILogger, IVSCodeAdapter, ErrorMessageBuilder } from '../../../shared/errors/errorHandler';
import { ExtensionError, ErrorCategory, ErrorContext } from '../../../shared/errors/extensionError';

describe('ErrorHandler', () => {
    let mockLogger: jest.Mocked<ILogger>;
    let mockVSCodeAdapter: jest.Mocked<IVSCodeAdapter>;
    let errorHandler: ErrorHandler;

    beforeEach(() => {
        mockLogger = {
            error: jest.fn(),
            warn: jest.fn(),
            info: jest.fn(),
            debug: jest.fn()
        };

        mockVSCodeAdapter = {
            showErrorMessage: jest.fn().mockResolvedValue(undefined),
            showWarningMessage: jest.fn().mockResolvedValue(undefined),
            showInformationMessage: jest.fn().mockResolvedValue(undefined)
        };

        errorHandler = new ErrorHandler(mockLogger, mockVSCodeAdapter);
    });

    describe('handleError', () => {
        it('should handle ExtensionError and show warning for recoverable errors', async () => {
            const context = new ErrorContext('test-operation');
            const error = new ExtensionError('Test error', ErrorCategory.VALIDATION, context, undefined, true);

            await errorHandler.handleError(error);

            expect(mockLogger.error).toHaveBeenCalledWith('Extension error occurred', error);
            expect(mockVSCodeAdapter.showWarningMessage).toHaveBeenCalledWith(
                expect.stringContaining('Test error'),
                'Retry',
                'Ignore'
            );
            expect(mockVSCodeAdapter.showErrorMessage).not.toHaveBeenCalled();
        });

        it('should handle ExtensionError and show error for non-recoverable errors', async () => {
            const context = new ErrorContext('test-operation');
            const error = new ExtensionError('Test error', ErrorCategory.SYSTEM, context, undefined, false);

            await errorHandler.handleError(error);

            expect(mockLogger.error).toHaveBeenCalledWith('Extension error occurred', error);
            expect(mockVSCodeAdapter.showErrorMessage).toHaveBeenCalledWith(
                expect.stringContaining('Test error'),
                'OK'
            );
            expect(mockVSCodeAdapter.showWarningMessage).not.toHaveBeenCalled();
        });

        it('should convert generic Error to ExtensionError', async () => {
            const genericError = new Error('Generic error message');
            const context = new ErrorContext('test-operation');

            await errorHandler.handleError(genericError, context);

            expect(mockLogger.error).toHaveBeenCalledWith('Extension error occurred', expect.any(ExtensionError));
            expect(mockVSCodeAdapter.showWarningMessage).toHaveBeenCalled();
        });

        it('should handle error without context', async () => {
            const genericError = new Error('Generic error message');

            await errorHandler.handleError(genericError);

            expect(mockLogger.error).toHaveBeenCalledWith('Extension error occurred', expect.any(ExtensionError));
            expect(mockVSCodeAdapter.showWarningMessage).toHaveBeenCalled();
        });
    });

    describe('handleFileSystemError', () => {
        it('should create and handle file system error', async () => {
            const originalError = new Error('ENOENT: file not found');
            
            await errorHandler.handleFileSystemError(originalError, 'read', '/path/to/file');

            expect(mockLogger.error).toHaveBeenCalledWith('Extension error occurred', expect.any(ExtensionError));
            expect(mockVSCodeAdapter.showWarningMessage).toHaveBeenCalledWith(
                expect.stringContaining('File not found'),
                'Retry',
                'Ignore'
            );
        });
    });

    describe('handleValidationError', () => {
        it('should create and handle validation error with multiple errors', async () => {
            const errors = ['Name is required', 'Name must be at least 3 characters'];
            
            await errorHandler.handleValidationError(errors, 'agent configuration');

            expect(mockLogger.error).toHaveBeenCalledWith('Extension error occurred', expect.any(ExtensionError));
            expect(mockVSCodeAdapter.showWarningMessage).toHaveBeenCalledWith(
                expect.stringContaining('Validation failed for agent configuration'),
                'Retry',
                'Ignore'
            );
        });
    });

    describe('handleUserInputError', () => {
        it('should create and handle user input error', async () => {
            const originalError = new Error('Invalid input format');
            
            await errorHandler.handleUserInputError(originalError, 'agentName');

            expect(mockLogger.error).toHaveBeenCalledWith('Extension error occurred', expect.any(ExtensionError));
            expect(mockVSCodeAdapter.showWarningMessage).toHaveBeenCalledWith(
                expect.stringContaining('Invalid agentName'),
                'Retry',
                'Ignore'
            );
        });
    });

    describe('createUserFriendlyMessage', () => {
        it('should create file system error message for ENOENT', () => {
            const cause = new Error('ENOENT: file not found');
            const context = ErrorContext.forFileOperation('read', '/path/to/file');
            const error = new ExtensionError('File not found', ErrorCategory.FILE_SYSTEM, context, cause);

            const message = errorHandler.createUserFriendlyMessage(error);

            expect(message).toBe('File not found: /path/to/file. Please check if the file exists and try again.');
        });

        it('should create file system error message for EACCES', () => {
            const cause = new Error('EACCES: permission denied');
            const context = ErrorContext.forFileOperation('write', '/protected/file');
            const error = new ExtensionError('Permission denied', ErrorCategory.FILE_SYSTEM, context, cause);

            const message = errorHandler.createUserFriendlyMessage(error);

            expect(message).toBe('Permission denied: /protected/file. Please check file permissions and try again.');
        });

        it('should create validation error message with multiple errors', () => {
            const context = new ErrorContext('validation', 'agentName', { 
                value: 'invalid',
                errors: ['Name too short', 'Invalid characters'] 
            });
            const error = new ExtensionError('Validation failed', ErrorCategory.VALIDATION, context);

            const message = errorHandler.createUserFriendlyMessage(error);

            expect(message).toBe('Validation failed for agentName:\n• Name too short\n• Invalid characters');
        });

        it('should create permission error message', () => {
            const context = new ErrorContext('write', '/protected/file');
            const error = new ExtensionError('Access denied', ErrorCategory.PERMISSION, context);

            const message = errorHandler.createUserFriendlyMessage(error);

            expect(message).toBe('Permission denied while trying to write "/protected/file". Please check your file permissions or run VS Code with appropriate privileges.');
        });

        it('should create configuration error message', () => {
            const context = ErrorContext.forConfiguration('agent.json');
            const error = new ExtensionError('Invalid JSON syntax', ErrorCategory.CONFIGURATION, context);

            const message = errorHandler.createUserFriendlyMessage(error);

            expect(message).toBe('Configuration error in agent.json: Invalid JSON syntax. Please check your configuration file format and values.');
        });

        it('should create user input error message', () => {
            const context = ErrorContext.forUserInput('agentName');
            const error = new ExtensionError('Name too short', ErrorCategory.USER_INPUT, context);

            const message = errorHandler.createUserFriendlyMessage(error);

            expect(message).toBe('Invalid agentName: Name too short. Please provide a valid value and try again.');
        });

        it('should create network error message', () => {
            const context = new ErrorContext('api_call');
            const error = new ExtensionError('Connection timeout', ErrorCategory.NETWORK, context);

            const message = errorHandler.createUserFriendlyMessage(error);

            expect(message).toBe('Network error: Connection timeout. Please check your internet connection and try again.');
        });

        it('should create system error message', () => {
            const context = new ErrorContext('memory_allocation');
            const error = new ExtensionError('Out of memory', ErrorCategory.SYSTEM, context);

            const message = errorHandler.createUserFriendlyMessage(error);

            expect(message).toBe('System error: Out of memory. Please try again or restart VS Code if the problem persists.');
        });

        it('should create default error message for unknown category', () => {
            const context = new ErrorContext('unknown');
            const error = new ExtensionError('Unknown error', 'unknown' as ErrorCategory, context);

            const message = errorHandler.createUserFriendlyMessage(error);

            expect(message).toBe('An unexpected error occurred: Unknown error');
        });
    });
});

describe('ErrorMessageBuilder', () => {
    describe('buildFileSystemErrorMessage', () => {
        it('should build ENOENT error message', () => {
            const error = new Error('ENOENT: file not found');
            const message = ErrorMessageBuilder.buildFileSystemErrorMessage(error, 'read', '/path/to/file');

            expect(message).toBe('File not found: /path/to/file. Please check if the file exists and try again.');
        });

        it('should build EACCES error message', () => {
            const error = new Error('EACCES: permission denied');
            const message = ErrorMessageBuilder.buildFileSystemErrorMessage(error, 'write', '/protected/file');

            expect(message).toBe('Permission denied: /protected/file. Please check file permissions.');
        });

        it('should build EISDIR error message', () => {
            const error = new Error('EISDIR: illegal operation on a directory');
            const message = ErrorMessageBuilder.buildFileSystemErrorMessage(error, 'read', '/path/to/directory');

            expect(message).toBe('Expected a file but found a directory: /path/to/directory');
        });

        it('should build generic error message', () => {
            const error = new Error('Generic file system error');
            const message = ErrorMessageBuilder.buildFileSystemErrorMessage(error, 'copy', '/path/to/file');

            expect(message).toBe('Failed to copy: Generic file system error');
        });
    });

    describe('buildValidationErrorMessage', () => {
        it('should build validation error message', () => {
            const message = ErrorMessageBuilder.buildValidationErrorMessage('username', 'ab', 'must be at least 3 characters');

            expect(message).toBe('Invalid username: "ab" must be at least 3 characters');
        });
    });

    describe('buildConfigurationErrorMessage', () => {
        it('should build configuration error message', () => {
            const message = ErrorMessageBuilder.buildConfigurationErrorMessage('agent.json', 'missing required field "name"');

            expect(message).toBe('Configuration error in agent.json: missing required field "name"');
        });
    });
});