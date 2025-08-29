import * as vscode from 'vscode';

/**
 * IDE 타입 열거형
 */
export enum IDEType {
    VSCode = 'vscode',
    Kiro = 'kiro',
    Unknown = 'unknown'
}

/**
 * IDE 정보 인터페이스
 */
export interface IDEInfo {
    type: IDEType;
    version?: string;
    supportedFeatures: string[];
    knownLimitations: string[];
}

/**
 * 호환성 설정 인터페이스
 */
export interface CompatibilityConfig {
    enableFallbacks: boolean;
    strictMode: boolean;
    logCompatibilityIssues: boolean;
    // Webview options removed - using tree view only
}

/**
 * 호환성 서비스 인터페이스
 */
export interface ICompatibilityService {
    detectIDE(): IDEType;
    getIDEInfo(): IDEInfo;
    getSafeExtensionUri(context: vscode.ExtensionContext): vscode.Uri;
    getSafeExtensionPath(context: vscode.ExtensionContext): string;
    // Webview options method removed - using tree view only
    isFeatureSupported(feature: string): boolean;
}

/**
 * 안전한 ExtensionContext 인터페이스
 */
export interface ISafeExtensionContext {
    readonly original: vscode.ExtensionContext;
    readonly extensionUri: vscode.Uri;
    readonly extensionPath: string;
    readonly ideType: IDEType;
    readonly subscriptions: vscode.Disposable[];
}

/**
 * VS Code Extension API 호환성을 관리하는 서비스
 */
export class CompatibilityService implements ICompatibilityService {
    private _ideInfo: IDEInfo | null = null;
    private readonly _config: CompatibilityConfig;

    constructor(config?: Partial<CompatibilityConfig>) {
        this._config = {
            enableFallbacks: true,
            strictMode: false,
            logCompatibilityIssues: true,
            // Webview options removed - using tree view only
            ...config
        };
    }

    /**
     * 현재 실행 중인 IDE 타입을 감지합니다
     */
    public detectIDE(): IDEType {
        try {
            // VS Code의 경우 vscode.env.appName이 'Visual Studio Code'입니다
            const appName = vscode.env.appName?.toLowerCase() || '';
            
            if (appName.includes('visual studio code')) {
                return IDEType.VSCode;
            }
            
            // Kiro IDE 감지 - 여러 방법으로 시도
            if (appName.includes('kiro') || 
                process.env['KIRO_IDE'] === 'true' ||
                (global as any).KIRO_IDE === true) {
                return IDEType.Kiro;
            }

            // 추가적인 Kiro IDE 감지 방법
            // Kiro IDE는 특정 전역 객체나 환경 변수를 가질 수 있습니다
            if (typeof (global as any).kiroIDE !== 'undefined' ||
                typeof (vscode as any).kiro !== 'undefined') {
                return IDEType.Kiro;
            }

            return IDEType.Unknown;
        } catch (error) {
            console.warn('IDE detection failed:', error);
            return IDEType.Unknown;
        }
    }

    /**
     * 현재 IDE의 상세 정보를 반환합니다
     */
    public getIDEInfo(): IDEInfo {
        if (this._ideInfo) {
            return this._ideInfo;
        }

        const ideType = this.detectIDE();
        
        switch (ideType) {
            case IDEType.VSCode:
                this._ideInfo = {
                    type: IDEType.VSCode,
                    version: vscode.version,
                    supportedFeatures: [
                        'treeView',
                        'commands',
                        'extensionUri',
                        'extensionPath'
                    ],
                    knownLimitations: []
                };
                break;

            case IDEType.Kiro:
                this._ideInfo = {
                    type: IDEType.Kiro,
                    version: vscode.version, // Kiro도 VS Code API 버전을 사용
                    supportedFeatures: [
                        'treeView',
                        'commands'
                    ],
                    knownLimitations: [
                        'extensionUri_may_be_undefined',
                        'retainContextWhenHidden_may_not_work',
                        'localResourceRoots_limited'
                    ]
                };
                break;

            default:
                this._ideInfo = {
                    type: IDEType.Unknown,
                    supportedFeatures: ['commands'], // 최소 기능만 가정
                    knownLimitations: ['unknown_api_compatibility']
                };
                break;
        }

        if (this._config.logCompatibilityIssues) {
            console.log('IDE detected:', this._ideInfo);
        }

        return this._ideInfo;
    }

    /**
     * 특정 기능이 지원되는지 확인합니다
     */
    public isFeatureSupported(feature: string): boolean {
        const ideInfo = this.getIDEInfo();
        return ideInfo.supportedFeatures.includes(feature);
    }

    /**
     * 안전한 ExtensionUri를 반환합니다
     */
    public getSafeExtensionUri(context: vscode.ExtensionContext): vscode.Uri {
        try {
            // 먼저 extensionUri 사용 시도
            if (context.extensionUri) {
                return context.extensionUri;
            }

            // extensionUri가 없으면 extensionPath 사용
            if (context.extensionPath) {
                return vscode.Uri.file(context.extensionPath);
            }

            // 둘 다 없으면 현재 디렉토리 사용
            const fallbackPath = __dirname;
            if (this._config.logCompatibilityIssues) {
                console.warn('ExtensionUri and extensionPath not available, using fallback:', fallbackPath);
            }
            
            return vscode.Uri.file(fallbackPath);
        } catch (error) {
            if (this._config.logCompatibilityIssues) {
                console.error('Failed to get safe extension URI:', error);
            }
            
            // 최종 폴백
            return vscode.Uri.file(__dirname);
        }
    }

    /**
     * 안전한 ExtensionPath를 반환합니다
     */
    public getSafeExtensionPath(context: vscode.ExtensionContext): string {
        try {
            // 먼저 extensionPath 사용 시도
            if (context.extensionPath) {
                return context.extensionPath;
            }

            // extensionPath가 없으면 extensionUri에서 추출
            if (context.extensionUri) {
                return context.extensionUri.fsPath;
            }

            // 둘 다 없으면 현재 디렉토리 사용
            const fallbackPath = __dirname;
            if (this._config.logCompatibilityIssues) {
                console.warn('ExtensionPath and extensionUri not available, using fallback:', fallbackPath);
            }
            
            return fallbackPath;
        } catch (error) {
            if (this._config.logCompatibilityIssues) {
                console.error('Failed to get safe extension path:', error);
            }
            
            // 최종 폴백
            return __dirname;
        }
    }

    // Webview options method removed - using tree view only

    /**
     * 안전한 ExtensionContext 래퍼를 생성합니다
     */
    public createSafeContext(context: vscode.ExtensionContext): ISafeExtensionContext {
        return new SafeExtensionContext(context, this);
    }
}

/**
 * 안전한 ExtensionContext 구현체
 */
export class SafeExtensionContext implements ISafeExtensionContext {
    public readonly original: vscode.ExtensionContext;
    public readonly extensionUri: vscode.Uri;
    public readonly extensionPath: string;
    public readonly ideType: IDEType;
    public readonly subscriptions: vscode.Disposable[];

    constructor(context: vscode.ExtensionContext, compatibilityService: CompatibilityService) {
        this.original = context;
        this.ideType = compatibilityService.detectIDE();
        this.subscriptions = context.subscriptions;
        
        // 안전한 extensionUri 설정
        this.extensionUri = compatibilityService.getSafeExtensionUri(context);
        
        // 안전한 extensionPath 설정
        this.extensionPath = compatibilityService.getSafeExtensionPath(context);
    }
}