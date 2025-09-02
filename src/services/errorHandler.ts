import * as vscode from 'vscode';
import { ExtensionLogger } from './logger';
import { ISafeExtensionContext, IDEType } from './compatibilityService';
import { ValidationResult } from '../types/agent';

/**
 * 파일 시스템 오류 타입
 */
export enum FileSystemErrorType {
    PERMISSION_DENIED = 'EACCES',
    FILE_NOT_FOUND = 'ENOENT',
    DISK_FULL = 'ENOSPC',
    FILE_EXISTS = 'EEXIST',
    INVALID_PATH = 'EINVAL',
    NETWORK_ERROR = 'ENETWORK',
    UNKNOWN = 'UNKNOWN'
}

/**
 * Agent 관련 오류 타입
 */
export enum AgentErrorType {
    VALIDATION_FAILED = 'VALIDATION_FAILED',
    NAME_ALREADY_EXISTS = 'NAME_ALREADY_EXISTS',
    INVALID_CONFIG = 'INVALID_CONFIG',
    TEMPLATE_ERROR = 'TEMPLATE_ERROR',
    FILE_SYSTEM_ERROR = 'FILE_SYSTEM_ERROR'
}

/**
 * 오류 핸들러 인터페이스
 */
export interface IErrorHandler {
    handleActivationError(error: Error, context: ISafeExtensionContext): void;
    logCompatibilityIssue(issue: string, context: ISafeExtensionContext): void;
    
    // Agent 관련 오류 처리
    handleAgentCreationError(error: Error, agentName?: string): Promise<void>;
    handleFileSystemError(error: Error, operation: string, filePath?: string): Promise<void>;
    handleValidationError(validation: ValidationResult, context?: string): Promise<void>;
    handleFileAccessError(error: Error, filePath: string): Promise<void>;
    
    // 사용자 피드백
    showSuccessMessage(message: string, actions?: string[]): Promise<string | undefined>;
    showErrorMessage(message: string, error?: Error, actions?: string[]): Promise<string | undefined>;
    showWarningMessage(message: string, actions?: string[]): Promise<string | undefined>;
    
    // 오류 분석
    categorizeError(error: Error): FileSystemErrorType | AgentErrorType;
    getErrorSuggestions(error: Error, context?: string): string[];
    isRecoverableError(error: Error): boolean;
}

/**
 * 포괄적인 오류 처리 서비스
 * Agent 관리, 파일 시스템, 유효성 검사 등의 오류를 처리하고 사용자 피드백을 제공
 */
export class ErrorHandler implements IErrorHandler {
    private readonly logger: ExtensionLogger;

    constructor(logger: ExtensionLogger) {
        this.logger = logger;
    }

    /**
     * 익스텐션 활성화 오류 처리
     */
    public handleActivationError(error: Error, context: ISafeExtensionContext): void {
        const errorMessage = `Extension activation failed on ${context.ideType} IDE`;
        
        this.logger.error(errorMessage, error);
        this.logger.logCompatibility(`Activation error details`, {
            ideType: context.ideType,
            errorName: error.name,
            errorMessage: error.message,
            stack: error.stack
        });

        // IDE별 맞춤 오류 메시지
        let userMessage = 'Q CLI Agent Manager 익스텐션을 활성화할 수 없습니다.';
        
        switch (context.ideType) {
            case IDEType.Kiro:
                userMessage += ' Kiro IDE 호환성 문제일 수 있습니다. 최신 버전을 사용하고 있는지 확인해주세요.';
                break;
            case IDEType.VSCode:
                userMessage += ' VS Code를 재시작하거나 익스텐션을 다시 설치해보세요.';
                break;
            default:
                userMessage += ' 지원되지 않는 IDE이거나 호환성 문제가 있을 수 있습니다.';
                break;
        }

        vscode.window.showErrorMessage(userMessage, '자세히 보기').then(selection => {
            if (selection === '자세히 보기') {
                this.showDetailedError(error, context);
            }
        });
    }

    // Webview creation error handler removed - using tree view only

    /**
     * 호환성 문제 로깅
     */
    public logCompatibilityIssue(issue: string, context: ISafeExtensionContext): void {
        this.logger.logCompatibility(`Compatibility issue detected: ${issue}`, {
            ideType: context.ideType,
            extensionUri: context.extensionUri.toString(),
            extensionPath: context.extensionPath
        });
    }

    /**
     * 상세 오류 정보 표시
     */
    private showDetailedError(error: Error, context: ISafeExtensionContext): void {
        const errorDetails = [
            `오류 이름: ${error.name}`,
            `오류 메시지: ${error.message}`,
            `IDE 타입: ${context.ideType}`,
            `Extension URI: ${context.extensionUri.toString()}`,
            `Extension Path: ${context.extensionPath}`,
            '',
            '스택 트레이스:',
            error.stack || '스택 트레이스를 사용할 수 없습니다.'
        ].join('\n');

        // 새 문서에 오류 정보 표시
        vscode.workspace.openTextDocument({
            content: errorDetails,
            language: 'plaintext'
        }).then(doc => {
            vscode.window.showTextDocument(doc);
        });
    }

    // Error action handler removed - no longer needed without webview

    /**
     * Agent 생성 오류 처리
     */
    public async handleAgentCreationError(error: Error, agentName?: string): Promise<void> {
        const errorType = this.categorizeError(error);
        const context = agentName ? `agent '${agentName}'` : 'agent';
        
        this.logger.error(`Agent creation failed for ${context}`, error);
        
        let userMessage = `Agent 생성에 실패했습니다`;
        if (agentName) {
            userMessage += ` (${agentName})`;
        }
        
        const suggestions = this.getErrorSuggestions(error, 'agent_creation');
        
        switch (errorType) {
            case AgentErrorType.NAME_ALREADY_EXISTS:
                userMessage = `Agent '${agentName}'은(는) 이미 존재합니다. 다른 이름을 사용해주세요.`;
                await this.showErrorMessage(userMessage);
                break;
                
            case AgentErrorType.VALIDATION_FAILED:
                userMessage += ': 입력한 정보가 올바르지 않습니다.';
                await this.showErrorMessage(userMessage, error, suggestions);
                break;
                
            case FileSystemErrorType.PERMISSION_DENIED:
                userMessage += ': 파일을 생성할 권한이 없습니다.';
                await this.showErrorMessage(userMessage, error, [
                    '폴더 권한 확인',
                    '관리자 권한으로 실행',
                    '다른 위치에서 시도'
                ]);
                break;
                
            case FileSystemErrorType.DISK_FULL:
                userMessage += ': 디스크 공간이 부족합니다.';
                await this.showErrorMessage(userMessage, error, [
                    '디스크 정리',
                    '다른 드라이브 사용'
                ]);
                break;
                
            default:
                await this.showErrorMessage(userMessage, error, suggestions);
                break;
        }
    }

    /**
     * 파일 시스템 오류 처리
     */
    public async handleFileSystemError(error: Error, operation: string, filePath?: string): Promise<void> {
        const errorType = this.categorizeError(error);
        const context = filePath ? ` (${filePath})` : '';
        
        this.logger.error(`File system error during ${operation}${context}`, error);
        
        let userMessage = `파일 시스템 작업 실패: ${operation}`;
        const suggestions: string[] = [];
        
        switch (errorType) {
            case FileSystemErrorType.PERMISSION_DENIED:
                userMessage = `권한이 없어 ${operation} 작업을 수행할 수 없습니다${context}`;
                suggestions.push('파일/폴더 권한을 확인하세요');
                suggestions.push('관리자 권한으로 VS Code를 실행하세요');
                if (filePath) {
                    suggestions.push('파일이 다른 프로그램에서 사용 중인지 확인하세요');
                }
                break;
                
            case FileSystemErrorType.FILE_NOT_FOUND:
                userMessage = `파일 또는 폴더를 찾을 수 없습니다${context}`;
                suggestions.push('경로가 올바른지 확인하세요');
                suggestions.push('파일이 삭제되었거나 이동되었는지 확인하세요');
                break;
                
            case FileSystemErrorType.DISK_FULL:
                userMessage = `디스크 공간이 부족하여 ${operation} 작업을 완료할 수 없습니다`;
                suggestions.push('디스크 정리를 수행하세요');
                suggestions.push('불필요한 파일을 삭제하세요');
                suggestions.push('다른 드라이브를 사용하세요');
                break;
                
            case FileSystemErrorType.FILE_EXISTS:
                userMessage = `파일이 이미 존재하여 ${operation} 작업을 완료할 수 없습니다${context}`;
                suggestions.push('다른 이름을 사용하세요');
                suggestions.push('기존 파일을 삭제하거나 이동하세요');
                break;
                
            case FileSystemErrorType.INVALID_PATH:
                userMessage = `잘못된 경로로 인해 ${operation} 작업을 수행할 수 없습니다${context}`;
                suggestions.push('경로에 특수문자가 포함되어 있는지 확인하세요');
                suggestions.push('경로 길이가 너무 긴지 확인하세요');
                break;
                
            default:
                userMessage += context;
                suggestions.push('잠시 후 다시 시도하세요');
                suggestions.push('VS Code를 재시작하세요');
                break;
        }
        
        await this.showErrorMessage(userMessage, error, suggestions);
    }

    /**
     * 유효성 검사 오류 처리
     */
    public async handleValidationError(validation: ValidationResult, context?: string): Promise<void> {
        if (validation.isValid) {
            return;
        }
        
        const contextStr = context ? ` (${context})` : '';
        this.logger.warn(`Validation failed${contextStr}`, { errors: validation.errors, warnings: validation.warnings });
        
        let message = '입력한 정보가 올바르지 않습니다';
        if (context) {
            message += ` - ${context}`;
        }
        
        // 구체적인 오류 메시지 생성
        if (validation.errors.length === 1 && validation.errors[0]) {
            message = validation.errors[0];
        } else if (validation.errors.length > 1) {
            message += ':\n' + validation.errors.map(error => `• ${error}`).join('\n');
        }
        
        // 경고가 있는 경우 별도 처리
        if (validation.warnings && validation.warnings.length > 0) {
            const warningMessage = '다음 사항을 확인해주세요:\n' + 
                validation.warnings.map(warning => `• ${warning}`).join('\n');
            await this.showWarningMessage(warningMessage);
        }
        
        await this.showErrorMessage(message);
    }

    /**
     * 파일 접근 오류 처리 (Agent 파일 열기 등)
     */
    public async handleFileAccessError(error: Error, filePath: string): Promise<void> {
        const errorType = this.categorizeError(error);
        
        this.logger.error(`File access error for ${filePath}`, error);
        
        let userMessage = `파일에 접근할 수 없습니다: ${filePath}`;
        const suggestions: string[] = [];
        
        switch (errorType) {
            case FileSystemErrorType.FILE_NOT_FOUND:
                userMessage = `파일을 찾을 수 없습니다: ${filePath}`;
                suggestions.push('파일이 삭제되었거나 이동되었는지 확인하세요');
                suggestions.push('Agent 목록을 새로고침하세요');
                suggestions.push('Agent를 다시 생성하세요');
                break;
                
            case FileSystemErrorType.PERMISSION_DENIED:
                userMessage = `파일에 접근할 권한이 없습니다: ${filePath}`;
                suggestions.push('파일 권한을 확인하세요');
                suggestions.push('관리자 권한으로 VS Code를 실행하세요');
                suggestions.push('파일이 다른 프로그램에서 사용 중인지 확인하세요');
                break;
                
            default:
                suggestions.push('파일 경로가 올바른지 확인하세요');
                suggestions.push('잠시 후 다시 시도하세요');
                suggestions.push('VS Code를 재시작하세요');
                break;
        }
        
        await this.showErrorMessage(userMessage, error, suggestions);
    }

    /**
     * 성공 메시지 표시
     */
    public async showSuccessMessage(message: string, actions?: string[]): Promise<string | undefined> {
        this.logger.info(`Success: ${message}`);
        
        if (actions && actions.length > 0) {
            return await vscode.window.showInformationMessage(message, ...actions);
        } else {
            await vscode.window.showInformationMessage(message);
            return undefined;
        }
    }

    /**
     * 오류 메시지 표시
     */
    public async showErrorMessage(message: string, error?: Error, actions?: string[]): Promise<string | undefined> {
        this.logger.error(`Error shown to user: ${message}`, error);
        
        if (actions && actions.length > 0) {
            return await vscode.window.showErrorMessage(message, ...actions);
        } else {
            await vscode.window.showErrorMessage(message);
            return undefined;
        }
    }

    /**
     * 경고 메시지 표시
     */
    public async showWarningMessage(message: string, actions?: string[]): Promise<string | undefined> {
        this.logger.warn(`Warning shown to user: ${message}`);
        
        if (actions && actions.length > 0) {
            return await vscode.window.showWarningMessage(message, ...actions);
        } else {
            await vscode.window.showWarningMessage(message);
            return undefined;
        }
    }

    /**
     * 오류 분류
     */
    public categorizeError(error: Error): FileSystemErrorType | AgentErrorType {
        const errorCode = (error as NodeJS.ErrnoException).code;
        const errorMessage = error.message.toLowerCase();
        
        // 파일 시스템 오류 분류
        switch (errorCode) {
            case 'EACCES':
            case 'EPERM':
                return FileSystemErrorType.PERMISSION_DENIED;
            case 'ENOENT':
                return FileSystemErrorType.FILE_NOT_FOUND;
            case 'ENOSPC':
                return FileSystemErrorType.DISK_FULL;
            case 'EEXIST':
                return FileSystemErrorType.FILE_EXISTS;
            case 'EINVAL':
                return FileSystemErrorType.INVALID_PATH;
        }
        
        // Agent 관련 오류 분류
        if (errorMessage.includes('already exists')) {
            return AgentErrorType.NAME_ALREADY_EXISTS;
        }
        
        if (errorMessage.includes('invalid') && (
            errorMessage.includes('name') || 
            errorMessage.includes('validation') ||
            errorMessage.includes('config')
        )) {
            return AgentErrorType.VALIDATION_FAILED;
        }
        
        if (errorMessage.includes('json') || errorMessage.includes('parse')) {
            return AgentErrorType.INVALID_CONFIG;
        }
        
        if (errorMessage.includes('template')) {
            return AgentErrorType.TEMPLATE_ERROR;
        }
        
        // 파일 시스템 관련 키워드 확인
        if (errorMessage.includes('permission') || errorMessage.includes('access')) {
            return FileSystemErrorType.PERMISSION_DENIED;
        }
        
        if (errorMessage.includes('not found') || errorMessage.includes('no such file')) {
            return FileSystemErrorType.FILE_NOT_FOUND;
        }
        
        if (errorMessage.includes('space') || errorMessage.includes('disk full')) {
            return FileSystemErrorType.DISK_FULL;
        }
        
        return FileSystemErrorType.UNKNOWN;
    }

    /**
     * 오류에 대한 해결 제안 생성
     */
    public getErrorSuggestions(error: Error, context?: string): string[] {
        const errorType = this.categorizeError(error);
        const suggestions: string[] = [];
        
        switch (errorType) {
            case FileSystemErrorType.PERMISSION_DENIED:
                suggestions.push('관리자 권한으로 VS Code 실행');
                suggestions.push('파일/폴더 권한 확인');
                suggestions.push('바이러스 백신 소프트웨어 확인');
                break;
                
            case FileSystemErrorType.DISK_FULL:
                suggestions.push('디스크 정리 수행');
                suggestions.push('임시 파일 삭제');
                suggestions.push('다른 드라이브 사용');
                break;
                
            case FileSystemErrorType.FILE_NOT_FOUND:
                suggestions.push('경로 확인');
                suggestions.push('파일 존재 여부 확인');
                suggestions.push('워크스페이스 새로고침');
                break;
                
            case AgentErrorType.VALIDATION_FAILED:
                suggestions.push('입력 형식 확인');
                suggestions.push('특수문자 사용 제한 확인');
                suggestions.push('길이 제한 확인');
                break;
                
            case AgentErrorType.NAME_ALREADY_EXISTS:
                suggestions.push('다른 이름 사용');
                suggestions.push('기존 Agent 확인');
                break;
                
            case AgentErrorType.INVALID_CONFIG:
                suggestions.push('JSON 형식 확인');
                suggestions.push('필수 필드 확인');
                suggestions.push('스키마 검증');
                break;
                
            default:
                suggestions.push('잠시 후 다시 시도');
                suggestions.push('VS Code 재시작');
                suggestions.push('익스텐션 재설치');
                break;
        }
        
        // 컨텍스트별 추가 제안
        if (context === 'agent_creation') {
            suggestions.push('Agent 이름 규칙 확인');
            suggestions.push('.amazonq/cli-agents/ 폴더 권한 확인');
        }
        
        return suggestions;
    }

    /**
     * 복구 가능한 오류인지 확인
     */
    public isRecoverableError(error: Error): boolean {
        const errorType = this.categorizeError(error);
        
        const recoverableTypes = [
            FileSystemErrorType.FILE_NOT_FOUND,
            FileSystemErrorType.INVALID_PATH,
            AgentErrorType.VALIDATION_FAILED,
            AgentErrorType.NAME_ALREADY_EXISTS,
            AgentErrorType.INVALID_CONFIG
        ];
        
        return recoverableTypes.includes(errorType as any);
    }

    /**
     * 오류에 대한 복구 제안 생성 (기존 호환성 유지)
     */
    public getRecoverySuggestions(error: Error, context: ISafeExtensionContext): string[] {
        const suggestions: string[] = [];

        if (error.message.includes('tree view')) {
            suggestions.push('Activity Bar에서 Q CLI Agent Manager 아이콘을 확인하세요');
            suggestions.push('IDE를 재시작 후 다시 시도');
        }

        if (error.message.includes('extension')) {
            suggestions.push('익스텐션을 다시 설치');
            suggestions.push('VS Code/Kiro IDE 업데이트 확인');
        }

        if (context.ideType === IDEType.Kiro) {
            suggestions.push('Kiro IDE 호환 모드로 실행');
            suggestions.push('VS Code에서 테스트해보기');
        }

        return suggestions;
    }
}