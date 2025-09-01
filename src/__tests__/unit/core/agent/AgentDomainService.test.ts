import { AgentDomainService } from '../../../../core/agent/AgentDomainService';
import { IAgentRepository } from '../../../../core/agent/IAgentRepository';
import { Agent } from '../../../../core/agent/Agent';
import { AgentTemplate } from '../../../../core/agent/AgentTemplate';
import { success } from '../../../../shared/errors/result';

describe('AgentDomainService', () => {
    let service: AgentDomainService;
    let mockRepository: jest.Mocked<IAgentRepository>;

    beforeEach(() => {
        mockRepository = {
            findAll: jest.fn(),
            findByName: jest.fn(),
            save: jest.fn(),
            delete: jest.fn(),
            exists: jest.fn()
        };
        service = new AgentDomainService(mockRepository);
    });

    describe('createAgent', () => {
        it('should create agent successfully', async () => {
            mockRepository.exists.mockResolvedValue(success(false));
            mockRepository.save.mockResolvedValue(success(undefined));

            const result = await service.createAgent('test-agent');

            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data.name).toBe('test-agent');
            }
            expect(mockRepository.save).toHaveBeenCalled();
        });

        it('should fail if agent already exists', async () => {
            mockRepository.exists.mockResolvedValue(success(true));

            const result = await service.createAgent('existing-agent');

            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error.message).toBe("Agent 'existing-agent' already exists");
            }
        });

        it('should create agent with template', async () => {
            const template: AgentTemplate = {
                name: 'test-template',
                description: 'Template description',
                tools: ['filesystem']
            };
            mockRepository.exists.mockResolvedValue(success(false));
            mockRepository.save.mockResolvedValue(success(undefined));

            const result = await service.createAgent('test-agent', template);

            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data.config.description).toBe('Template description');
                expect(result.data.config.tools).toEqual(['filesystem']);
            }
        });

        it('should fail for invalid name', async () => {
            const result = await service.createAgent('');

            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error.message).toBe('Agent name is required');
            }
        });
    });

    describe('validateAgentName', () => {
        it('should validate correct name', () => {
            const result = service.validateAgentName('valid-agent-name');

            expect(result.success).toBe(true);
        });

        it('should reject empty name', () => {
            const result = service.validateAgentName('');

            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error.message).toBe('Agent name is required');
            }
        });

        it('should reject long name', () => {
            const longName = 'a'.repeat(51);
            const result = service.validateAgentName(longName);

            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error.message).toBe('Agent name must be 50 characters or less');
            }
        });

        it('should reject invalid characters', () => {
            const result = service.validateAgentName('invalid@name');

            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error.message).toBe('Agent name can only contain letters, numbers, hyphens, and underscores');
            }
        });

        it('should reject names starting with hyphen', () => {
            const result = service.validateAgentName('-invalid');

            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error.message).toBe('Agent name cannot start or end with a hyphen');
            }
        });
    });

    describe('updateAgent', () => {
        const mockAgent = new Agent('test-agent', {
            $schema: 'https://json.schemastore.org/amazon-q-developer-cli-agent.json',
            name: 'test-agent',
            description: 'Original description',
            prompt: null,
            mcpServers: {},
            tools: [],
            toolAliases: {},
            allowedTools: [],
            resources: [],
            hooks: {},
            toolsSettings: {},
            useLegacyMcpJson: false
        }, '/path/to/agent.json');

        it('should update agent successfully', async () => {
            mockRepository.findByName.mockResolvedValue(success(mockAgent));
            mockRepository.save.mockResolvedValue(success(undefined));

            const updates = { description: 'Updated description' };
            const result = await service.updateAgent('test-agent', updates);

            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data.config.description).toBe('Updated description');
            }
        });

        it('should fail if agent not found', async () => {
            mockRepository.findByName.mockResolvedValue(success(null));

            const result = await service.updateAgent('nonexistent', {});

            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error.message).toBe("Agent 'nonexistent' not found");
            }
        });
    });

    describe('deleteAgent', () => {
        it('should delete agent successfully', async () => {
            mockRepository.exists.mockResolvedValue(success(true));
            mockRepository.delete.mockResolvedValue(success(undefined));

            const result = await service.deleteAgent('test-agent');

            expect(result.success).toBe(true);
            expect(mockRepository.delete).toHaveBeenCalledWith('test-agent');
        });

        it('should fail if agent not found', async () => {
            mockRepository.exists.mockResolvedValue(success(false));

            const result = await service.deleteAgent('nonexistent');

            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error.message).toBe("Agent 'nonexistent' not found");
            }
        });
    });
});
