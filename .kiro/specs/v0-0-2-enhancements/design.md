# 설계 문서

## 개요

Agent Manager for Q CLI v0.0.2는 실험적 기능 도구 분리 표시와 글로벌 에이전트 지원을 추가하는 기능 향상입니다. 이 설계는 기존 아키텍처를 확장하여 사용자 경험을 개선하고 더 유연한 에이전트 관리를 제공합니다.

## 아키텍처

### 전체 아키텍처 개요

```
src/
├── core/
│   ├── agent/
│   │   ├── AgentLocationService.ts      # 새로운: 로컬/글로벌 위치 관리
│   │   └── ExperimentalToolsService.ts  # 새로운: 실험적 기능 도구 관리
├── providers/
│   ├── agentTreeProvider.ts             # 수정: 로컬/글로벌 구분 표시
│   └── agentCreationWebviewProvider.ts  # 수정: 실험적 도구 분리, 위치 선택
├── services/
│   ├── agentCreationFormService.ts      # 수정: 글로벌 에이전트 생성 지원
│   └── agentManagementService.ts        # 수정: 다중 위치 에이전트 관리
└── types/
    ├── agentCreation.ts                 # 수정: 새로운 타입 추가
    └── agent.ts                         # 수정: 위치 정보 추가
```

### 핵심 컴포넌트 설계

#### 1. AgentLocationService (새로운 서비스)

**목적:** 로컬과 글로벌 에이전트 위치를 관리하고 경로 해결을 담당

**주요 기능:**
- 로컬 에이전트 디렉토리: `.amazonq/cli-agents/`
- 글로벌 에이전트 디렉토리: `~/.aws/amazonq/cli-agents/`
- 디렉토리 자동 생성
- 에이전트 이름 충돌 감지 및 우선순위 처리

```typescript
interface IAgentLocationService {
    getLocalAgentsPath(): string;
    getGlobalAgentsPath(): string;
    ensureDirectoryExists(location: AgentLocation): Promise<void>;
    resolveAgentPath(name: string, location: AgentLocation): string;
    detectNameConflicts(name: string): Promise<AgentConflictInfo>;
    listAgentsByLocation(): Promise<{ local: AgentItem[], global: AgentItem[] }>;
}

enum AgentLocation {
    Local = 'local',
    Global = 'global'
}

interface AgentConflictInfo {
    hasConflict: boolean;
    localExists: boolean;
    globalExists: boolean;
    recommendedAction: 'use_local' | 'use_global' | 'rename';
}
```

#### 2. ExperimentalToolsService (새로운 서비스)

**목적:** Q CLI의 실험적 기능 도구를 식별하고 관리

**실험적 도구 목록:**
- `knowledge`: 지속적 컨텍스트 저장 및 검색
- `thinking`: 복잡한 추론 과정 표시
- `todo_list`: TODO 목록 생성 및 관리

```typescript
interface IExperimentalToolsService {
    getExperimentalTools(): ExperimentalTool[];
    isExperimentalTool(toolName: string): boolean;
    getExperimentalToolInfo(toolName: string): ExperimentalTool | null;
    getWarningMessage(): string;
}

interface ExperimentalTool extends BuiltInTool {
    isExperimental: true;
    warningLevel: 'info' | 'warning' | 'caution';
    stabilityNote: string;
}
```

### 컴포넌트 및 인터페이스

#### 1. 에이전트 트리 프로바이더 개선

**기존 구조 확장:**
```typescript
interface EnhancedAgentTreeProvider extends AgentTreeProvider {
    // 새로운 메서드
    getAgentsByLocation(): Promise<{ local: AgentItem[], global: AgentItem[] }>;
    showLocationSeparators(): boolean;
    handleNameConflicts(conflicts: AgentConflictInfo[]): void;
}

// 새로운 트리 아이템 타입
interface LocationSeparatorItem {
    label: string; // "Local Agents" | "Global Agents"
    contextValue: 'locationSeparator';
    collapsibleState: vscode.TreeItemCollapsibleState.Expanded;
    children: AgentItem[];
}

interface ConflictWarningItem {
    label: string;
    description: string;
    iconPath: vscode.ThemeIcon; // warning icon
    contextValue: 'conflictWarning';
    tooltip: string;
}
```

#### 2. 에이전트 생성 폼 개선

**새로운 UI 요소:**
```typescript
interface EnhancedAgentFormData extends AgentFormData {
    location: AgentLocation; // 새로운 필드
    tools: {
        available: string[];
        allowed: string[];
        experimental: string[]; // 새로운: 실험적 도구 목록
    };
}

interface ToolSection {
    title: string;
    tools: BuiltInTool[];
    isExperimental: boolean;
    warningMessage?: string;
}
```

### 데이터 모델

#### 1. 에이전트 위치 정보

```typescript
interface AgentItemWithLocation extends AgentItem {
    location: AgentLocation;
    hasConflict: boolean;
    conflictInfo?: AgentConflictInfo;
}

interface AgentConfig {
    name: string;
    description?: string;
    prompt?: string;
    tools: string[];
    allowedTools?: string[];
    resources?: string[];
    // 메타데이터 (파일에 저장되지 않음)
    _metadata?: {
        location: AgentLocation;
        createdAt: Date;
        lastModified: Date;
    };
}
```

#### 2. 실험적 도구 정보

```typescript
interface ExperimentalToolDefinition {
    name: string;
    displayName: string;
    description: string;
    category: 'experimental';
    command?: string;
    features: string[];
    usage?: string[];
    settings?: ExperimentalToolSetting[];
    warningLevel: 'info' | 'warning' | 'caution';
    stabilityNote: string;
}

interface ExperimentalToolSetting {
    key: string;
    type: 'boolean' | 'string' | 'number';
    default: any;
    description: string;
}
```

### 에러 처리

#### 1. 위치 관련 에러

```typescript
enum AgentLocationError {
    DIRECTORY_NOT_ACCESSIBLE = 'DIRECTORY_NOT_ACCESSIBLE',
    PERMISSION_DENIED = 'PERMISSION_DENIED',
    GLOBAL_PATH_NOT_FOUND = 'GLOBAL_PATH_NOT_FOUND',
    NAME_CONFLICT = 'NAME_CONFLICT'
}

interface LocationErrorHandler {
    handleDirectoryCreationError(location: AgentLocation, error: Error): Promise<void>;
    handlePermissionError(location: AgentLocation): Promise<boolean>;
    handleNameConflict(conflict: AgentConflictInfo): Promise<AgentLocation>;
}
```

#### 2. 실험적 도구 관련 에러

```typescript
interface ExperimentalToolWarning {
    toolName: string;
    level: 'info' | 'warning' | 'caution';
    message: string;
    canProceed: boolean;
}
```

### 테스팅 전략

#### 1. 단위 테스트

**AgentLocationService 테스트:**
- 로컬/글로벌 경로 해결
- 디렉토리 생성 및 권한 처리
- 이름 충돌 감지 로직

**ExperimentalToolsService 테스트:**
- 실험적 도구 식별
- 도구 정보 반환
- 경고 메시지 생성

#### 2. 통합 테스트

**에이전트 생성 워크플로우:**
- 로컬 에이전트 생성
- 글로벌 에이전트 생성
- 이름 충돌 시나리오
- 실험적 도구 선택

**트리 뷰 표시:**
- 로컬/글로벌 구분 표시
- 충돌 경고 표시
- 빈 상태 처리

#### 3. 사용자 시나리오 테스트

**시나리오 1: 첫 번째 글로벌 에이전트 생성**
1. 글로벌 디렉토리가 존재하지 않음
2. 자동 디렉토리 생성
3. 에이전트 성공적 생성

**시나리오 2: 이름 충돌 처리**
1. 동일한 이름의 로컬 에이전트 존재
2. 글로벌 에이전트 생성 시도
3. 충돌 경고 및 해결 옵션 제시

**시나리오 3: 실험적 도구 사용**
1. 실험적 도구 섹션 표시
2. 경고 메시지 확인
3. 도구 선택 및 에이전트 생성

### UI/UX 설계

#### 1. 에이전트 트리 뷰 개선

**계층 구조:**
```
📁 Local Agents (2)
├── 🤖 project-helper
└── 🤖 dev-assistant
📁 Global Agents (3)
├── 🤖 general-helper
├── ⚠️ code-reviewer (conflicts with local)
└── 🤖 documentation-writer
```

**시각적 구분:**
- 로컬 에이전트: 일반 아이콘
- 글로벌 에이전트: 글로브 아이콘 오버레이
- 충돌 에이전트: 경고 아이콘

#### 2. 에이전트 생성 폼 개선

**위치 선택 섹션:**
```html
<div class="form-section">
    <h2>Agent Location</h2>
    <div class="radio-group">
        <label>
            <input type="radio" name="location" value="local" checked>
            <span>Local Agent</span>
            <small>Available only in this workspace</small>
        </label>
        <label>
            <input type="radio" name="location" value="global">
            <span>Global Agent</span>
            <small>Available across all workspaces</small>
        </label>
    </div>
</div>
```

**도구 선택 개선:**
```html
<div class="tools-container">
    <div class="tool-section">
        <h3>Standard Tools</h3>
        <div class="tool-grid">
            <!-- 일반 도구들 -->
        </div>
    </div>
    
    <div class="tool-section experimental">
        <h3>
            Experimental Tools
            <span class="warning-badge">⚠️ Experimental</span>
        </h3>
        <div class="experimental-warning">
            These features are in active development and may change.
        </div>
        <div class="tool-grid">
            <!-- 실험적 도구들 -->
        </div>
    </div>
</div>
```

### 성능 고려사항

#### 1. 파일 시스템 최적화

**캐싱 전략:**
- 에이전트 목록 캐싱 (5분 TTL)
- 디렉토리 존재 여부 캐싱 (1분 TTL)
- 충돌 정보 캐싱 (30초 TTL)

**배치 처리:**
- 여러 위치의 에이전트를 병렬로 로드
- 디렉토리 감시를 통한 실시간 업데이트

#### 2. UI 성능

**지연 로딩:**
- 트리 뷰 항목의 지연 렌더링
- 실험적 도구 정보의 온디맨드 로딩

**메모리 관리:**
- 사용하지 않는 에이전트 정보 정리
- 이벤트 리스너 적절한 해제

### 보안 고려사항

#### 1. 파일 시스템 접근

**권한 검증:**
- 글로벌 디렉토리 생성 권한 확인
- 파일 쓰기 권한 사전 검증

**경로 검증:**
- 경로 탐색 공격 방지
- 허용된 디렉토리 외부 접근 차단

#### 2. 실험적 도구 사용

**사용자 동의:**
- 실험적 도구 사용에 대한 명시적 경고
- 안정성 정보 제공

### 호환성

#### 1. 기존 에이전트와의 호환성

**마이그레이션 전략:**
- 기존 로컬 에이전트 자동 인식
- 설정 파일 형식 하위 호환성 유지

#### 2. Q CLI 버전 호환성

**실험적 기능 감지:**
- Q CLI 버전별 실험적 기능 지원 확인
- 미지원 기능에 대한 적절한 안내