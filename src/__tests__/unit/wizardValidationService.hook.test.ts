import { WizardValidationService } from '../../services/wizardValidationService';
import { ExtensionLogger } from '../../services/logger';
import { WizardStep, HookConfigurationData } from '../../types/wizard';

// Mock logger
jest.mock('../../services/logger');

describe('WizardValidationService - Hook Validation', () => {
    let service: WizardValidationService;
    let mockLogger: jest.Mocked<ExtensionLogger>;

    beforeEach(() => {
        mockLogger = new ExtensionLogger() as jest.Mocked<ExtensionLogger>;
        service = new WizardValidationService(mockLogger);
    });

    describe('validateStep - HookConfiguration', () => {
        it('should validate when hooks are skipped', async () => {
            const stepData = {
                basicProperties: { name: 'test', description: '', prompt: '' },
                agentLocation: { location: 'local' as const },
                toolsSelection: { standardTools: [], experimentalTools: [] },
                resources: { resources: [] },
                hookConfiguration: { hooks: [], skipHooks: true }
            };

            const result = await service.validateStep(WizardStep.HookConfiguration, stepData);

            expect(result.isValid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        it('should validate when no hooks are configured', async () => {
            const stepData = {
                basicProperties: { name: 'test', description: '', prompt: '' },
                agentLocation: { location: 'local' as const },
                toolsSelection: { standardTools: [], experimentalTools: [] },
                resources: { resources: [] },
                hookConfiguration: { hooks: [], skipHooks: false }
            };

            const result = await service.validateStep(WizardStep.HookConfiguration, stepData);

            expect(result.isValid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        it('should validate valid hooks', async () => {
            const stepData = {
                basicProperties: { name: 'test', description: '', prompt: '' },
                agentLocation: { location: 'local' as const },
                toolsSelection: { standardTools: [], experimentalTools: [] },
                resources: { resources: [] },
                hookConfiguration: {
                    hooks: [
                        {
                            id: '1',
                            name: 'Valid Hook',
                            trigger: 'agentSpawn' as const,
                            command: 'echo "test"',
                            isCustom: true
                        }
                    ],
                    skipHooks: false
                }
            };

            const result = await service.validateStep(WizardStep.HookConfiguration, stepData);

            expect(result.isValid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        it('should reject invalid hooks', async () => {
            const stepData = {
                basicProperties: { name: 'test', description: '', prompt: '' },
                agentLocation: { location: 'local' as const },
                toolsSelection: { standardTools: [], experimentalTools: [] },
                resources: { resources: [] },
                hookConfiguration: {
                    hooks: [
                        {
                            id: '1',
                            name: '',
                            trigger: 'agentSpawn' as const,
                            command: 'echo "test"',
                            isCustom: true
                        }
                    ],
                    skipHooks: false
                }
            };

            const result = await service.validateStep(WizardStep.HookConfiguration, stepData);

            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('Hook 이름은 필수입니다');
        });

        it('should reject duplicate hook names', async () => {
            const stepData = {
                basicProperties: { name: 'test', description: '', prompt: '' },
                agentLocation: { location: 'local' as const },
                toolsSelection: { standardTools: [], experimentalTools: [] },
                resources: { resources: [] },
                hookConfiguration: {
                    hooks: [
                        {
                            id: '1',
                            name: 'Duplicate Hook',
                            trigger: 'agentSpawn' as const,
                            command: 'echo "test1"',
                            isCustom: true
                        },
                        {
                            id: '2',
                            name: 'Duplicate Hook',
                            trigger: 'userPromptSubmit' as const,
                            command: 'echo "test2"',
                            isCustom: true
                        }
                    ],
                    skipHooks: false
                }
            };

            const result = await service.validateStep(WizardStep.HookConfiguration, stepData);

            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('중복된 Hook 이름이 있습니다');
        });

        it('should include warnings for dangerous commands', async () => {
            const stepData = {
                basicProperties: { name: 'test', description: '', prompt: '' },
                agentLocation: { location: 'local' as const },
                toolsSelection: { standardTools: [], experimentalTools: [] },
                resources: { resources: [] },
                hookConfiguration: {
                    hooks: [
                        {
                            id: '1',
                            name: 'Dangerous Hook',
                            trigger: 'agentSpawn' as const,
                            command: 'rm -rf /',
                            isCustom: true
                        }
                    ],
                    skipHooks: false
                }
            };

            const result = await service.validateStep(WizardStep.HookConfiguration, stepData);

            expect(result.isValid).toBe(true);
            expect(result.warnings).toContain('이 명령어는 시스템에 영향을 줄 수 있습니다');
        });
    });
});
