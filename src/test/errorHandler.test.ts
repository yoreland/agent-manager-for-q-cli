import * as assert from 'assert';
import * as sinon from 'sinon';
import * as vscode from 'vscode';
import { ErrorHandler, FileSystemErrorType, AgentErrorType } from '../services/errorHandler';
import { ExtensionLogger } from '../services/logger';
import { ValidationResult } from '../types/agent';

suite('ErrorHandler Test Suite', () => {
    let errorHandler: ErrorHandler;
    let mockLogger: ExtensionLogger;
    let showErrorMessageStub: sinon.SinonStub;
    let showWarningMessageStub: sinon.SinonStub;
    let showInformationMessageStub: sinon.SinonStub;

    setup(() => {
        // Create stubs for VS Code API
        showErrorMessageStub = sinon.stub(vscode.window, 'showErrorMessage').resolves(undefined);
        showWarningMessageStub = sinon.stub(vscode.window, 'showWarningMessage').resolves(undefined);
        showInformationMessageStub = sinon.stub(vscode.window, 'showInformationMessage').resolves(undefined);

        // Create mock logger
        mockLogger = {
            error: sinon.stub(),
            warn: sinon.stub(),
            info: sinon.stub(),
            debug: sinon.stub()
        } as any;

        // Create error handler instance
        errorHandler = new ErrorHandler(mockLogger);
    });

    teardown(() => {
        // Restore all stubs
        sinon.restore();
    });

    suite('categorizeError', () => {
        test('should categorize file system errors correctly', () => {
            const permissionError = new Error('Permission denied') as NodeJS.ErrnoException;
            permissionError.code = 'EACCES';
            assert.strictEqual(errorHandler.categorizeError(permissionError), FileSystemErrorType.PERMISSION_DENIED);

            const notFoundError = new Error('File not found') as NodeJS.ErrnoException;
            notFoundError.code = 'ENOENT';
            assert.strictEqual(errorHandler.categorizeError(notFoundError), FileSystemErrorType.FILE_NOT_FOUND);

            const diskFullError = new Error('No space left') as NodeJS.ErrnoException;
            diskFullError.code = 'ENOSPC';
            assert.strictEqual(errorHandler.categorizeError(diskFullError), FileSystemErrorType.DISK_FULL);
        });

        test('should categorize agent errors correctly', () => {
            const existsError = new Error('Agent already exists');
            assert.strictEqual(errorHandler.categorizeError(existsError), AgentErrorType.NAME_ALREADY_EXISTS);

            const validationError = new Error('Invalid name provided');
            assert.strictEqual(errorHandler.categorizeError(validationError), AgentErrorType.VALIDATION_FAILED);

            const jsonError = new Error('JSON parse error');
            assert.strictEqual(errorHandler.categorizeError(jsonError), AgentErrorType.INVALID_CONFIG);
        });
    });

    suite('showSuccessMessage', () => {
        test('should show success message without actions', async () => {
            const message = 'Operation completed successfully';
            
            await errorHandler.showSuccessMessage(message);
            
            assert.ok(showInformationMessageStub.calledWith(message));
            assert.ok((mockLogger.info as sinon.SinonStub).calledWith(`Success: ${message}`));
        });

        test('should show success message with actions', async () => {
            const message = 'Agent created successfully';
            const actions = ['Open File', 'Create Another'];
            
            await errorHandler.showSuccessMessage(message, actions);
            
            assert.ok(showInformationMessageStub.calledWith(message, ...actions));
            assert.ok((mockLogger.info as sinon.SinonStub).calledWith(`Success: ${message}`));
        });
    });

    suite('showErrorMessage', () => {
        test('should show error message without actions', async () => {
            const message = 'Operation failed';
            const error = new Error('Test error');
            
            await errorHandler.showErrorMessage(message, error);
            
            assert.ok(showErrorMessageStub.calledWith(message));
            assert.ok((mockLogger.error as sinon.SinonStub).calledWith(`Error shown to user: ${message}`, error));
        });

        test('should show error message with actions', async () => {
            const message = 'File operation failed';
            const error = new Error('Permission denied');
            const actions = ['Retry', 'Check Permissions'];
            
            await errorHandler.showErrorMessage(message, error, actions);
            
            assert.ok(showErrorMessageStub.calledWith(message, ...actions));
            assert.ok((mockLogger.error as sinon.SinonStub).calledWith(`Error shown to user: ${message}`, error));
        });
    });

    suite('handleValidationError', () => {
        test('should handle single validation error', async () => {
            const validation: ValidationResult = {
                isValid: false,
                errors: ['Agent name is required']
            };
            
            await errorHandler.handleValidationError(validation, 'Agent creation');
            
            assert.ok(showErrorMessageStub.calledWith('Agent name is required'));
            assert.ok((mockLogger.warn as sinon.SinonStub).calledWith(
                'Validation failed (Agent creation)', 
                { errors: validation.errors, warnings: undefined }
            ));
        });

        test('should handle multiple validation errors', async () => {
            const validation: ValidationResult = {
                isValid: false,
                errors: ['Agent name is required', 'Name contains invalid characters']
            };
            
            await errorHandler.handleValidationError(validation);
            
            const expectedMessage = '입력한 정보가 올바르지 않습니다:\n• Agent name is required\n• Name contains invalid characters';
            assert.ok(showErrorMessageStub.calledWith(expectedMessage));
        });

        test('should handle validation warnings', async () => {
            const validation: ValidationResult = {
                isValid: false,
                errors: ['Agent name is required'],
                warnings: ['Name is very long']
            };
            
            await errorHandler.handleValidationError(validation);
            
            assert.ok(showWarningMessageStub.calledWith(
                '다음 사항을 확인해주세요:\n• Name is very long'
            ));
            assert.ok(showErrorMessageStub.calledWith('Agent name is required'));
        });

        test('should not handle valid validation results', async () => {
            const validation: ValidationResult = {
                isValid: true,
                errors: []
            };
            
            await errorHandler.handleValidationError(validation);
            
            assert.ok(showErrorMessageStub.notCalled);
            assert.ok(showWarningMessageStub.notCalled);
        });
    });

    suite('handleAgentCreationError', () => {
        test('should handle agent already exists error', async () => {
            const error = new Error('Agent \'test-agent\' already exists');
            
            await errorHandler.handleAgentCreationError(error, 'test-agent');
            
            assert.ok(showErrorMessageStub.calledWith(
                'Agent \'test-agent\'은(는) 이미 존재합니다. 다른 이름을 사용해주세요.'
            ));
            assert.ok((mockLogger.error as sinon.SinonStub).calledWith(
                'Agent creation failed for agent \'test-agent\'', 
                error
            ));
        });

        test('should handle permission denied error', async () => {
            const error = new Error('Permission denied') as NodeJS.ErrnoException;
            error.code = 'EACCES';
            
            await errorHandler.handleAgentCreationError(error, 'test-agent');
            
            assert.ok(showErrorMessageStub.calledWith(
                'Agent 생성에 실패했습니다 (test-agent): 파일을 생성할 권한이 없습니다.',
                error,
                ['폴더 권한 확인', '관리자 권한으로 실행', '다른 위치에서 시도']
            ));
        });

        test('should handle disk full error', async () => {
            const error = new Error('No space left on device') as NodeJS.ErrnoException;
            error.code = 'ENOSPC';
            
            await errorHandler.handleAgentCreationError(error);
            
            assert.ok(showErrorMessageStub.calledWith(
                'Agent 생성에 실패했습니다: 디스크 공간이 부족합니다.',
                error,
                ['디스크 정리', '다른 드라이브 사용']
            ));
        });
    });

    suite('handleFileSystemError', () => {
        test('should handle file not found error', async () => {
            const error = new Error('File not found') as NodeJS.ErrnoException;
            error.code = 'ENOENT';
            const filePath = '/path/to/file.json';
            
            await errorHandler.handleFileSystemError(error, 'read file', filePath);
            
            assert.ok(showErrorMessageStub.calledWith(
                `파일 또는 폴더를 찾을 수 없습니다 (${filePath})`,
                error,
                [
                    '경로가 올바른지 확인하세요',
                    '파일이 삭제되었거나 이동되었는지 확인하세요'
                ]
            ));
        });

        test('should handle invalid path error', async () => {
            const error = new Error('Invalid path') as NodeJS.ErrnoException;
            error.code = 'EINVAL';
            
            await errorHandler.handleFileSystemError(error, 'create directory');
            
            assert.ok(showErrorMessageStub.calledWith(
                '잘못된 경로로 인해 create directory 작업을 수행할 수 없습니다',
                error,
                [
                    '경로에 특수문자가 포함되어 있는지 확인하세요',
                    '경로 길이가 너무 긴지 확인하세요'
                ]
            ));
        });
    });

    suite('getErrorSuggestions', () => {
        test('should provide suggestions for permission errors', () => {
            const error = new Error('Permission denied') as NodeJS.ErrnoException;
            error.code = 'EACCES';
            
            const suggestions = errorHandler.getErrorSuggestions(error);
            
            assert.ok(suggestions.includes('관리자 권한으로 VS Code 실행'));
            assert.ok(suggestions.includes('파일/폴더 권한 확인'));
            assert.ok(suggestions.includes('바이러스 백신 소프트웨어 확인'));
        });

        test('should provide context-specific suggestions', () => {
            const error = new Error('Validation failed');
            
            const suggestions = errorHandler.getErrorSuggestions(error, 'agent_creation');
            
            assert.ok(suggestions.includes('Agent 이름 규칙 확인'));
            assert.ok(suggestions.includes('.amazonq/cli-agents/ 폴더 권한 확인'));
        });
    });

    suite('isRecoverableError', () => {
        test('should identify recoverable errors', () => {
            const validationError = new Error('Invalid name');
            assert.strictEqual(errorHandler.isRecoverableError(validationError), true);

            const existsError = new Error('Agent already exists');
            assert.strictEqual(errorHandler.isRecoverableError(existsError), true);

            const notFoundError = new Error('File not found') as NodeJS.ErrnoException;
            notFoundError.code = 'ENOENT';
            assert.strictEqual(errorHandler.isRecoverableError(notFoundError), true);
        });

        test('should identify non-recoverable errors', () => {
            const permissionError = new Error('Permission denied') as NodeJS.ErrnoException;
            permissionError.code = 'EACCES';
            assert.strictEqual(errorHandler.isRecoverableError(permissionError), false);

            const diskFullError = new Error('No space left') as NodeJS.ErrnoException;
            diskFullError.code = 'ENOSPC';
            assert.strictEqual(errorHandler.isRecoverableError(diskFullError), false);
        });
    });
});