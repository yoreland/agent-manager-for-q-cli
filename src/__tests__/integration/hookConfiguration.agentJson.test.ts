import { WizardWebviewProvider } from '../../providers/wizardWebviewProvider';
import { WizardStateService } from '../../services/wizardStateService';
import { WizardValidationService } from '../../services/wizardValidationService';
import { ExtensionLogger } from '../../services/logger';
import * as vscode from 'vscode';

// Mock dependencies
jest.mock('vscode');
jest.mock('../../services/logger');

describe('Hook Configuration Agent JSON Generation', () => {
    let provider: WizardWebviewProvider;
    let mockLogger: jest.Mocked<ExtensionLogger>;
    let mockContext: vscode.ExtensionContext;

    beforeEach(() => {
        mockLogger = new ExtensionLogger() as jest.Mocked<ExtensionLogger>;
        mockContext = {} as vscode.ExtensionContext;
        
        const stateService = new WizardStateService(mockLogger, mockContext);
        const validationService = new WizardValidationService(mockLogger);
        
        provider = new WizardWebviewProvider(mockContext, stateService, validationService, mockLogger);
    });

    describe('buildAgentConfig with hooks', () => {
        it('should generate JSON with agentSpawn hooks', () => {
            const stepData = {
                basicProperties: {
                    name: 'test-agent',
                    description: 'Test agent',
                    prompt: 'You are a test agent'
                },
                agentLocation: { location: 'local' as const },
                toolsSelection: { standardTools: ['fs_read'], experimentalTools: [] },
                resources: { resources: [] },
                hookConfiguration: {
                    hooks: [
                        {
                            id: '1',
                            name: 'Project Info',
                            trigger: 'agentSpawn' as const,
                            command: 'echo "Project: $(basename $(pwd))"',
                            isCustom: false,
                            templateId: 'project-info'
                        },
                        {
                            id: '2',
                            name: 'Current Branch',
                            trigger: 'agentSpawn' as const,
                            command: 'git branch --show-current',
                            isCustom: false,
                            templateId: 'current-branch'
                        }
                    ],
                    skipHooks: false
                }
            };

            const config = (provider as any).buildAgentConfig(stepData);

            expect(config.hooks).toBeDefined();
            expect(config.hooks.agentSpawn).toBeDefined();
            expect(config.hooks.agentSpawn).toHaveLength(2);
            expect(config.hooks.agentSpawn[0].command).toBe('echo "Project: $(basename $(pwd))"');
            expect(config.hooks.agentSpawn[1].command).toBe('git branch --show-current');
        });

        it('should generate JSON with userPromptSubmit hooks', () => {
            const stepData = {
                basicProperties: {
                    name: 'test-agent',
                    description: 'Test agent',
                    prompt: 'You are a test agent'
                },
                agentLocation: { location: 'local' as const },
                toolsSelection: { standardTools: ['fs_read'], experimentalTools: [] },
                resources: { resources: [] },
                hookConfiguration: {
                    hooks: [
                        {
                            id: '1',
                            name: 'Git Status',
                            trigger: 'userPromptSubmit' as const,
                            command: 'git status --short',
                            isCustom: false,
                            templateId: 'git-status'
                        }
                    ],
                    skipHooks: false
                }
            };

            const config = (provider as any).buildAgentConfig(stepData);

            expect(config.hooks).toBeDefined();
            expect(config.hooks.userPromptSubmit).toBeDefined();
            expect(config.hooks.userPromptSubmit).toHaveLength(1);
            expect(config.hooks.userPromptSubmit[0].command).toBe('git status --short');
        });

        it('should generate JSON with mixed trigger hooks', () => {
            const stepData = {
                basicProperties: {
                    name: 'test-agent',
                    description: 'Test agent',
                    prompt: 'You are a test agent'
                },
                agentLocation: { location: 'local' as const },
                toolsSelection: { standardTools: ['fs_read'], experimentalTools: [] },
                resources: { resources: [] },
                hookConfiguration: {
                    hooks: [
                        {
                            id: '1',
                            name: 'Project Info',
                            trigger: 'agentSpawn' as const,
                            command: 'echo "Project: $(basename $(pwd))"',
                            isCustom: false
                        },
                        {
                            id: '2',
                            name: 'Git Status',
                            trigger: 'userPromptSubmit' as const,
                            command: 'git status --short',
                            isCustom: false
                        },
                        {
                            id: '3',
                            name: 'Custom Hook',
                            trigger: 'agentSpawn' as const,
                            command: 'date',
                            isCustom: true
                        }
                    ],
                    skipHooks: false
                }
            };

            const config = (provider as any).buildAgentConfig(stepData);

            expect(config.hooks).toBeDefined();
            expect(config.hooks.agentSpawn).toHaveLength(2);
            expect(config.hooks.userPromptSubmit).toHaveLength(1);
            
            // Verify commands are correctly mapped
            expect(config.hooks.agentSpawn.map((h: any) => h.command)).toEqual([
                'echo "Project: $(basename $(pwd))"',
                'date'
            ]);
            expect(config.hooks.userPromptSubmit[0].command).toBe('git status --short');
        });

        it('should not include hooks section when skipped', () => {
            const stepData = {
                basicProperties: {
                    name: 'test-agent',
                    description: 'Test agent',
                    prompt: 'You are a test agent'
                },
                agentLocation: { location: 'local' as const },
                toolsSelection: { standardTools: ['fs_read'], experimentalTools: [] },
                resources: { resources: [] },
                hookConfiguration: {
                    hooks: [],
                    skipHooks: true
                }
            };

            const config = (provider as any).buildAgentConfig(stepData);

            expect(config.hooks).toBeUndefined();
        });

        it('should not include hooks section when no hooks configured', () => {
            const stepData = {
                basicProperties: {
                    name: 'test-agent',
                    description: 'Test agent',
                    prompt: 'You are a test agent'
                },
                agentLocation: { location: 'local' as const },
                toolsSelection: { standardTools: ['fs_read'], experimentalTools: [] },
                resources: { resources: [] },
                hookConfiguration: {
                    hooks: [],
                    skipHooks: false
                }
            };

            const config = (provider as any).buildAgentConfig(stepData);

            expect(config.hooks).toBeUndefined();
        });

        it('should generate complete agent JSON with all sections', () => {
            const stepData = {
                basicProperties: {
                    name: 'complete-agent',
                    description: 'Complete test agent',
                    prompt: 'You are a complete test agent with all features'
                },
                agentLocation: { location: 'global' as const },
                toolsSelection: { 
                    standardTools: ['fs_read', 'fs_write', 'execute_bash'], 
                    experimentalTools: ['knowledge'] 
                },
                resources: { 
                    resources: ['file://README.md', 'file://docs/**/*.md'] 
                },
                hookConfiguration: {
                    hooks: [
                        {
                            id: '1',
                            name: 'Startup Info',
                            trigger: 'agentSpawn' as const,
                            command: 'echo "Agent started at $(date)"',
                            isCustom: true
                        },
                        {
                            id: '2',
                            name: 'Git Status',
                            trigger: 'userPromptSubmit' as const,
                            command: 'git status --short',
                            isCustom: false
                        }
                    ],
                    skipHooks: false
                }
            };

            const config = (provider as any).buildAgentConfig(stepData);

            // Verify all sections are present
            expect(config.name).toBe('complete-agent');
            expect(config.description).toBe('Complete test agent');
            expect(config.prompt).toBe('You are a complete test agent with all features');
            expect(config.tools).toEqual(['fs_read', 'fs_write', 'execute_bash', 'knowledge']);
            expect(config.resources).toEqual(['file://README.md', 'file://docs/**/*.md']);
            expect(config.hooks.agentSpawn).toHaveLength(1);
            expect(config.hooks.userPromptSubmit).toHaveLength(1);
            
            // Verify JSON structure matches expected format
            expect(config.$schema).toBeDefined();
            expect(config.mcpServers).toBeDefined();
            expect(config.toolAliases).toBeDefined();
            expect(config.allowedTools).toBeDefined();
            expect(config.toolsSettings).toBeDefined();
            expect(config.useLegacyMcpJson).toBe(true);
        });
    });
});
