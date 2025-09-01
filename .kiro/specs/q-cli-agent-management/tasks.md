# Implementation Plan

- [x] 1. Agent 관련 타입 정의 및 기본 구조 설정
  - Agent 설정 파일 스키마에 맞는 TypeScript 인터페이스 생성
  - AgentItem, AgentConfig, AgentCreationResult 등 핵심 타입 정의
  - 기존 types 디렉토리에 agent.ts 파일 생성
  - _Requirements: 1.1, 4.2, 4.3, 4.4_

- [x] 2. AgentConfigService 구현
  - .amazonq/cli-agents/ 디렉토리 관리 기능 구현
  - Agent 설정 파일 읽기/쓰기 기능 구현
  - JSON 스키마 검증 및 유효성 검사 로직 구현
  - Agent 이름 중복 검사 및 파일명 유효성 검사 구현
  - _Requirements: 1.1, 1.4, 4.1, 4.2, 4.3, 4.4, 5.1, 5.2, 5.3, 5.4_

- [x] 3. AgentManagementService 구현
  - Agent 목록 관리 비즈니스 로직 구현
  - 새 Agent 생성 워크플로우 구현
  - 파일 시스템 감시 기능 구현 (FileSystemWatcher)
  - Agent 목록 변경 이벤트 처리 구현
  - _Requirements: 1.1, 1.2, 3.1, 3.2, 3.3, 3.4, 6.3, 6.4_

- [x] 4. AgentTreeProvider 구현
  - VS Code TreeDataProvider 인터페이스 구현
  - Agent 목록을 트리뷰 아이템으로 변환하는 로직 구현
  - 트리뷰 새로고침 및 업데이트 기능 구현
  - "Create New Agent" 버튼 표시 로직 구현
  - _Requirements: 1.2, 1.3, 3.1, 6.1, 6.2_

- [x] 5. 분할 뷰 UI 구조 구현
  - package.json에 새로운 Agent 트리뷰 등록
  - 기존 qcli-context 뷰 컨테이너에 Agent 뷰 추가
  - 상단 Agent 섹션과 하단 Context 섹션으로 분할
  - 뷰 크기 조정 및 레이아웃 관리 구현
  - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [x] 6. Agent 생성 명령어 및 UI 구현
  - "Create New Agent" 명령어 등록
  - Agent 이름 입력 프롬프트 UI 구현
  - 입력 유효성 검사 및 오류 메시지 표시 구현
  - Agent 파일 생성 성공/실패 피드백 구현
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 5.1, 5.2, 5.3, 5.4, 6.4_

- [x] 7. 기본 Agent 템플릿 구현
  - 공식 Q CLI Agent 스키마 참조 구현
  - 기본 도구 및 리소스 설정 템플릿 생성
  - Agent 이름 동적 치환 로직 구현
  - 템플릿 기반 Agent 파일 초기화 구현
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [x] 8. 익스텐션 메인 모듈 통합
  - extension.ts에 Agent 관리 기능 통합
  - AgentTreeProvider 초기화 및 등록
  - 기존 ContextTreeProvider와 함께 동작하도록 수정
  - 익스텐션 활성화 시 Agent 디렉토리 자동 생성
  - _Requirements: 1.4, 2.1, 2.2_

- [x] 9. 오류 처리 및 사용자 피드백 구현
  - 파일 시스템 오류 처리 로직 구현
  - 유효성 검사 실패 시 구체적인 오류 메시지 표시
  - Agent 생성 성공/실패 알림 구현
  - 권한 오류 및 디스크 공간 부족 처리 구현
  - _Requirements: 5.4, 6.4_

- [x] 10. 실시간 파일 감시 및 자동 새로고침 구현
  - .amazonq/cli-agents/ 디렉토리 FileSystemWatcher 설정
  - 파일 추가/삭제/수정 이벤트 처리
  - Agent 목록 자동 새로고침 구현
  - 메모리 누수 방지를 위한 적절한 리소스 해제
  - _Requirements: 6.1, 6.2, 6.3_

- [x] 11. Agent 클릭 시 설정 파일 열기 기능 구현
  - AgentTreeProvider에 클릭 이벤트 처리 로직 추가
  - AgentManagementService에 파일 열기 메서드 구현
  - VS Code 에디터에서 JSON 파일을 여는 명령어 구현
  - 파일 존재 여부 확인 및 오류 처리 로직 구현
  - Agent 아이템에 클릭 가능한 command 속성 설정
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_
