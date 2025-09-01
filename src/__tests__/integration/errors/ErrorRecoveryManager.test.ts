import { ErrorRecoveryManager } from '../../../shared/errors/ErrorRecoveryManager';
import { ExtensionError, ErrorCategory, ErrorContext } from '../../../shared/errors/extensionError';
import { ILogger } from '../../../shared/infrastructure/ILogger';
import { IVSCodeAdapter } from '../../../shared/infrastructure/IVSCodeAdapter';

describe('ErrorRecoveryManager Integration', () => {
    let recoveryManager: ErrorRecoveryManager;
    let mockLogger: jest.Mocked<ILogger>;
    let mockVSCodeAdapter: jest.Mocked<IVSCodeAdapter>;

    beforeEach(() => {
        mockLogger = {
            debug: jest.fn(),
            info: jest.fn(),
            warn: jest.fn(),
            error: jest.fn(),
            setLogLevel: jest.fn(),
            getLogLevel: jest.fn(),
            dispose: jest.fn()
        };

        mockVSCodeAdapter = {
            showErrorMessage: jest.fn(),
            showInformationMessage: jest.fn(),
            showWarningMessage: jest.fn()
        } as any;

        recoveryManager = new ErrorRecoveryManager(mockLogger, mockVSCodeAdapter);
    });

    describe('error handling', () => {
        it('should handle file system errors', async () => {
            const context = new ErrorContext('readFile', '/test/file.txt');
            const error = new ExtensionError(
                'ENOENT: no such file or directory',
                ErrorCategory.FILE_SYSTEM,
                context
            );

            mockVSCodeAdapter.showErrorMessage.mockResolvedValue('Create File');

            const result = await recoveryManager.handleError(error);

            expect(result.success).toBe(true);
            expect(mockVSCodeAdapter.showErrorMessage).toHaveBeenCalledWith(
                'File not found. Would you like to create it?',
                'Create File', 'Cancel'
            );
            expect(mockLogger.info).toHaveBeenCalledWith('Error recovery successful', {
                category: ErrorCategory.FILE_SYSTEM,
                message: error.message
            });
        });

        it('should handle validation errors', async () => {
            const context = new ErrorContext('validation', 'agent-config');
            const error = new ExtensionError(
                'Invalid agent name',
                ErrorCategory.VALIDATION,
                context
            );

            mockVSCodeAdapter.showErrorMessage.mockResolvedValue('Fix');

            const result = await recoveryManager.handleError(error);

            expect(result.success).toBe(true);
            expect(mockVSCodeAdapter.showErrorMessage).toHaveBeenCalledWith(
                'Validation failed: Invalid agent name. Would you like to fix it?',
                'Fix', 'Ignore', 'Cancel'
            );
        });

        it('should handle unknown error categories', async () => {
            const context = new ErrorContext('unknown', 'test');
            const error = new ExtensionError(
                'Unknown error',
                'UNKNOWN' as ErrorCategory,
                context
            );

            mockVSCodeAdapter.showErrorMessage.mockResolvedValue(undefined);

            const result = await recoveryManager.handleError(error);

            expect(result.success).toBe(false);
            expect(mockLogger.error).toHaveBeenCalledWith(
                'Unknown error category',
                error,
                { category: 'UNKNOWN' }
            );
        });
    });

    describe('error history', () => {
        it('should record error history', async () => {
            const context = new ErrorContext('test', 'resource');
            const error = new ExtensionError(
                'Test error',
                ErrorCategory.SYSTEM,
                context
            );

            await recoveryManager.handleError(error);

            const history = recoveryManager.getErrorHistory();
            expect(history).toHaveLength(1);
            expect(history[0]?.category).toBe(ErrorCategory.SYSTEM);
            expect(history[0]?.message).toBe('Test error');
        });

        it('should provide error statistics', async () => {
            const context1 = new ErrorContext('test1', 'resource1');
            const error1 = new ExtensionError('Error 1', ErrorCategory.FILE_SYSTEM, context1);
            
            const context2 = new ErrorContext('test2', 'resource2');
            const error2 = new ExtensionError('Error 2', ErrorCategory.FILE_SYSTEM, context2);
            
            const context3 = new ErrorContext('test3', 'resource3');
            const error3 = new ExtensionError('Error 3', ErrorCategory.VALIDATION, context3);

            await recoveryManager.handleError(error1);
            await recoveryManager.handleError(error2);
            await recoveryManager.handleError(error3);

            const stats = recoveryManager.getErrorStats();
            expect(stats.totalErrors).toBe(3);
            expect(stats.categoryCounts[ErrorCategory.FILE_SYSTEM]).toBe(2);
            expect(stats.categoryCounts[ErrorCategory.VALIDATION]).toBe(1);
            expect(stats.recentErrors).toHaveLength(3);
        });
    });
});
