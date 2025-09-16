import { 
    ErrorRecoveryStrategy, 
    FileSystemRecoveryStrategy, 
    ConfigurationRecoveryStrategy, 
    ValidationRecoveryStrategy 
} from '../../../shared/errors/errorRecovery';
import { ExtensionError, ErrorCategory, ErrorContext } from '../../../shared/errors/extensionError';

describe('ErrorRecoveryStrategy', () => {
    describe('handleFileSystemError', () => {
        it('should handle file not found error', async () => {
            const cause = new Error('ENOENT: file not found');
            const context = ErrorContext.forFileOperation('read', '/path/to/file');
            const error = new ExtensionError('File not found', ErrorCategory.FILE_SYSTEM, context, cause);

            const result = await ErrorRecoveryStrategy.handleFileSystemError(error);

            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error.message).toContain('File not found');
            }
        });

        it('should handle permission denied error', async () => {
            const cause = new Error('EACCES: permission denied');
            const context = ErrorContext.forFileOperation('write', '/protected/file');
            const error = new ExtensionError('Permission denied', ErrorCategory.FILE_SYSTEM, context, cause);

            const result = await ErrorRecoveryStrategy.handleFileSystemError(error);

            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error.message).toContain('Permission denied');
            }
        });

        it('should handle directory/file type mismatch', async () => {
            const cause = new Error('EISDIR: illegal operation on a directory');
            const context = ErrorContext.forFileOperation('read', '/path/to/directory');
            const error = new ExtensionError('Type mismatch', ErrorCategory.FILE_SYSTEM, context, cause);

            const result = await ErrorRecoveryStrategy.handleFileSystemError(error);

            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error.message).toContain('Type mismatch');
            }
        });

        it('should handle write operation for missing file', async () => {
            const cause = new Error('ENOENT: file not found');
            const context = ErrorContext.forFileOperation('write', '/path/to/file');
            const error = new ExtensionError('File not found', ErrorCategory.FILE_SYSTEM, context, cause);

            const result = await ErrorRecoveryStrategy.handleFileSystemError(error);

            expect(result.success).toBe(true);
        });

        it('should handle unknown file system error', async () => {
            const cause = new Error('Unknown file system error');
            const context = ErrorContext.forFileOperation('read', '/path/to/file');
            const error = new ExtensionError('Unknown error', ErrorCategory.FILE_SYSTEM, context, cause);

            const result = await ErrorRecoveryStrategy.handleFileSystemError(error);

            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error).toBe(error);
            }
        });
    });

    describe('handleValidationError', () => {
        it('should handle agent name validation error', async () => {
            const context = ErrorContext.forValidation('agentName', 'invalid-name!');
            const error = new ExtensionError('Invalid agent name', ErrorCategory.VALIDATION, context);

            const result = await ErrorRecoveryStrategy.handleValidationError(error);

            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error.message).toContain('Agent name can only contain');
            }
        });

        it('should handle empty agent name', async () => {
            const context = ErrorContext.forValidation('agentName', '');
            const error = new ExtensionError('Invalid agent name', ErrorCategory.VALIDATION, context);

            const result = await ErrorRecoveryStrategy.handleValidationError(error);

            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error.message).toContain('Agent name cannot be empty');
            }
        });

        it('should handle long agent name', async () => {
            const longName = 'a'.repeat(60);
            const context = ErrorContext.forValidation('agentName', longName);
            const error = new ExtensionError('Invalid agent name', ErrorCategory.VALIDATION, context);

            const result = await ErrorRecoveryStrategy.handleValidationError(error);

            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error.message).toContain('50 characters or less');
            }
        });

        it('should handle non-string agent name', async () => {
            const context = ErrorContext.forValidation('agentName', 123);
            const error = new ExtensionError('Invalid agent name', ErrorCategory.VALIDATION, context);

            const result = await ErrorRecoveryStrategy.handleValidationError(error);

            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error.message).toBe('Agent name must be a string.');
            }
        });

        it('should handle file path validation error', async () => {
            const context = ErrorContext.forValidation('filePath', '');
            const error = new ExtensionError('Invalid file path', ErrorCategory.VALIDATION, context);

            const result = await ErrorRecoveryStrategy.handleValidationError(error);

            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error.message).toBe('File path cannot be empty.');
            }
        });

        it('should handle file path with invalid characters', async () => {
            const context = ErrorContext.forValidation('filePath', 'path/with<invalid>chars');
            const error = new ExtensionError('Invalid file path', ErrorCategory.VALIDATION, context);

            const result = await ErrorRecoveryStrategy.handleValidationError(error);

            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error.message).toBe('File path contains invalid characters.');
            }
        });

        it('should handle configuration validation error', async () => {
            const context = new ErrorContext('validation', 'config', { 
                errors: ['Missing name field', 'Invalid tools array'] 
            });
            const error = new ExtensionError('Configuration validation failed', ErrorCategory.VALIDATION, context);

            const result = await ErrorRecoveryStrategy.handleValidationError(error);

            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error.message).toContain('Missing name field');
                expect(result.error.message).toContain('Invalid tools array');
            }
        });

        it('should handle unknown validation error', async () => {
            const context = ErrorContext.forValidation('unknown', 'value');
            const error = new ExtensionError('Unknown validation error', ErrorCategory.VALIDATION, context);

            const result = await ErrorRecoveryStrategy.handleValidationError(error);

            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error).toBe(error);
            }
        });
    });

    describe('handleConfigurationError', () => {
        it('should handle JSON parsing error', async () => {
            const context = ErrorContext.forConfiguration('agent.json', { line: 5 });
            const error = new ExtensionError('Invalid JSON syntax', ErrorCategory.CONFIGURATION, context);

            const result = await ErrorRecoveryStrategy.handleConfigurationError(error);

            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error.message).toContain('Invalid JSON in agent.json at line 5');
            }
        });

        it('should handle missing configuration file', async () => {
            const context = ErrorContext.forConfiguration('agent.json');
            const error = new ExtensionError('Configuration file not found', ErrorCategory.CONFIGURATION, context);

            const result = await ErrorRecoveryStrategy.handleConfigurationError(error);

            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error.message).toContain('Configuration file not found: agent.json');
            }
        });

        it('should handle invalid configuration schema', async () => {
            const context = ErrorContext.forConfiguration('agent.json', { field: 'name' });
            const error = new ExtensionError('Invalid schema', ErrorCategory.CONFIGURATION, context);

            const result = await ErrorRecoveryStrategy.handleConfigurationError(error);

            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error.message).toContain('Invalid configuration schema in agent.json (field: name)');
            }
        });

        it('should handle unknown configuration error', async () => {
            const context = ErrorContext.forConfiguration('agent.json');
            const error = new ExtensionError('Unknown configuration error', ErrorCategory.CONFIGURATION, context);

            const result = await ErrorRecoveryStrategy.handleConfigurationError(error);

            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error).toBe(error);
            }
        });
    });

    describe('handleUserInputError', () => {
        it('should handle agent name input error', async () => {
            const context = ErrorContext.forUserInput('agentName');
            const error = new ExtensionError('Invalid agent name', ErrorCategory.USER_INPUT, context);

            const result = await ErrorRecoveryStrategy.handleUserInputError(error);

            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error.message).toContain('Agent name must contain only letters');
            }
        });

        it('should handle file path input error', async () => {
            const context = ErrorContext.forUserInput('filePath');
            const error = new ExtensionError('Invalid file path', ErrorCategory.USER_INPUT, context);

            const result = await ErrorRecoveryStrategy.handleUserInputError(error);

            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error.message).toContain('Please provide a valid file path');
            }
        });

        it('should handle directory path input error', async () => {
            const context = ErrorContext.forUserInput('directoryPath');
            const error = new ExtensionError('Invalid directory path', ErrorCategory.USER_INPUT, context);

            const result = await ErrorRecoveryStrategy.handleUserInputError(error);

            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error.message).toContain('Please provide a valid directory path');
            }
        });

        it('should handle unknown user input error', async () => {
            const context = ErrorContext.forUserInput('unknown');
            const error = new ExtensionError('Unknown input error', ErrorCategory.USER_INPUT, context);

            const result = await ErrorRecoveryStrategy.handleUserInputError(error);

            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error).toBe(error);
            }
        });
    });
});

describe('FileSystemRecoveryStrategy', () => {
    let strategy: FileSystemRecoveryStrategy;

    beforeEach(() => {
        strategy = new FileSystemRecoveryStrategy();
    });

    it('should handle file system errors', () => {
        const context = ErrorContext.forFileOperation('read', '/path/to/file');
        const error = new ExtensionError('File error', ErrorCategory.FILE_SYSTEM, context);

        expect(strategy.canHandle(error)).toBe(true);
    });

    it('should not handle non-file system errors', () => {
        const context = new ErrorContext('validation');
        const error = new ExtensionError('Validation error', ErrorCategory.VALIDATION, context);

        expect(strategy.canHandle(error)).toBe(false);
    });

    it('should provide recovery actions for ENOENT error', () => {
        const cause = new Error('ENOENT: file not found');
        const context = ErrorContext.forFileOperation('read', '/path/to/file');
        const error = new ExtensionError('File not found', ErrorCategory.FILE_SYSTEM, context, cause);

        const actions = strategy.getRecoveryActions(error);

        expect(actions).toHaveLength(1);
        expect(actions[0]?.name).toBe('Create File');
        expect(actions[0]?.description).toContain('/path/to/file');
    });

    it('should provide recovery actions for EACCES error', () => {
        const cause = new Error('EACCES: permission denied');
        const context = ErrorContext.forFileOperation('write', '/protected/file');
        const error = new ExtensionError('Permission denied', ErrorCategory.FILE_SYSTEM, context, cause);

        const actions = strategy.getRecoveryActions(error);

        expect(actions).toHaveLength(1);
        expect(actions[0]?.name).toBe('Check Permissions');
        expect(actions[0]?.description).toContain('permissions');
    });
});

describe('ConfigurationRecoveryStrategy', () => {
    let strategy: ConfigurationRecoveryStrategy;

    beforeEach(() => {
        strategy = new ConfigurationRecoveryStrategy();
    });

    it('should handle configuration errors', () => {
        const context = ErrorContext.forConfiguration('agent.json');
        const error = new ExtensionError('Config error', ErrorCategory.CONFIGURATION, context);

        expect(strategy.canHandle(error)).toBe(true);
    });

    it('should not handle non-configuration errors', () => {
        const context = new ErrorContext('validation');
        const error = new ExtensionError('Validation error', ErrorCategory.VALIDATION, context);

        expect(strategy.canHandle(error)).toBe(false);
    });

    it('should provide recovery actions for JSON errors', () => {
        const context = ErrorContext.forConfiguration('agent.json');
        const error = new ExtensionError('Invalid JSON syntax', ErrorCategory.CONFIGURATION, context);

        const actions = strategy.getRecoveryActions(error);

        expect(actions).toHaveLength(2);
        expect(actions[0]?.name).toBe('Validate JSON');
        expect(actions[1]?.name).toBe('Reset Configuration');
    });

    it('should provide reset action for any configuration error', () => {
        const context = ErrorContext.forConfiguration('agent.json');
        const error = new ExtensionError('Configuration error', ErrorCategory.CONFIGURATION, context);

        const actions = strategy.getRecoveryActions(error);

        expect(actions).toHaveLength(1);
        expect(actions[0]?.name).toBe('Reset Configuration');
        expect(actions[0]?.description).toContain('agent.json');
    });
});

describe('ValidationRecoveryStrategy', () => {
    let strategy: ValidationRecoveryStrategy;

    beforeEach(() => {
        strategy = new ValidationRecoveryStrategy();
    });

    it('should handle validation errors', () => {
        const context = ErrorContext.forValidation('agentName');
        const error = new ExtensionError('Validation error', ErrorCategory.VALIDATION, context);

        expect(strategy.canHandle(error)).toBe(true);
    });

    it('should not handle non-validation errors', () => {
        const context = new ErrorContext('file_operation');
        const error = new ExtensionError('File error', ErrorCategory.FILE_SYSTEM, context);

        expect(strategy.canHandle(error)).toBe(false);
    });

    it('should provide show examples action', () => {
        const context = ErrorContext.forValidation('agentName');
        const error = new ExtensionError('Invalid agent name', ErrorCategory.VALIDATION, context);

        const actions = strategy.getRecoveryActions(error);

        expect(actions).toHaveLength(1);
        expect(actions[0]?.name).toBe('Show Examples');
        expect(actions[0]?.description).toContain('agentName');
    });
});