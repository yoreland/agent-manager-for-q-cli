import { ExtensionError, ErrorCategory, ErrorContext } from '../../../shared/errors/extensionError';

describe('ExtensionError', () => {
    describe('ErrorContext', () => {
        it('should create basic error context', () => {
            const context = new ErrorContext('test-operation', 'test-resource');

            expect(context.operation).toBe('test-operation');
            expect(context.resource).toBe('test-resource');
            expect(context.metadata).toBeUndefined();
        });

        it('should create error context with metadata', () => {
            const metadata = { key: 'value', count: 42 };
            const context = new ErrorContext('test-operation', 'test-resource', metadata);

            expect(context.operation).toBe('test-operation');
            expect(context.resource).toBe('test-resource');
            expect(context.metadata).toEqual(metadata);
        });

        describe('static factory methods', () => {
            it('should create file operation context', () => {
                const context = ErrorContext.forFileOperation('read', '/path/to/file', { size: 1024 });

                expect(context.operation).toBe('read');
                expect(context.resource).toBe('/path/to/file');
                expect(context.metadata).toEqual({ size: 1024 });
            });

            it('should create validation context', () => {
                const context = ErrorContext.forValidation('username', 'invalid-user');

                expect(context.operation).toBe('validation');
                expect(context.resource).toBe('username');
                expect(context.metadata).toEqual({ value: 'invalid-user' });
            });

            it('should create user input context', () => {
                const context = ErrorContext.forUserInput('agentName', { length: 5 });

                expect(context.operation).toBe('user_input');
                expect(context.resource).toBe('agentName');
                expect(context.metadata).toEqual({ length: 5 });
            });

            it('should create configuration context', () => {
                const context = ErrorContext.forConfiguration('agent.json', { version: '1.0' });

                expect(context.operation).toBe('configuration');
                expect(context.resource).toBe('agent.json');
                expect(context.metadata).toEqual({ version: '1.0' });
            });
        });
    });

    describe('ExtensionError', () => {
        it('should create basic extension error', () => {
            const context = new ErrorContext('test-operation');
            const error = new ExtensionError(
                'Test error message',
                ErrorCategory.VALIDATION,
                context
            );

            expect(error.message).toBe('Test error message');
            expect(error.category).toBe(ErrorCategory.VALIDATION);
            expect(error.context).toBe(context);
            expect(error.cause).toBeUndefined();
            expect(error.recoverable).toBe(true);
            expect(error.name).toBe('ExtensionError');
        });

        it('should create extension error with cause', () => {
            const cause = new Error('Original error');
            const context = new ErrorContext('test-operation');
            const error = new ExtensionError(
                'Test error message',
                ErrorCategory.FILE_SYSTEM,
                context,
                cause,
                false
            );

            expect(error.message).toBe('Test error message');
            expect(error.category).toBe(ErrorCategory.FILE_SYSTEM);
            expect(error.context).toBe(context);
            expect(error.cause).toBe(cause);
            expect(error.recoverable).toBe(false);
        });

        describe('static factory methods', () => {
            it('should create validation error', () => {
                const error = ExtensionError.validation('Invalid input', 'username', 'test-user');

                expect(error.message).toBe('Invalid input');
                expect(error.category).toBe(ErrorCategory.VALIDATION);
                expect(error.context.operation).toBe('validation');
                expect(error.context.resource).toBe('username');
                expect(error.context.metadata).toEqual({ value: 'test-user' });
                expect(error.recoverable).toBe(true);
            });

            it('should create file system error', () => {
                const cause = new Error('ENOENT');
                const error = ExtensionError.fileSystem('File not found', 'read', '/path/to/file', cause);

                expect(error.message).toBe('File not found');
                expect(error.category).toBe(ErrorCategory.FILE_SYSTEM);
                expect(error.context.operation).toBe('read');
                expect(error.context.resource).toBe('/path/to/file');
                expect(error.cause).toBe(cause);
                expect(error.recoverable).toBe(true);
            });

            it('should create permission error', () => {
                const cause = new Error('EACCES');
                const error = ExtensionError.permission('Access denied', 'write', '/protected/file', cause);

                expect(error.message).toBe('Access denied');
                expect(error.category).toBe(ErrorCategory.PERMISSION);
                expect(error.context.operation).toBe('write');
                expect(error.context.resource).toBe('/protected/file');
                expect(error.cause).toBe(cause);
                expect(error.recoverable).toBe(false);
            });

            it('should create configuration error', () => {
                const metadata = { line: 5, column: 10 };
                const error = ExtensionError.configuration('Invalid JSON', 'agent.json', metadata);

                expect(error.message).toBe('Invalid JSON');
                expect(error.category).toBe(ErrorCategory.CONFIGURATION);
                expect(error.context.operation).toBe('configuration');
                expect(error.context.resource).toBe('agent.json');
                expect(error.context.metadata).toBe(metadata);
                expect(error.recoverable).toBe(true);
            });

            it('should create user input error', () => {
                const metadata = { minLength: 3 };
                const error = ExtensionError.userInput('Name too short', 'agentName', metadata);

                expect(error.message).toBe('Name too short');
                expect(error.category).toBe(ErrorCategory.USER_INPUT);
                expect(error.context.operation).toBe('user_input');
                expect(error.context.resource).toBe('agentName');
                expect(error.context.metadata).toBe(metadata);
                expect(error.recoverable).toBe(true);
            });

            it('should create system error', () => {
                const cause = new Error('Out of memory');
                const error = ExtensionError.system('System failure', 'memory-allocation', cause);

                expect(error.message).toBe('System failure');
                expect(error.category).toBe(ErrorCategory.SYSTEM);
                expect(error.context.operation).toBe('memory-allocation');
                expect(error.cause).toBe(cause);
                expect(error.recoverable).toBe(false);
            });

            it('should create error from generic Error', () => {
                const originalError = new Error('Generic error');
                const context = new ErrorContext('test-operation');
                const error = ExtensionError.fromError(originalError, ErrorCategory.NETWORK, context);

                expect(error.message).toBe('Generic error');
                expect(error.category).toBe(ErrorCategory.NETWORK);
                expect(error.context).toBe(context);
                expect(error.cause).toBe(originalError);
            });
        });

        describe('toJSON', () => {
            it('should serialize error to JSON', () => {
                const cause = new Error('Original error');
                const context = new ErrorContext('test-operation', 'test-resource', { key: 'value' });
                const error = new ExtensionError(
                    'Test error',
                    ErrorCategory.VALIDATION,
                    context,
                    cause,
                    false
                );

                const json = error.toJSON();

                expect(json).toEqual({
                    name: 'ExtensionError',
                    message: 'Test error',
                    category: ErrorCategory.VALIDATION,
                    context: {
                        operation: 'test-operation',
                        resource: 'test-resource',
                        metadata: { key: 'value' }
                    },
                    recoverable: false,
                    stack: error.stack,
                    cause: {
                        name: 'Error',
                        message: 'Original error',
                        stack: cause.stack
                    }
                });
            });

            it('should serialize error without cause', () => {
                const context = new ErrorContext('test-operation');
                const error = new ExtensionError('Test error', ErrorCategory.VALIDATION, context);

                const json = error.toJSON();

                expect(json['cause']).toBeUndefined();
                expect(json['name']).toBe('ExtensionError');
                expect(json['message']).toBe('Test error');
            });
        });
    });

    describe('ErrorCategory enum', () => {
        it('should have all expected categories', () => {
            expect(ErrorCategory.VALIDATION).toBe('validation');
            expect(ErrorCategory.FILE_SYSTEM).toBe('filesystem');
            expect(ErrorCategory.NETWORK).toBe('network');
            expect(ErrorCategory.USER_INPUT).toBe('user_input');
            expect(ErrorCategory.SYSTEM).toBe('system');
            expect(ErrorCategory.CONFIGURATION).toBe('configuration');
            expect(ErrorCategory.PERMISSION).toBe('permission');
        });
    });
});