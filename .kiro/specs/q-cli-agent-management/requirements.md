# Requirements Document

## Introduction

이 기능은 VS Code 익스텐션 내에서 Amazon Q CLI의 Local custom agents를 시각적으로 관리할 수 있는 기능을 제공합니다. 사용자는 현재 작업 디렉토리의 `.amazonq/cli-agents/` 경로에 있는 agent 설정 파일들을 확인하고, 새로운 agent를 생성할 수 있습니다. 익스텐션 윈도우를 상하로 분할하여 상단에는 agent 목록을, 하단에는 기존 컨텍스트 관리 기능을 배치합니다.

## Requirements

### Requirement 1

**User Story:** 개발자로서, 현재 프로젝트에 설정된 Q CLI agents를 한눈에 볼 수 있기를 원합니다. 그래야 어떤 agents가 사용 가능한지 쉽게 파악할 수 있습니다.

#### Acceptance Criteria

1. WHEN 익스텐션이 활성화되면 THEN 시스템은 현재 작업 디렉토리의 `.amazonq/cli-agents/` 경로를 스캔해야 합니다
2. WHEN `.amazonq/cli-agents/` 디렉토리에 `.json` 파일이 존재하면 THEN 시스템은 해당 파일들을 agent 목록으로 표시해야 합니다
3. WHEN agent 목록이 표시되면 THEN 각 agent의 이름과 설명이 보여져야 합니다
4. WHEN `.amazonq/cli-agents/` 디렉토리가 존재하지 않으면 THEN 시스템은 자동으로 해당 디렉토리를 생성해야 합니다

### Requirement 2

**User Story:** 개발자로서, 익스텐션 윈도우가 상하로 분할되어 agent 관리와 컨텍스트 관리를 동시에 할 수 있기를 원합니다. 그래야 두 기능을 효율적으로 사용할 수 있습니다.

#### Acceptance Criteria

1. WHEN 익스텐션 윈도우가 열리면 THEN 시스템은 윈도우를 상하로 2개 영역으로 분할해야 합니다
2. WHEN 윈도우가 분할되면 THEN 상단 영역에는 "Q CLI Agents" 섹션이 표시되어야 합니다
3. WHEN 윈도우가 분할되면 THEN 하단 영역에는 기존 "Context Files" 섹션이 표시되어야 합니다
4. WHEN 사용자가 윈도우 크기를 조정하면 THEN 두 섹션의 크기가 적절히 조정되어야 합니다

### Requirement 3

**User Story:** 개발자로서, 새로운 Q CLI agent를 쉽게 생성할 수 있기를 원합니다. 그래야 프로젝트에 맞는 커스텀 agent를 빠르게 설정할 수 있습니다.

#### Acceptance Criteria

1. WHEN agent 목록이 비어있거나 사용자가 새 agent를 추가하고 싶을 때 THEN 시스템은 "Create New Agent" 버튼을 제공해야 합니다
2. WHEN "Create New Agent" 버튼을 클릭하면 THEN 시스템은 agent 이름을 입력할 수 있는 입력 창을 표시해야 합니다
3. WHEN 사용자가 유효한 agent 이름을 입력하면 THEN 시스템은 `.amazonq/cli-agents/{agent-name}.json` 파일을 생성해야 합니다
4. WHEN agent 파일이 생성되면 THEN 시스템은 미리 정의된 템플릿 구조로 파일을 초기화해야 합니다

### Requirement 4

**User Story:** 개발자로서, 생성되는 agent 설정 파일이 올바른 스키마와 기본값을 가지기를 원합니다. 그래야 추가 설정 없이도 바로 사용할 수 있습니다.

#### Acceptance Criteria

1. WHEN 새 agent 파일이 생성되면 THEN 시스템은 공식 Q CLI agent 스키마를 참조해야 합니다
2. WHEN agent 파일이 초기화되면 THEN `name` 필드는 사용자가 입력한 agent 이름으로 설정되어야 합니다
3. WHEN agent 파일이 초기화되면 THEN 기본 도구들(`fs_read`, `fs_write`, `execute_bash` 등)이 포함되어야 합니다
4. WHEN agent 파일이 초기화되면 THEN 기본 리소스 경로들(`file://README.md`, `file://AmazonQ.md`, `file://.amazonq/rules/**/*.md`)이 포함되어야 합니다
5. WHEN agent 파일이 생성되면 THEN 시스템은 프로젝트 루트에 `AmazonQ.md` 파일이 존재하지 않을 경우 기본 템플릿으로 생성해야 합니다

### Requirement 5

**User Story:** 개발자로서, agent 이름 입력 시 유효성 검사가 이루어지기를 원합니다. 그래야 잘못된 파일명으로 인한 오류를 방지할 수 있습니다.

#### Acceptance Criteria

1. WHEN 사용자가 agent 이름을 입력할 때 THEN 시스템은 파일명으로 사용할 수 없는 문자를 검증해야 합니다
2. WHEN 입력된 이름이 이미 존재하는 agent와 중복되면 THEN 시스템은 오류 메시지를 표시해야 합니다
3. WHEN 입력된 이름이 비어있거나 공백만 포함하면 THEN 시스템은 유효성 검사 오류를 표시해야 합니다
4. WHEN 유효하지 않은 이름이 입력되면 THEN 시스템은 agent 파일 생성을 중단해야 합니다

### Requirement 6

**User Story:** 개발자로서, agent 생성 시 필요한 기본 파일들이 자동으로 생성되기를 원합니다. 그래야 agent가 즉시 사용 가능한 상태가 됩니다.

#### Acceptance Criteria

1. WHEN 새 agent가 생성되면 THEN 시스템은 프로젝트 루트에 `AmazonQ.md` 파일이 존재하는지 확인해야 합니다
2. WHEN `AmazonQ.md` 파일이 존재하지 않으면 THEN 시스템은 기본 템플릿으로 해당 파일을 생성해야 합니다
3. WHEN `AmazonQ.md` 파일이 생성되면 THEN 파일에는 프로젝트 개요와 Amazon Q 사용 가이드가 포함되어야 합니다
4. WHEN `.amazonq/rules/` 디렉토리가 존재하지 않으면 THEN 시스템은 해당 디렉토리를 생성해야 합니다

### Requirement 7

**User Story:** 개발자로서, 생성된 agent가 즉시 목록에 반영되기를 원합니다. 그래야 생성 후 바로 확인할 수 있습니다.

#### Acceptance Criteria

1. WHEN 새 agent 파일이 성공적으로 생성되면 THEN 시스템은 agent 목록을 자동으로 새로고침해야 합니다
2. WHEN agent 목록이 새로고침되면 THEN 새로 생성된 agent가 목록에 표시되어야 합니다
3. WHEN 파일 시스템에서 agent 파일이 변경되면 THEN 시스템은 실시간으로 목록을 업데이트해야 합니다
4. WHEN agent 생성이 완료되면 THEN 시스템은 성공 메시지를 사용자에게 표시해야 합니다

### Requirement 8

**User Story:** 개발자로서, agent 목록에서 특정 agent를 클릭하면 해당 agent의 설정 파일이 VS Code 에디터에서 열리기를 원합니다. 그래야 agent 설정을 직접 수정할 수 있습니다.

#### Acceptance Criteria

1. WHEN 사용자가 agent 목록에서 특정 agent를 클릭하면 THEN 시스템은 해당 agent의 `.json` 설정 파일을 VS Code 에디터에서 열어야 합니다
2. WHEN agent 설정 파일이 열리면 THEN 파일은 새 탭에서 열려야 합니다
3. WHEN 설정 파일이 열리면 THEN 사용자는 JSON 구조를 직접 편집할 수 있어야 합니다
4. WHEN agent 파일이 존재하지 않거나 접근할 수 없으면 THEN 시스템은 적절한 오류 메시지를 표시해야 합니다
5. WHEN 사용자가 agent를 클릭할 때 THEN 시스템은 클릭 이벤트를 처리하여 파일 경로를 올바르게 해석해야 합니다