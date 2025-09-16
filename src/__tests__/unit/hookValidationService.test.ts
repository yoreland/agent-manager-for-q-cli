import { HookValidationService } from '../../services/hookValidationService';
import { AgentHook } from '../../types/hook';

describe('HookValidationService', () => {
    let service: HookValidationService;

    beforeEach(() => {
        service = new HookValidationService();
    });

    describe('validateHook', () => {
        it('should validate valid hook', () => {
            const hook: AgentHook = {
                id: '1',
                name: 'Test Hook',
                trigger: 'agentSpawn',
                command: 'echo "test"',
                isCustom: true
            };

            const result = service.validateHook(hook);

            expect(result.isValid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        it('should reject empty name', () => {
            const hook: AgentHook = {
                id: '1',
                name: '',
                trigger: 'agentSpawn',
                command: 'echo "test"',
                isCustom: true
            };

            const result = service.validateHook(hook);

            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('Hook 이름은 필수입니다');
        });

        it('should reject invalid name characters', () => {
            const hook: AgentHook = {
                id: '1',
                name: 'Test@Hook!',
                trigger: 'agentSpawn',
                command: 'echo "test"',
                isCustom: true
            };

            const result = service.validateHook(hook);

            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('Hook 이름에는 특수문자를 사용할 수 없습니다');
        });

        it('should reject empty command', () => {
            const hook: AgentHook = {
                id: '1',
                name: 'Test Hook',
                trigger: 'agentSpawn',
                command: '',
                isCustom: true
            };

            const result = service.validateHook(hook);

            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('명령어는 필수입니다');
        });

        it('should warn about dangerous commands', () => {
            const hook: AgentHook = {
                id: '1',
                name: 'Dangerous Hook',
                trigger: 'agentSpawn',
                command: 'rm -rf /',
                isCustom: true
            };

            const result = service.validateHook(hook);

            expect(result.isValid).toBe(true);
            expect(result.securityWarnings).toContain('위험한 명령어가 감지되었습니다: rm');
            expect(result.warnings).toContain('이 명령어는 시스템에 영향을 줄 수 있습니다');
        });

        it('should warn about network commands', () => {
            const hook: AgentHook = {
                id: '1',
                name: 'Network Hook',
                trigger: 'agentSpawn',
                command: 'curl https://example.com',
                isCustom: true
            };

            const result = service.validateHook(hook);

            expect(result.isValid).toBe(true);
            expect(result.securityWarnings).toContain('네트워크 명령어가 감지되었습니다: curl');
            expect(result.warnings).toContain('네트워크 명령어는 보안상 주의가 필요합니다');
        });

        it('should warn about pipes and redirections', () => {
            const hook: AgentHook = {
                id: '1',
                name: 'Pipe Hook',
                trigger: 'agentSpawn',
                command: 'ls | grep test > output.txt',
                isCustom: true
            };

            const result = service.validateHook(hook);

            expect(result.isValid).toBe(true);
            expect(result.warnings).toContain('파이프나 리다이렉션 사용 시 출력 크기에 주의하세요');
        });
    });

    describe('validateHookList', () => {
        it('should validate empty hook list', () => {
            const result = service.validateHookList([]);

            expect(result.isValid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        it('should detect duplicate names', () => {
            const hooks: AgentHook[] = [
                {
                    id: '1',
                    name: 'Test Hook',
                    trigger: 'agentSpawn',
                    command: 'echo "test1"',
                    isCustom: true
                },
                {
                    id: '2',
                    name: 'Test Hook',
                    trigger: 'userPromptSubmit',
                    command: 'echo "test2"',
                    isCustom: true
                }
            ];

            const result = service.validateHookList(hooks);

            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('중복된 Hook 이름이 있습니다');
        });

        it('should validate all hooks in list', () => {
            const hooks: AgentHook[] = [
                {
                    id: '1',
                    name: 'Valid Hook',
                    trigger: 'agentSpawn',
                    command: 'echo "test"',
                    isCustom: true
                },
                {
                    id: '2',
                    name: '',
                    trigger: 'userPromptSubmit',
                    command: 'echo "test2"',
                    isCustom: true
                }
            ];

            const result = service.validateHookList(hooks);

            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('Hook 이름은 필수입니다');
        });
    });
});
