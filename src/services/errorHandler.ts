import * as vscode from 'vscode';
import { ExtensionLogger } from './logger';
import { ISafeExtensionContext, IDEType } from './compatibilityService';

/**
 * 오류 핸들러 인터페이스
 */
export interface IErrorHandler {
    handleActivationError(error: Error, context: ISafeExtensionContext): void;
    logCompatibilityIssue(issue: string, context: ISafeExtensionContext): void;
}

/**
 * 호환성 관련 오류를 처리하는 서비스
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
        let userMessage = 'Q CLI Context Manager 익스텐션을 활성화할 수 없습니다.';
        
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
     * 복구 가능한 오류인지 확인
     */
    public isRecoverableError(error: Error): boolean {
        const recoverableErrors = [
            'tree view creation failed',
            'extension uri not found',
            'local resource roots invalid'
        ];

        return recoverableErrors.some(pattern => 
            error.message.toLowerCase().includes(pattern)
        );
    }

    /**
     * 오류에 대한 복구 제안 생성
     */
    public getRecoverySuggestions(error: Error, context: ISafeExtensionContext): string[] {
        const suggestions: string[] = [];

        if (error.message.includes('tree view')) {
            suggestions.push('Activity Bar에서 Q CLI Context Manager 아이콘을 확인하세요');
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