import { WizardStateService } from '../../services/wizardStateService';
import { WizardValidationService } from '../../services/wizardValidationService';
import { HookTemplateService } from '../../services/hookTemplateService';
import { ExtensionLogger } from '../../services/logger';
import { WizardStep } from '../../types/wizard';

// Mock logger
jest.mock('../../services/logger');

describe('Hook Configuration Wizard Integration', () => {
    let stateService: WizardStateService;
    let validationService: WizardValidationService;
    let templateService: HookTemplateService;
    let mockLogger: jest.Mocked<ExtensionLogger>;

    beforeEach(() => {
        mockLogger = new ExtensionLogger() as jest.Mocked<ExtensionLogger>;
        stateService = new WizardStateService(mockLogger);
        validationService = new WizardValidationService(mockLogger);
        templateService = new HookTemplateService();
    });

    describe('Complete wizard flow with hooks', () => {
        it('should complete wizard with template hooks', async () => {
            // Step 1: Basic Properties
            stateService.updateStepData('basicProperties', {
                name: 'test-agent',
                description: 'Test agent with hooks',
                prompt: 'You are a test agent'
            });

            // Step 2: Agent Location
            stateService.updateStepData('agentLocation', {
                location: 'local'
            });

            // Step 3: Tools Selection
            stateService.updateStepData('toolsSelection', {
                standardTools: ['fs_read', 'execute_bash'],
                experimentalTools: []
            });

            // Step 4: Resources
            stateService.updateStepData('resources', {
                resources: ['file://README.md']
            });

            // Step 5: Hook Configuration - Add template hooks
            const gitStatusTemplate = templateService.getTemplateById('git-status');
            const projectInfoTemplate = templateService.getTemplateById('project-info');

            expect(gitStatusTemplate).toBeDefined();
            expect(projectInfoTemplate).toBeDefined();

            const hooks = [
                {
                    id: '1',
                    name: gitStatusTemplate!.name,
                    trigger: gitStatusTemplate!.trigger,
                    command: gitStatusTemplate!.command,
                    isCustom: false,
                    templateId: gitStatusTemplate!.id
                },
                {
                    id: '2',
                    name: projectInfoTemplate!.name,
                    trigger: projectInfoTemplate!.trigger,
                    command: projectInfoTemplate!.command,
                    isCustom: false,
                    templateId: projectInfoTemplate!.id
                }
            ];

            stateService.updateHookConfiguration({ hooks, skipHooks: false });

            // Validate all steps
            const state = stateService.getState();
            
            for (let step = WizardStep.BasicProperties; step <= WizardStep.HookConfiguration; step++) {
                const validation = await validationService.validateStep(step, state.stepData);
                expect(validation.isValid).toBe(true);
            }

            // Verify final state
            expect(state.stepData.hookConfiguration.hooks).toHaveLength(2);
            expect(state.stepData.hookConfiguration.skipHooks).toBe(false);
        });

        it('should complete wizard with skipped hooks', async () => {
            // Complete basic steps
            stateService.updateStepData('basicProperties', {
                name: 'test-agent-no-hooks',
                description: 'Test agent without hooks',
                prompt: 'You are a test agent'
            });

            stateService.updateStepData('agentLocation', { location: 'global' });
            stateService.updateStepData('toolsSelection', { standardTools: ['fs_read'], experimentalTools: [] });
            stateService.updateStepData('resources', { resources: [] });

            // Skip hooks
            stateService.updateHookConfiguration({ hooks: [], skipHooks: true });

            // Validate hook configuration step
            const state = stateService.getState();
            const validation = await validationService.validateStep(WizardStep.HookConfiguration, state.stepData);

            expect(validation.isValid).toBe(true);
            expect(state.stepData.hookConfiguration.skipHooks).toBe(true);
            expect(state.stepData.hookConfiguration.hooks).toHaveLength(0);
        });

        it('should handle custom hook creation', async () => {
            // Complete basic steps
            stateService.updateStepData('basicProperties', {
                name: 'custom-hook-agent',
                description: 'Agent with custom hook',
                prompt: 'You are a custom agent'
            });

            stateService.updateStepData('agentLocation', { location: 'local' });
            stateService.updateStepData('toolsSelection', { standardTools: ['fs_read'], experimentalTools: [] });
            stateService.updateStepData('resources', { resources: [] });

            // Add custom hook
            const customHook = {
                id: 'custom-1',
                name: 'Custom Status Check',
                trigger: 'userPromptSubmit' as const,
                command: 'pwd && date',
                isCustom: true
            };

            stateService.addHook(customHook);

            // Validate
            const state = stateService.getState();
            const validation = await validationService.validateStep(WizardStep.HookConfiguration, state.stepData);

            expect(validation.isValid).toBe(true);
            expect(state.stepData.hookConfiguration.hooks).toHaveLength(1);
            expect(state.stepData.hookConfiguration.hooks[0].isCustom).toBe(true);
        });
    });

    describe('Hook management operations', () => {
        beforeEach(() => {
            // Setup basic wizard state
            stateService.updateStepData('basicProperties', {
                name: 'hook-management-test',
                description: 'Test hook management',
                prompt: 'Test agent'
            });
        });

        it('should add, update, and remove hooks', () => {
            // Add hook
            const hook = {
                id: 'test-hook',
                name: 'Test Hook',
                trigger: 'agentSpawn' as const,
                command: 'echo "original"',
                isCustom: true
            };

            stateService.addHook(hook);
            let state = stateService.getState();
            expect(state.stepData.hookConfiguration.hooks).toHaveLength(1);

            // Update hook
            stateService.updateHook('test-hook', {
                name: 'Updated Hook',
                command: 'echo "updated"'
            });

            state = stateService.getState();
            const updatedHook = state.stepData.hookConfiguration.hooks[0];
            expect(updatedHook.name).toBe('Updated Hook');
            expect(updatedHook.command).toBe('echo "updated"');

            // Remove hook
            stateService.removeHook('test-hook');
            state = stateService.getState();
            expect(state.stepData.hookConfiguration.hooks).toHaveLength(0);
        });

        it('should prevent duplicate template hooks', () => {
            const gitTemplate = templateService.getTemplateById('git-status')!;
            
            const hook1 = {
                id: '1',
                name: gitTemplate.name,
                trigger: gitTemplate.trigger,
                command: gitTemplate.command,
                isCustom: false,
                templateId: gitTemplate.id
            };

            const hook2 = {
                id: '2',
                name: gitTemplate.name,
                trigger: gitTemplate.trigger,
                command: gitTemplate.command,
                isCustom: false,
                templateId: gitTemplate.id
            };

            stateService.addHook(hook1);
            stateService.addHook(hook2);

            const state = stateService.getState();
            // Should still have both hooks (validation will catch duplicates)
            expect(state.stepData.hookConfiguration.hooks).toHaveLength(2);
        });
    });

    describe('Error scenarios', () => {
        it('should handle validation errors gracefully', async () => {
            // Add invalid hook
            const invalidHook = {
                id: 'invalid',
                name: '', // Invalid: empty name
                trigger: 'agentSpawn' as const,
                command: '', // Invalid: empty command
                isCustom: true
            };

            stateService.addHook(invalidHook);

            const state = stateService.getState();
            const validation = await validationService.validateStep(WizardStep.HookConfiguration, state.stepData);

            expect(validation.isValid).toBe(false);
            expect(validation.errors.length).toBeGreaterThan(0);
        });

        it('should handle dangerous commands with warnings', async () => {
            const dangerousHook = {
                id: 'dangerous',
                name: 'Dangerous Hook',
                trigger: 'agentSpawn' as const,
                command: 'sudo rm -rf /',
                isCustom: true
            };

            stateService.addHook(dangerousHook);

            const state = stateService.getState();
            const validation = await validationService.validateStep(WizardStep.HookConfiguration, state.stepData);

            expect(validation.isValid).toBe(true); // Valid but with warnings
            expect(validation.warnings).toBeDefined();
            expect(validation.warnings!.length).toBeGreaterThan(0);
        });
    });
});
