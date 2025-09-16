import { WizardStateService } from '../../services/wizardStateService';
import { ExtensionLogger } from '../../services/logger';
import { AgentHook } from '../../types/hook';

// Mock logger
jest.mock('../../services/logger');

describe('WizardStateService - Hook Methods', () => {
    let service: WizardStateService;
    let mockLogger: jest.Mocked<ExtensionLogger>;

    beforeEach(() => {
        mockLogger = new ExtensionLogger() as jest.Mocked<ExtensionLogger>;
        service = new WizardStateService(mockLogger);
    });

    describe('updateHookConfiguration', () => {
        it('should update hook configuration', () => {
            const hookData = { skipHooks: true };
            
            service.updateHookConfiguration(hookData);
            
            const state = service.getState();
            expect(state.stepData.hookConfiguration.skipHooks).toBe(true);
        });

        it('should merge with existing configuration', () => {
            service.updateHookConfiguration({ skipHooks: true });
            service.updateHookConfiguration({ hooks: [] });
            
            const state = service.getState();
            expect(state.stepData.hookConfiguration.skipHooks).toBe(true);
            expect(state.stepData.hookConfiguration.hooks).toEqual([]);
        });
    });

    describe('addHook', () => {
        it('should add hook to configuration', () => {
            const hook: AgentHook = {
                id: '1',
                name: 'Test Hook',
                trigger: 'agentSpawn',
                command: 'echo "test"',
                isCustom: true
            };

            service.addHook(hook);

            const state = service.getState();
            expect(state.stepData.hookConfiguration.hooks).toHaveLength(1);
            expect(state.stepData.hookConfiguration.hooks[0]).toEqual(hook);
        });

        it('should add multiple hooks', () => {
            const hook1: AgentHook = {
                id: '1',
                name: 'Hook 1',
                trigger: 'agentSpawn',
                command: 'echo "test1"',
                isCustom: true
            };

            const hook2: AgentHook = {
                id: '2',
                name: 'Hook 2',
                trigger: 'userPromptSubmit',
                command: 'echo "test2"',
                isCustom: true
            };

            service.addHook(hook1);
            service.addHook(hook2);

            const state = service.getState();
            expect(state.stepData.hookConfiguration.hooks).toHaveLength(2);
        });
    });

    describe('removeHook', () => {
        beforeEach(() => {
            const hooks: AgentHook[] = [
                {
                    id: '1',
                    name: 'Hook 1',
                    trigger: 'agentSpawn',
                    command: 'echo "test1"',
                    isCustom: true
                },
                {
                    id: '2',
                    name: 'Hook 2',
                    trigger: 'userPromptSubmit',
                    command: 'echo "test2"',
                    isCustom: true
                }
            ];

            service.updateHookConfiguration({ hooks });
        });

        it('should remove hook by id', () => {
            service.removeHook('1');

            const state = service.getState();
            expect(state.stepData.hookConfiguration.hooks).toHaveLength(1);
            expect(state.stepData.hookConfiguration.hooks[0].id).toBe('2');
        });

        it('should handle non-existent hook id', () => {
            service.removeHook('non-existent');

            const state = service.getState();
            expect(state.stepData.hookConfiguration.hooks).toHaveLength(2);
        });
    });

    describe('updateHook', () => {
        beforeEach(() => {
            const hook: AgentHook = {
                id: '1',
                name: 'Original Hook',
                trigger: 'agentSpawn',
                command: 'echo "original"',
                isCustom: true
            };

            service.addHook(hook);
        });

        it('should update existing hook', () => {
            service.updateHook('1', { name: 'Updated Hook', command: 'echo "updated"' });

            const state = service.getState();
            const hook = state.stepData.hookConfiguration.hooks[0];
            expect(hook.name).toBe('Updated Hook');
            expect(hook.command).toBe('echo "updated"');
            expect(hook.trigger).toBe('agentSpawn'); // unchanged
        });

        it('should handle non-existent hook id', () => {
            service.updateHook('non-existent', { name: 'Updated' });

            const state = service.getState();
            expect(state.stepData.hookConfiguration.hooks[0].name).toBe('Original Hook');
        });
    });

    describe('initial state', () => {
        it('should have empty hook configuration by default', () => {
            const state = service.getState();
            
            expect(state.stepData.hookConfiguration).toBeDefined();
            expect(state.stepData.hookConfiguration.hooks).toEqual([]);
            expect(state.stepData.hookConfiguration.skipHooks).toBe(false);
        });

        it('should have totalSteps set to 6', () => {
            const state = service.getState();
            
            expect(state.totalSteps).toBe(6);
        });
    });
});
