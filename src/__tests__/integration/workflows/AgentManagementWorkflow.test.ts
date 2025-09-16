import { RefactoredAgentManagementService } from '../../../services/RefactoredAgentManagementService';
import { RefactoredAgentConfigService } from '../../../services/RefactoredAgentConfigService';
import { AgentDomainService } from '../../../core/agent/AgentDomainService';
import { FileSystemAgentRepository } from '../../../infrastructure/repositories/FileSystemAgentRepository';
import { CachedFileSystemAdapter } from '../../../shared/infrastructure/CachedFileSystemAdapter';
import { MemoryCache } from '../../../shared/infrastructure/MemoryCache';
import { EnhancedLogger } from '../../../shared/infrastructure/EnhancedLogger';
import { VSCodeAdapter } from '../../../shared/infrastructure/VSCodeAdapter';
import { FileWatcherPool } from '../../../infrastructure/FileWatcherPool';
import * as path from 'path';
import * as fs from 'fs/promises';
import * as os from 'os';

describe('Agent Management Workflow Integration', () => {
    let tempDir: string;
    let agentManagementService: RefactoredAgentManagementService;
    let agentConfigService: RefactoredAgentConfigService;
    let logger: EnhancedLogger;

    beforeAll(async () => {
        tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'agent-test-'));
        
        // Setup services
        logger = new EnhancedLogger('test');
        const cache = new MemoryCache();
        const fileSystem = new CachedFileSystemAdapter(cache, logger);
        const repository = new FileSystemAgentRepository(fileSystem, logger, tempDir);
        const domainService = new AgentDomainService(repository);
        const vscodeAdapter = new VSCodeAdapter(logger);
        const fileWatcherPool = new FileWatcherPool(fileSystem, logger);

        agentConfigService = new RefactoredAgentConfigService(repository, domainService, logger);
        agentManagementService = new RefactoredAgentManagementService(
            repository, domainService, logger, vscodeAdapter, fileWatcherPool
        );

        // Create .amazonq/cli-agents directory
        const agentsDir = path.join(tempDir, '.amazonq', 'cli-agents');
        await fs.mkdir(agentsDir, { recursive: true });
    });

    afterAll(async () => {
        await fs.rm(tempDir, { recursive: true, force: true });
    });

    describe('complete agent lifecycle', () => {
        it('should create, read, update, and delete agent', async () => {
            const agentName = 'test-agent';
            const agentPath = path.join(tempDir, '.amazonq', 'cli-agents', `${agentName}.json`);

            // Create agent
            const createResult = await agentConfigService.createAgent(agentName, {
                name: agentName,
                description: 'Test agent',
                tools: ['test-tool'],
                resources: []
            });
            expect(createResult.success).toBe(true);

            // Verify file exists
            const fileExists = await fs.access(agentPath).then(() => true).catch(() => false);
            expect(fileExists).toBe(true);

            // Read agent
            const readResult = await agentConfigService.getAgent(agentName);
            expect(readResult.success).toBe(true);
            if (readResult.success) {
                expect(readResult.data.name).toBe(agentName);
                expect(readResult.data.config.description).toBe('Test agent');
            }

            // Update agent
            const updateResult = await agentConfigService.updateAgent(agentName, {
                description: 'Updated test agent'
            });
            expect(updateResult.success).toBe(true);

            // Verify update
            const updatedResult = await agentConfigService.getAgent(agentName);
            expect(updatedResult.success).toBe(true);
            if (updatedResult.success) {
                expect(updatedResult.data.config.description).toBe('Updated test agent');
            }

            // Delete agent
            const deleteResult = await agentConfigService.deleteAgent(agentName);
            expect(deleteResult.success).toBe(true);

            // Verify deletion
            const deletedExists = await fs.access(agentPath).then(() => true).catch(() => false);
            expect(deletedExists).toBe(false);
        });

        it('should handle multiple agents', async () => {
            const agents = ['agent1', 'agent2', 'agent3'];

            // Create multiple agents
            for (const agentName of agents) {
                const result = await agentConfigService.createAgent(agentName, {
                    name: agentName,
                    description: `Description for ${agentName}`,
                    tools: [],
                    resources: []
                });
                expect(result.success).toBe(true);
            }

            // List all agents
            const listResult = await agentManagementService.getAgentList();
            expect(listResult.success).toBe(true);
            if (listResult.success) {
                expect(listResult.data.length).toBe(agents.length);
                const agentNames = listResult.data.map(agent => agent.name);
                for (const agentName of agents) {
                    expect(agentNames).toContain(agentName);
                }
            }

            // Clean up
            for (const agentName of agents) {
                await agentConfigService.deleteAgent(agentName);
            }
        });
    });

    describe('error handling', () => {
        it('should handle non-existent agent', async () => {
            const result = await agentConfigService.getAgent('non-existent');
            expect(result.success).toBe(false);
        });

        it('should handle duplicate agent creation', async () => {
            const agentName = 'duplicate-test';

            // Create first agent
            const firstResult = await agentConfigService.createAgent(agentName, {
                name: agentName,
                description: 'First agent',
                tools: [],
                resources: []
            });
            expect(firstResult.success).toBe(true);

            // Try to create duplicate
            const duplicateResult = await agentConfigService.createAgent(agentName, {
                name: agentName,
                description: 'Duplicate agent',
                tools: [],
                resources: []
            });
            expect(duplicateResult.success).toBe(false);

            // Clean up
            await agentConfigService.deleteAgent(agentName);
        });
    });
});
