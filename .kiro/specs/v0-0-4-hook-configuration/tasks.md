# 구현 계획

- [x] 1. Hook 관련 타입 정의 및 인터페이스 확장
  - WizardStep 열거형에 HookConfiguration 단계 추가
  - Hook 관련 새로운 타입 정의 (HookTemplate, HookConfigurationData, AgentHook, HookValidationResult)
  - WizardState 인터페이스에 hookConfiguration 필드 추가
  - _요구사항: 1.1, 1.3, 6.1_

- [x] 2. Hook 템플릿 서비스 구현
  - HookTemplateService 클래스 생성
  - 미리 정의된 Hook 템플릿 3개 구현 (Git 상태, 프로젝트 정보, 현재 브랜치)
  - 템플릿 조회 및 필터링 메서드 구현
  - _요구사항: 2.1, 2.2, 2.3, 2.4, 2.5_

- [x] 3. Hook 유효성 검사 서비스 구현
  - HookValidationService 클래스 생성
  - Hook 이름 및 명령어 유효성 검사 로직 구현
  - 위험한 명령어 및 보안 경고 감지 기능 구현
  - Hook 목록 중복 검사 및 전체 유효성 검사 구현
  - _요구사항: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 4. 마법사 상태 서비스 확장
  - WizardStateService에 Hook 관련 메서드 추가
  - initializeDefaultState 메서드에 hookConfiguration 기본값 추가
  - Hook 추가, 제거, 수정 메서드 구현
  - totalSteps를 5에서 6으로 업데이트
  - _요구사항: 1.1, 1.2_

- [x] 5. 마법사 유효성 검사 서비스 확장
  - WizardValidationService에 HookConfiguration 단계 유효성 검사 추가
  - HookValidationService와 통합하여 Hook 목록 검증
  - skipHooks 옵션 처리 로직 구현
  - _요구사항: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 6. Hook 설정 UI 컴포넌트 구현
  - wizardWebviewProvider.ts에 Hook 설정 단계 HTML 추가
  - Hook 템플릿 선택 인터페이스 구현
  - 사용자 정의 Hook 입력 폼 구현
  - Hook 목록 표시 및 관리 UI 구현
  - _요구사항: 1.1, 2.1, 2.2, 2.3, 2.4, 2.5_

- [x] 7. Hook 설정 단계 JavaScript 로직 구현
  - Hook 템플릿 선택 및 적용 로직
  - 사용자 정의 Hook 생성 및 편집 로직
  - 실시간 유효성 검사 및 오류 표시
  - Hook 목록 관리 (추가, 제거) 기능
  - _요구사항: 2.1, 2.2, 2.3, 2.4, 2.5, 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 8. Hook 설정 건너뛰기 기능 구현
  - "Hook 설정 건너뛰기" 옵션 UI 추가
  - 건너뛰기 선택 시 다음 단계로 진행하는 로직 구현
  - 건너뛰기 상태 관리 및 유효성 검사 처리
  - _요구사항: 1.2_

- [x] 9. 에이전트 JSON 생성 로직에 Hook 통합
  - buildAgentConfig 메서드에 Hook 설정 추가
  - conversation_start Hook을 agentSpawn 트리거로 변환
  - per_prompt Hook을 userPromptSubmit 트리거로 변환
  - Hook이 없을 경우 hooks 섹션 제외 처리
  - _요구사항: 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 10. Hook 설정 오류 처리 및 복구 구현
  - Hook 유효성 검사 실패 시 사용자 친화적 오류 메시지 표시
  - 보안 경고 및 위험한 명령어 감지 시 경고 표시
  - Hook 저장 실패 시 재시도 또는 건너뛰기 옵션 제공
  - 오류 상황에서도 에이전트 생성을 계속할 수 있는 복구 로직
  - _요구사항: 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 11. Hook 설정 단계 CSS 스타일링
  - Hook 설정 UI에 대한 VS Code 테마 호환 스타일 추가
  - 템플릿 선택 카드 스타일 구현
  - Hook 목록 및 폼 요소 스타일링
  - 유효성 검사 메시지 및 경고 스타일 추가
  - _요구사항: 1.1, 2.1, 3.1_

- [x] 12. Hook 설정 기능 단위 테스트 작성
  - HookTemplateService 테스트 케이스 작성
  - HookValidationService 테스트 케이스 작성
  - WizardStateService Hook 관련 메서드 테스트
  - WizardValidationService Hook 검증 테스트
  - _요구사항: 모든 요구사항의 검증_

- [x] 13. Hook 설정 통합 테스트 작성
  - 전체 마법사 플로우에서 Hook 설정 단계 테스트
  - Hook 설정이 포함된 에이전트 JSON 생성 테스트
  - Hook 건너뛰기 시나리오 테스트
  - 오류 처리 및 복구 시나리오 테스트
  - _요구사항: 모든 요구사항의 통합 검증_

- [ ] 14. Hook 설정 기능 문서화 및 최종 검증
  - Hook 설정 기능 사용법 문서 작성
  - _요구사항: 모든 요구사항의 최종 검증_