import { WizardStateService } from '../../services/wizardStateService';
import { WizardValidationService } from '../../services/wizardValidationService';
import { HookValidationService } from '../../services/hookValidationService';
import { ExtensionLogger } from '../../services/logger';
import { WizardStep } from '../../types/wizard';
import { AgentHook } from '../../types/hook';

// Mock logger
jest.mock('../../services/logger');

describe('Hook Configuration Error Handling and Recovery', () => {
    let stateService: WizardStateService;
    let validationService: WizardValidationService;
    let hookValidationService: HookValidationService;
    let mockLogger: jest.Mocked<ExtensionLogger>;

    beforeEach(() => {
        mockLogger = new ExtensionLogger() as jest.Mocked<ExtensionLogger>;
        stateService = new WizardStateService(mockLogger);
        validationService = new WizardValidationService(mockLogger);
        hookValidationService = new HookValidationService();
    });

    describe('Validation error scenarios', () => {
        it('should handle empty hook name gracefully', async () => {
            const invalidHook: AgentHook = {
                id: '1',
                name: '',
                trigger: 'agentSpawn',
                command: 'echo "test"',
                isCustom: true
            };

            const result = hookValidationService.validateHook(invalidHook);

            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('Hook 이름은 필수입니다');
            expect(result.errors.length).toBe(1);
        });

        it('should handle invalid characters in hook name', async () => {
            const invalidHook: AgentHook = {
                id: '1',
                name: 'Invalid@Hook#Name!',
                trigger: 'agentSpawn',
                command: 'echo "test"',
                isCustom: true
            };

            const result = hookValidationService.validateHook(invalidHook);

            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('Hook 이름에는 특수문자를 사용할 수 없습니다');
        });

        it('should handle empty command gracefully', async () => {
            const invalidHook: AgentHook = {
                id: '1',
                name: 'Valid Name',
                trigger: 'agentSpawn',
                command: '',
                isCustom: true
            };

            const result = hookValidationService.validateHook(invalidHook);

            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('명령어는 필수입니다');
        });

        it('should handle multiple validation errors', async () => {
            const invalidHook: AgentHook = {
                id: '1',
                name: '',
                trigger: 'agentSpawn',
                command: '',
                isCustom: true
            };

            const result = hookValidationService.validateHook(invalidHook);

            expect(result.isValid).toBe(false);
            expect(result.errors.length).toBe(2);
            expect(result.errors).toContain('Hook 이름은 필수입니다');
            expect(result.errors).toContain('명령어는 필수입니다');
        });
    });

    describe('Security warning scenarios', () => {
        it('should warn about dangerous file operations', async () => {
            const dangerousHook: AgentHook = {
                id: '1',
                name: 'Dangerous Hook',
                trigger: 'agentSpawn',
                command: 'rm -rf /important/files',
                isCustom: true
            };

            const result = hookValidationService.validateHook(dangerousHook);

            expect(result.isValid).toBe(true);
            expect(result.securityWarnings).toContain('위험한 명령어가 감지되었습니다: rm');
            expect(result.warnings).toContain('이 명령어는 시스템에 영향을 줄 수 있습니다');
        });

        it('should warn about network operations', async () => {
            const networkHook: AgentHook = {
                id: '1',
                name: 'Network Hook',
                trigger: 'userPromptSubmit',
                command: 'curl -X POST https://api.example.com/data',
                isCustom: true
            };

            const result = hookValidationService.validateHook(networkHook);

            expect(result.isValid).toBe(true);
            expect(result.securityWarnings).toContain('네트워크 명령어가 감지되었습니다: curl');
            expect(result.warnings).toContain('네트워크 명령어는 보안상 주의가 필요합니다');
        });

        it('should warn about privilege escalation', async () => {
            const privilegedHook: AgentHook = {
                id: '1',
                name: 'Privileged Hook',
                trigger: 'agentSpawn',
                command: 'sudo systemctl restart service',
                isCustom: true
            };

            const result = hookValidationService.validateHook(privilegedHook);

            expect(result.isValid).toBe(true);
            expect(result.securityWarnings).toContain('위험한 명령어가 감지되었습니다: sudo');
            expect(result.warnings).toContain('이 명령어는 시스템에 영향을 줄 수 있습니다');
        });

        it('should warn about output redirection', async () => {
            const redirectHook: AgentHook = {
                id: '1',
                name: 'Redirect Hook',
                trigger: 'userPromptSubmit',
                command: 'find / -name "*.log" | head -100 > /tmp/logs.txt',
                isCustom: true
            };

            const result = hookValidationService.validateHook(redirectHook);

            expect(result.isValid).toBe(true);
            expect(result.warnings).toContain('파이프나 리다이렉션 사용 시 출력 크기에 주의하세요');
        });
    });

    describe('Duplicate detection and recovery', () => {
        it('should detect duplicate hook names', async () => {
            const hooks: AgentHook[] = [
                {
                    id: '1',
                    name: 'Git Status',
                    trigger: 'agentSpawn',
                    command: 'git status',
                    isCustom: true
                },
                {
                    id: '2',
                    name: 'Git Status',
                    trigger: 'userPromptSubmit',
                    command: 'git status --short',
                    isCustom: true
                }
            ];

            const result = hookValidationService.validateHookList(hooks);

            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('중복된 Hook 이름이 있습니다');
        });

        it('should allow recovery by renaming duplicate hooks', async () => {
            // Add first hook
            stateService.addHook({
                id: '1',
                name: 'Status Check',
                trigger: 'agentSpawn',
                command: 'git status',
                isCustom: true
            });

            // Add second hook with same name
            stateService.addHook({
                id: '2',
                name: 'Status Check',
                trigger: 'userPromptSubmit',
                command: 'git status --short',
                isCustom: true
            });

            // Validate - should fail
            let state = stateService.getState();
            let validation = await validationService.validateStep(WizardStep.HookConfiguration, state.stepData);
            expect(validation.isValid).toBe(false);

            // Recover by renaming second hook
            stateService.updateHook('2', { name: 'Status Check Per Prompt' });

            // Validate again - should pass
            state = stateService.getState();
            validation = await validationService.validateStep(WizardStep.HookConfiguration, state.stepData);
            expect(validation.isValid).toBe(true);
        });
    });

    describe('Recovery scenarios', () => {
        it('should allow continuing without hooks when validation fails', async () => {
            // Add invalid hook
            stateService.addHook({
                id: '1',
                name: '',
                trigger: 'agentSpawn',
                command: '',
                isCustom: true
            });

            // Validation should fail
            let state = stateService.getState();
            let validation = await validationService.validateStep(WizardStep.HookConfiguration, state.stepData);
            expect(validation.isValid).toBe(false);

            // Recover by skipping hooks
            stateService.updateHookConfiguration({ skipHooks: true });

            // Validation should now pass
            state = stateService.getState();
            validation = await validationService.validateStep(WizardStep.HookConfiguration, state.stepData);
            expect(validation.isValid).toBe(true);
        });

        it('should allow removing problematic hooks', async () => {
            // Add valid and invalid hooks
            stateService.addHook({
                id: 'valid',
                name: 'Valid Hook',
                trigger: 'agentSpawn',
                command: 'echo "valid"',
                isCustom: true
            });

            stateService.addHook({
                id: 'invalid',
                name: '',
                trigger: 'agentSpawn',
                command: '',
                isCustom: true
            });

            // Validation should fail
            let state = stateService.getState();
            let validation = await validationService.validateStep(WizardStep.HookConfiguration, state.stepData);
            expect(validation.isValid).toBe(false);

            // Recover by removing invalid hook
            stateService.removeHook('invalid');

            // Validation should now pass
            state = stateService.getState();
            validation = await validationService.validateStep(WizardStep.HookConfiguration, state.stepData);
            expect(validation.isValid).toBe(true);
            expect(state.stepData.hookConfiguration.hooks).toHaveLength(1);
        });

        it('should allow fixing invalid hooks through editing', async () => {
            // Add invalid hook
            stateService.addHook({
                id: 'fixable',
                name: 'Invalid@Name',
                trigger: 'agentSpawn',
                command: '',
                isCustom: true
            });

            // Validation should fail
            let state = stateService.getState();
            let validation = await validationService.validateStep(WizardStep.HookConfiguration, state.stepData);
            expect(validation.isValid).toBe(false);

            // Fix the hook
            stateService.updateHook('fixable', {
                name: 'Fixed Name',
                command: 'echo "fixed"'
            });

            // Validation should now pass
            state = stateService.getState();
            validation = await validationService.validateStep(WizardStep.HookConfiguration, state.stepData);
            expect(validation.isValid).toBe(true);
        });
    });

    describe('Edge cases', () => {
        it('should handle empty hook list gracefully', async () => {
            const result = hookValidationService.validateHookList([]);

            expect(result.isValid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        it('should handle hooks with whitespace-only names', async () => {
            const hook: AgentHook = {
                id: '1',
                name: '   ',
                trigger: 'agentSpawn',
                command: 'echo "test"',
                isCustom: true
            };

            const result = hookValidationService.validateHook(hook);

            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('Hook 이름은 필수입니다');
        });

        it('should handle hooks with whitespace-only commands', async () => {
            const hook: AgentHook = {
                id: '1',
                name: 'Valid Name',
                trigger: 'agentSpawn',
                command: '   ',
                isCustom: true
            };

            const result = hookValidationService.validateHook(hook);

            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('명령어는 필수입니다');
        });
    });
});
