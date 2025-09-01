import { RefactoredAgentConfigService } from '../../../services/RefactoredAgentConfigService';
import { IAgentRepository } from '../../../core/agent/IAgentRepository';
import { AgentDomainService } from '../../../core/agent/AgentDomainService';
import { Agent } from '../../../core/agent/Agent';
import { ILogger } from '../../../shared/infrastructure/ILogger';
import { success, failure } from '../../../shared/errors/result';

describe('RefactoredAgentConfigService Integration', () => {
    let service: RefactoredAgentConfigService;
    let mockRepository: jest.Mocked<IAgentRepository>;
    let mockDomainService: jest.Mocked<AgentDomainService>;
    let mockLogger: jest.Mocked<ILogger>;

    beforeEach(() => {
        mockRepository = {
            findAll: jest.fn(),
            findByName: jest.fn(),
            save: jest.fn(),
            delete: jest.fn(),
            exists: jest.fn()
        };

        mockDomainService = {
            createAgent: jest.fn(),
            updateAgent: jest.fn(),
            deleteAgent: jest.fn(),
            validateAgentName: jest.fn()
        } as any;

        mockLogger = {
            debug: jest.fn(),
            info: jest.fn(),
            warn: jest.fn(),
            error: jest.fn(),
            setLogLevel: jest.fn(),
            getLogLevel: jest.fn(),
            dispose: jest.fn()
        };

        service = new RefactoredAgentConfigService(mockRepository, mockDomainService, mockLogger);
    });

    describe('getAllAgents', () => {
        it('should return all agents from repository', async () => {
            const agent1Result = Agent.create('agent1', '/path/agent1.json');
            const agent2Result = Agent.create('agent2', '/path/agent2.json');
            
            expect(agent1Result.success).toBe(true);
            expect(agent2Result.success).toBe(true);
            
            if (agent1Result.success && agent2Result.success) {
                const mockAgents = [agent1Result.data, agent2Result.data];
                mockRepository.findAll.mockResolvedValue(success(mockAgents));

                const result = await service.getAllAgents();

                expect(result.success).toBe(true);
                if (result.success) {
                    expect(result.data).toHaveLength(2);
                }
                expect(mockLogger.debug).toHaveBeenCalledWith('Getting all agents');
            }
        });
    });

    describe('createAgent', () => {
        it('should create agent using domain service', async () => {
            const agentResult = Agent.create('test-agent', '/path/test-agent.json');
            expect(agentResult.success).toBe(true);
            
            if (agentResult.success) {
                const mockAgent = agentResult.data;
                mockDomainService.createAgent.mockResolvedValue(success(mockAgent));

                const result = await service.createAgent('test-agent', 'basic');

                expect(result.success).toBe(true);
                expect(mockDomainService.createAgent).toHaveBeenCalledWith('test-agent', expect.objectContaining({ name: 'basic' }));
                expect(mockLogger.info).toHaveBeenCalledWith('Agent created successfully', { name: 'test-agent' });
            }
        });

        it('should handle creation errors', async () => {
            const error = new Error('Creation failed');
            mockDomainService.createAgent.mockResolvedValue(failure(error));

            const result = await service.createAgent('test-agent');

            expect(result.success).toBe(false);
            expect(mockLogger.error).toHaveBeenCalledWith('Failed to create agent', error, { name: 'test-agent' });
        });
    });

    describe('updateAgent', () => {
        it('should update agent using domain service', async () => {
            const agentResult = Agent.create('test-agent', '/path/test-agent.json');
            expect(agentResult.success).toBe(true);
            
            if (agentResult.success) {
                const mockAgent = agentResult.data;
                const updates = { description: 'Updated description' };
                mockDomainService.updateAgent.mockResolvedValue(success(mockAgent));

                const result = await service.updateAgent('test-agent', updates);

                expect(result.success).toBe(true);
                expect(mockDomainService.updateAgent).toHaveBeenCalledWith('test-agent', updates);
                expect(mockLogger.info).toHaveBeenCalledWith('Agent updated successfully', { name: 'test-agent' });
            }
        });
    });

    describe('deleteAgent', () => {
        it('should delete agent using domain service', async () => {
            mockDomainService.deleteAgent.mockResolvedValue(success(undefined));

            const result = await service.deleteAgent('test-agent');

            expect(result.success).toBe(true);
            expect(mockDomainService.deleteAgent).toHaveBeenCalledWith('test-agent');
            expect(mockLogger.info).toHaveBeenCalledWith('Agent deleted successfully', { name: 'test-agent' });
        });
    });

    describe('validateAgentName', () => {
        it('should validate agent name using domain service', () => {
            mockDomainService.validateAgentName.mockReturnValue(success(undefined));

            const result = service.validateAgentName('valid-name');

            expect(result.success).toBe(true);
            expect(mockDomainService.validateAgentName).toHaveBeenCalledWith('valid-name');
        });
    });

    describe('getAvailableTemplates', () => {
        it('should return built-in templates', () => {
            const templates = service.getAvailableTemplates();

            expect(templates).toBeDefined();
            expect(templates.length).toBeGreaterThan(0);
            expect(templates.some(t => t.name === 'basic')).toBe(true);
        });
    });
});
