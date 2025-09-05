# 설계 문서

## 개요

v0.0.4에서는 Amazon Q CLI Agent Manager에 Hook 설정 기능을 추가합니다. 이 기능은 기존 에이전트 생성 마법사에 새로운 단계를 추가하여 사용자가 Context Hook을 쉽게 구성할 수 있도록 합니다. Hook은 에이전트 실행 시 자동으로 컨텍스트를 주입하는 기능으로, 대화 시작 시(conversation_start) 또는 각 프롬프트마다(per_prompt) 실행됩니다.

## 아키텍처

### 기존 마법사 구조 확장

현재 마법사는 5단계로 구성되어 있습니다:
1. BasicProperties (기본 속성)
2. AgentLocation (에이전트 위치)
3. ToolsSelection (도구 선택)
4. Resources (리소스)
5. Summary (요약)

Hook 설정을 4.5단계로 추가하여 Resources 단계 이후, Summary 단계 이전에 배치합니다.

### 새로운 마법사 단계 구조

```
1. BasicProperties (기본 속성)
2. AgentLocation (에이전트 위치)  
3. ToolsSelection (도구 선택)
4. Resources (리소스)
5. HookConfiguration (Hook 설정) ← 새로 추가
6. Summary (요약)
```

## 컴포넌트 및 인터페이스

### 1. 타입 정의 확장

#### WizardStep 열거형 업데이트
```typescript
export enum WizardStep {
    BasicProperties = 1,
    AgentLocation = 2,
    ToolsSelection = 3,
    Resources = 4,
    HookConfiguration = 5,  // 새로 추가
    Summary = 6             // 기존 5에서 6으로 변경
}
```

#### Hook 관련 새로운 타입 정의
```typescript
export interface HookTemplate {
    id: string;
    name: string;
    description: string;
    trigger: 'agentSpawn' | 'userPromptSubmit';
    command: string;
    category: 'git' | 'project' | 'system' | 'custom';
    isReadOnly: boolean;
    securityLevel: 'safe' | 'caution' | 'warning';
}

export interface HookConfigurationData {
    hooks: AgentHook[];
    skipHooks: boolean;
}

export interface AgentHook {
    id: string;
    name: string;
    trigger: 'agentSpawn' | 'userPromptSubmit';
    command: string;
    isCustom: boolean;
    templateId?: string;
}

export interface HookValidationResult {
    isValid: boolean;
    errors: string[];
    warnings: string[];
    securityWarnings: string[];
}
```

#### WizardState 인터페이스 확장
```typescript
export interface WizardState {
    currentStep: WizardStep;
    totalSteps: number;
    stepData: {
        basicProperties: BasicPropertiesData;
        agentLocation: AgentLocationData;
        toolsSelection: ToolsSelectionData;
        resources: ResourcesData;
        hookConfiguration: HookConfigurationData;  // 새로 추가
    };
    validation: {
        [key in WizardStep]?: ValidationResult;
    };
    isComplete: boolean;
}
```

### 2. Hook 템플릿 서비스

#### HookTemplateService 클래스
```typescript
export class HookTemplateService {
    private readonly predefinedTemplates: HookTemplate[];
    
    constructor() {
        this.predefinedTemplates = this.initializePredefinedTemplates();
    }
    
    getTemplates(): HookTemplate[] {
        return this.predefinedTemplates;
    }
    
    getTemplateById(id: string): HookTemplate | undefined {
        return this.predefinedTemplates.find(t => t.id === id);
    }
    
    getTemplatesByCategory(category: string): HookTemplate[] {
        return this.predefinedTemplates.filter(t => t.category === category);
    }
    
    private initializePredefinedTemplates(): HookTemplate[] {
        return [
            {
                id: 'git-status',
                name: 'Git 상태 확인',
                description: '각 프롬프트마다 현재 Git 상태를 표시합니다',
                trigger: 'userPromptSubmit',
                command: 'git status --short',
                category: 'git',
                isReadOnly: true,
                securityLevel: 'safe'
            },
            {
                id: 'project-info',
                name: '프로젝트 정보',
                description: '대화 시작 시 프로젝트 이름과 기본 정보를 표시합니다',
                trigger: 'agentSpawn',
                command: 'echo "Project: $(basename $(pwd)) | Language: $(find . -name "*.json" -o -name "*.js" -o -name "*.ts" -o -name "*.py" | head -1 | sed \'s/.*\\.//\')"',
                category: 'project',
                isReadOnly: true,
                securityLevel: 'safe'
            },
            {
                id: 'current-branch',
                name: '현재 브랜치 정보',
                description: '대화 시작 시 현재 Git 브랜치를 표시합니다',
                trigger: 'agentSpawn',
                command: 'git branch --show-current',
                category: 'git',
                isReadOnly: true,
                securityLevel: 'safe'
            }
        ];
    }
}
```

### 3. Hook 유효성 검사 서비스

#### HookValidationService 클래스
```typescript
export class HookValidationService {
    private readonly dangerousCommands = [
        'rm', 'del', 'delete', 'format', 'mkfs',
        'dd', 'fdisk', 'parted', 'shutdown', 'reboot',
        'sudo', 'su', 'chmod 777', 'chown'
    ];
    
    private readonly networkCommands = [
        'curl', 'wget', 'ssh', 'scp', 'rsync',
        'nc', 'netcat', 'telnet', 'ftp'
    ];
    
    validateHook(hook: AgentHook): HookValidationResult {
        const result: HookValidationResult = {
            isValid: true,
            errors: [],
            warnings: [],
            securityWarnings: []
        };
        
        // 이름 유효성 검사
        if (!hook.name.trim()) {
            result.errors.push('Hook 이름은 필수입니다');
            result.isValid = false;
        } else if (!/^[a-zA-Z0-9가-힣\-_\s]+$/.test(hook.name)) {
            result.errors.push('Hook 이름에는 특수문자를 사용할 수 없습니다');
            result.isValid = false;
        }
        
        // 명령어 유효성 검사
        if (!hook.command.trim()) {
            result.errors.push('명령어는 필수입니다');
            result.isValid = false;
        } else {
            this.validateCommand(hook.command, result);
        }
        
        return result;
    }
    
    private validateCommand(command: string, result: HookValidationResult): void {
        const lowerCommand = command.toLowerCase();
        
        // 위험한 명령어 검사
        for (const dangerous of this.dangerousCommands) {
            if (lowerCommand.includes(dangerous)) {
                result.securityWarnings.push(`위험한 명령어가 감지되었습니다: ${dangerous}`);
                result.warnings.push('이 명령어는 시스템에 영향을 줄 수 있습니다');
            }
        }
        
        // 네트워크 명령어 검사
        for (const network of this.networkCommands) {
            if (lowerCommand.includes(network)) {
                result.securityWarnings.push(`네트워크 명령어가 감지되었습니다: ${network}`);
                result.warnings.push('네트워크 명령어는 보안상 주의가 필요합니다');
            }
        }
        
        // 파이프 및 리다이렉션 검사
        if (command.includes('|') || command.includes('>') || command.includes('>>')) {
            result.warnings.push('파이프나 리다이렉션 사용 시 출력 크기에 주의하세요');
        }
    }
    
    validateHookList(hooks: AgentHook[]): HookValidationResult {
        const result: HookValidationResult = {
            isValid: true,
            errors: [],
            warnings: [],
            securityWarnings: []
        };
        
        // 중복 이름 검사
        const names = hooks.map(h => h.name.toLowerCase());
        const duplicates = names.filter((name, index) => names.indexOf(name) !== index);
        if (duplicates.length > 0) {
            result.errors.push('중복된 Hook 이름이 있습니다');
            result.isValid = false;
        }
        
        // 개별 Hook 유효성 검사
        for (const hook of hooks) {
            const hookResult = this.validateHook(hook);
            if (!hookResult.isValid) {
                result.isValid = false;
                result.errors.push(...hookResult.errors);
            }
            result.warnings.push(...hookResult.warnings);
            result.securityWarnings.push(...hookResult.securityWarnings);
        }
        
        return result;
    }
}
```

### 4. 마법사 상태 서비스 확장

#### WizardStateService 업데이트
```typescript
// 기존 WizardStateService에 Hook 관련 메서드 추가
export class WizardStateService implements IWizardStateService {
    // ... 기존 코드 ...
    
    private initializeDefaultState(): WizardState {
        return {
            currentStep: WizardStep.BasicProperties,
            totalSteps: 6, // 5에서 6으로 변경
            stepData: {
                basicProperties: { name: '', description: '', prompt: '' },
                agentLocation: { location: 'local' },
                toolsSelection: { standardTools: [], experimentalTools: [] },
                resources: { resources: [] },
                hookConfiguration: { hooks: [], skipHooks: false } // 새로 추가
            },
            validation: {},
            isComplete: false
        };
    }
    
    updateHookConfiguration(data: Partial<HookConfigurationData>): void {
        this.state.stepData.hookConfiguration = {
            ...this.state.stepData.hookConfiguration,
            ...data
        };
    }
    
    addHook(hook: AgentHook): void {
        this.state.stepData.hookConfiguration.hooks.push(hook);
    }
    
    removeHook(hookId: string): void {
        this.state.stepData.hookConfiguration.hooks = 
            this.state.stepData.hookConfiguration.hooks.filter(h => h.id !== hookId);
    }
    
    updateHook(hookId: string, updates: Partial<AgentHook>): void {
        const hookIndex = this.state.stepData.hookConfiguration.hooks.findIndex(h => h.id === hookId);
        if (hookIndex !== -1) {
            this.state.stepData.hookConfiguration.hooks[hookIndex] = {
                ...this.state.stepData.hookConfiguration.hooks[hookIndex],
                ...updates
            };
        }
    }
}
```

### 5. 마법사 유효성 검사 서비스 확장

#### WizardValidationService 업데이트
```typescript
export class WizardValidationService implements IWizardValidationService {
    private hookValidationService: HookValidationService;
    
    constructor(private readonly logger: ExtensionLogger) {
        this.hookValidationService = new HookValidationService();
    }
    
    async validateStep(step: WizardStep, stepData: WizardState['stepData']): Promise<ValidationResult> {
        switch (step) {
            // ... 기존 케이스들 ...
            
            case WizardStep.HookConfiguration:
                return this.validateHookConfiguration(stepData.hookConfiguration);
                
            default:
                return { isValid: true, errors: [] };
        }
    }
    
    private validateHookConfiguration(data: HookConfigurationData): ValidationResult {
        // Hook을 건너뛰는 경우 항상 유효
        if (data.skipHooks) {
            return { isValid: true, errors: [] };
        }
        
        // Hook이 없어도 유효 (선택사항)
        if (data.hooks.length === 0) {
            return { isValid: true, errors: [] };
        }
        
        // Hook 목록 유효성 검사
        const hookResult = this.hookValidationService.validateHookList(data.hooks);
        
        return {
            isValid: hookResult.isValid,
            errors: hookResult.errors,
            warnings: hookResult.warnings
        };
    }
}
```

## 데이터 모델

### Hook 데이터 구조

에이전트 JSON 파일에서 Hook은 다음과 같은 구조로 저장됩니다:

```json
{
  "hooks": {
    "agentSpawn": [
      {
        "command": "git branch --show-current"
      },
      {
        "command": "echo 'Project: '$(basename $(pwd))"
      }
    ],
    "userPromptSubmit": [
      {
        "command": "git status --short"
      }
    ]
  }
}
```

### Hook 템플릿 데이터

미리 정의된 Hook 템플릿:

1. **Git 상태 확인**
   - 트리거: `userPromptSubmit` (각 프롬프트마다)
   - 명령어: `git status --short`
   - 설명: 현재 Git 저장소의 상태를 간단히 표시

2. **프로젝트 정보**
   - 트리거: `agentSpawn` (대화 시작 시)
   - 명령어: `echo "Project: $(basename $(pwd)) | Language: $(find . -name "*.json" -o -name "*.js" -o -name "*.ts" -o -name "*.py" | head -1 | sed 's/.*\.//')"`
   - 설명: 프로젝트 이름과 주요 언어 정보 표시

3. **현재 브랜치 정보**
   - 트리거: `agentSpawn` (대화 시작 시)
   - 명령어: `git branch --show-current`
   - 설명: 현재 작업 중인 Git 브랜치 표시

## 오류 처리

### 1. Hook 유효성 검사 오류

- **이름 오류**: 빈 이름, 특수문자 포함, 중복 이름
- **명령어 오류**: 빈 명령어, 구문 오류
- **보안 경고**: 위험한 명령어, 네트워크 명령어 감지

### 2. Hook 실행 오류 (런타임)

- **권한 오류**: 명령어 실행 권한 부족
- **명령어 오류**: 존재하지 않는 명령어
- **타임아웃 오류**: 5초 초과 실행

### 3. 오류 복구 전략

- **유효성 검사 실패**: 사용자에게 구체적인 오류 메시지 표시 및 수정 가이드 제공
- **저장 실패**: 재시도 옵션 제공 또는 Hook 없이 에이전트 생성 계속
- **템플릿 로드 실패**: 기본 템플릿으로 폴백 또는 사용자 정의 Hook만 허용

## 테스트 전략

### 1. 단위 테스트

- **HookTemplateService**: 템플릿 로드, 필터링, 검색 기능
- **HookValidationService**: 다양한 Hook 유효성 검사 시나리오
- **WizardStateService**: Hook 관련 상태 관리 메서드

### 2. 통합 테스트

- **마법사 플로우**: Hook 설정 단계를 포함한 전체 에이전트 생성 플로우
- **JSON 생성**: Hook 설정이 올바른 JSON 형식으로 저장되는지 확인
- **유효성 검사 통합**: 마법사와 유효성 검사 서비스 간의 상호작용

### 3. UI 테스트

- **템플릿 선택**: 미리 정의된 템플릿 선택 및 적용
- **사용자 정의 Hook**: 직접 Hook 생성 및 편집
- **유효성 검사 피드백**: 실시간 오류 및 경고 메시지 표시
- **건너뛰기 기능**: Hook 설정을 건너뛰고 다음 단계로 진행

### 4. 보안 테스트

- **위험한 명령어 감지**: 시스템에 해를 끼칠 수 있는 명령어 차단
- **입력 검증**: 악의적인 입력에 대한 방어
- **권한 검사**: 적절한 권한 없이 실행되는 명령어 방지

## 성능 고려사항

### 1. 템플릿 로딩

- 미리 정의된 템플릿은 메모리에 캐시하여 빠른 접근
- 템플릿 수가 증가해도 성능 영향 최소화

### 2. 유효성 검사

- 실시간 유효성 검사는 디바운싱을 통해 과도한 호출 방지
- 복잡한 명령어 분석은 백그라운드에서 수행

### 3. UI 반응성

- Hook 목록 렌더링 시 가상화 고려 (많은 Hook이 있을 경우)
- 폼 입력 시 즉각적인 피드백 제공

## 보안 고려사항

### 1. 명령어 실행 보안

- 사용자가 입력한 명령어는 실행 전 유효성 검사 필수
- 위험한 명령어 패턴 감지 및 경고
- 네트워크 관련 명령어에 대한 특별한 주의

### 2. 입력 검증

- 모든 사용자 입력에 대한 적절한 검증 및 이스케이핑
- XSS 및 인젝션 공격 방지
- 파일 경로 조작 방지

### 3. 권한 관리

- Hook 실행은 사용자 권한 내에서만 수행
- 관리자 권한이 필요한 명령어에 대한 명시적 경고
- 민감한 정보 노출 방지 가이드라인 제공