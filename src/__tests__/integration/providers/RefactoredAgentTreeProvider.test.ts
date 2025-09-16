import { RefactoredAgentTreeProvider } from '../../../providers/RefactoredAgentTreeProvider';
import { RefactoredAgentManagementService, AgentItem } from '../../../services/RefactoredAgentManagementService';
import { ILogger } from '../../../shared/infrastructure/ILogger';
import { PerformanceMonitor } from '../../../infrastructure/PerformanceMonitor';
import { success } from '../../../shared/errors/result';

describe('RefactoredAgentTreeProvider Integration', () => {
    let provider: RefactoredAgentTreeProvider;
    let mockAgentService: jest.Mocked<RefactoredAgentManagementService>;
    let mockLogger: jest.Mocked<ILogger>;
    let mockPerformanceMonitor: jest.Mocked<PerformanceMonitor>;

    beforeEach(() => {
        mockAgentService = {
            getAgentList: jest.fn(),
            refreshAgentList: jest.fn(),
            onAgentListChanged: jest.fn(() => ({ dispose: jest.fn() }))
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

        mockPerformanceMonitor = {
            measureAsync: jest.fn().mockImplementation(async (_name, fn) => fn())
        } as any;

        provider = new RefactoredAgentTreeProvider(mockAgentService, mockLogger, mockPerformanceMonitor);
    });

    afterEach(() => {
        provider.dispose();
    });

    describe('getChildren', () => {
        it('should return empty state when no agents', async () => {
            mockAgentService.getAgentList.mockResolvedValue(success([]));

            const children = await provider.getChildren();

            expect(children).toHaveLength(1);
            expect(children[0]?.label).toBe('No agents found');
            expect(children[0]?.contextValue).toBe('emptyState');
        });

        it('should return agents with create button', async () => {
            const mockAgents: AgentItem[] = [
                {
                    label: 'test-agent',
                    name: 'test-agent',
                    description: 'Test agent',
                    filePath: '/path/test-agent.json',
                    contextValue: 'agent'
                }
            ];
            
            // Simulate agent list being set
            (provider as any).agentItems = mockAgents;

            const children = await provider.getChildren();

            expect(children).toHaveLength(2); // Create button + 1 agent
            expect(children[0]?.label).toBe('Create New Agent');
            expect(children[0]?.contextValue).toBe('createAgent');
            expect(children[1]?.label).toBe('test-agent');
            expect(children[1]?.contextValue).toBe('agent');
        });

        it('should measure performance', async () => {
            await provider.getChildren();

            expect(mockPerformanceMonitor.measureAsync).toHaveBeenCalledWith(
                'getAgentTreeChildren',
                expect.any(Function)
            );
        });
    });

    describe('refresh', () => {
        it('should refresh agent list', async () => {
            await provider.refresh();

            expect(mockAgentService.refreshAgentList).toHaveBeenCalled();
            expect(mockLogger.debug).toHaveBeenCalledWith('Refreshing agent tree');
        });

        it('should not refresh when disposed', async () => {
            provider.dispose();
            await provider.refresh();

            expect(mockAgentService.refreshAgentList).not.toHaveBeenCalled();
        });
    });

    describe('dispose', () => {
        it('should dispose properly', () => {
            provider.dispose();

            expect(mockLogger.debug).toHaveBeenCalledWith('AgentTreeProvider disposed');
        });

        it('should not dispose twice', () => {
            provider.dispose();
            provider.dispose();

            expect(mockLogger.debug).toHaveBeenCalledTimes(1);
        });
    });
});
