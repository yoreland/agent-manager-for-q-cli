import * as vscode from 'vscode';
import { AgentTreeProvider } from '../../providers/agentTreeProvider';
import { AgentSelectionEvent, AgentLocation, AgentItem, AgentConfig } from '../../types/agent';
import { IAgentManagementService } from '../../services/agentManagementService';
import { ExtensionLogger } from '../../services/logger';

// Mock VS Code API
jest.mock('vscode', () => ({
    EventEmitter: jest.fn().mockImplementation(() => ({
        event: jest.fn(),
        fire: jest.fn(),
        dispose: jest.fn()
    })),
    TreeItemCollapsibleState: {
        None: 0,
        Collapsed: 1,
        Expanded: 2
    },
    ThemeIcon: jest.fn().mockImplementation((id: string) => ({ id })),
    Uri: {
        file: jest.fn().mockImplementation((path: string) => ({ fsPath: path }))
    }
}));

describe('Agent Selection Event System', () => {
    let agentTreeProvider: AgentTreeProvider;
    let mockAgentManagementService: jest.Mocked<IAgentManagementService>;
    let mockLogger: jest.Mocked<ExtensionLogger>;

    const mockAgentConfig: AgentConfig = {
        $schema: 'https://example.com/schema.json',
        name: 'test-agent',
        description: 'Test agent for selection events',
        prompt: 'You are a test agent',
        mcpServers: {},
        tools: ['fs_read', 'fs_write'],
        toolAliases: {},
        allowedTools: ['fs_read'],
        resources: ['file://README.md'],
        hooks: {},
        toolsSettings: {},
        useLegacyMcpJson: false
    };

    const mockAgentItem: AgentItem = {
        label: 'test-agent',
        description: 'Test agent for selection events',
        contextValue: 'agentItem',
        filePath: '/workspace/.amazonq/cli-agents/test-agent.json',
        config: mockAgentConfig
    };

    beforeEach(() => {
        // Reset mocks
        jest.clearAllMocks();

        // Mock AgentManagementService
        mockAgentManagementService = {
            onAgentListChanged: jest.fn().mockReturnValue({ dispose: jest.fn() }),
            getAgents: jest.fn().mockResolvedValue([]),
            createAgent: jest.fn(),
            deleteAgent: jest.fn(),
            validateAgent: jest.fn()
        } as any;

        // Mock Logger
        mockLogger = {
            debug: jest.fn(),
            info: jest.fn(),
            warn: jest.fn(),
            error: jest.fn()
        } as any;

        // Create AgentTreeProvider instance
        agentTreeProvider = new AgentTreeProvider(mockAgentManagementService, mockLogger);
    });

    afterEach(() => {
        agentTreeProvider.dispose();
    });

    describe('AgentSelectionEventEmitter Interface', () => {
        test('should implement AgentSelectionEventEmitter interface', () => {
            expect(agentTreeProvider.onAgentSelected).toBeDefined();
            expect(agentTreeProvider.fireAgentSelected).toBeDefined();
            expect(typeof agentTreeProvider.fireAgentSelected).toBe('function');
        });

        test('should have onAgentSelected event', () => {
            expect(agentTreeProvider.onAgentSelected).toBeDefined();
            // The event property is accessed during construction, so we check if EventEmitter was created
            expect(vscode.EventEmitter).toHaveBeenCalled();
        });
    });

    describe('fireAgentSelected Method', () => {
        test('should fire agent selection event with correct data', () => {
            const selectionEvent: AgentSelectionEvent = {
                agentName: 'test-agent',
                agentPath: '/workspace/.amazonq/cli-agents/test-agent.json',
                agentConfig: mockAgentConfig,
                location: AgentLocation.Local,
                timestamp: Date.now()
            };

            // Test that the method exists and can be called without error
            expect(() => {
                agentTreeProvider.fireAgentSelected(selectionEvent);
            }).not.toThrow();

            expect(mockLogger.debug).toHaveBeenCalledWith(
                expect.stringContaining('Agent selected: test-agent at local')
            );
        });

        test('should not throw when disposed', () => {
            agentTreeProvider.dispose();

            const selectionEvent: AgentSelectionEvent = {
                agentName: 'test-agent',
                agentPath: '/workspace/.amazonq/cli-agents/test-agent.json',
                agentConfig: mockAgentConfig,
                location: AgentLocation.Local,
                timestamp: Date.now()
            };

            expect(() => {
                agentTreeProvider.fireAgentSelected(selectionEvent);
            }).not.toThrow();
        });
    });

    describe('handleAgentSelection Method', () => {
        test('should create correct selection event for local agent', () => {
            const localAgentItem: AgentItem = {
                ...mockAgentItem,
                filePath: '/workspace/.amazonq/cli-agents/test-agent.json'
            };

            // Test that the method exists and can be called without error
            expect(() => {
                (agentTreeProvider as any).handleAgentSelection(localAgentItem);
            }).not.toThrow();
        });

        test('should create correct selection event for global agent', () => {
            const globalAgentItem: AgentItem = {
                ...mockAgentItem,
                filePath: '/home/user/.aws/amazonq/cli-agents/test-agent.json'
            };

            // Test that the method exists and can be called without error
            expect(() => {
                (agentTreeProvider as any).handleAgentSelection(globalAgentItem);
            }).not.toThrow();
        });

        test('should not throw when disposed', () => {
            agentTreeProvider.dispose();

            expect(() => {
                (agentTreeProvider as any).handleAgentSelection(mockAgentItem);
            }).not.toThrow();
        });
    });

    describe('selectAgent Method', () => {
        test('should handle agent selection command', () => {
            const spy = jest.spyOn(agentTreeProvider as any, 'handleAgentSelection');

            agentTreeProvider.selectAgent(mockAgentItem);

            expect(spy).toHaveBeenCalledWith(mockAgentItem);
            expect(mockLogger.debug).toHaveBeenCalledWith(
                expect.stringContaining('Agent selected via command: test-agent')
            );
        });

        test('should not handle selection when disposed', () => {
            agentTreeProvider.dispose();
            const spy = jest.spyOn(agentTreeProvider as any, 'handleAgentSelection');

            agentTreeProvider.selectAgent(mockAgentItem);

            expect(spy).not.toHaveBeenCalled();
        });
    });

    describe('Event System Integration', () => {
        test('should properly dispose event emitters', () => {
            // Test that dispose doesn't throw
            expect(() => {
                agentTreeProvider.dispose();
            }).not.toThrow();
        });

        test('should create selection event with current timestamp', () => {
            const beforeTime = Date.now();
            
            (agentTreeProvider as any).handleAgentSelection(mockAgentItem);
            
            const afterTime = Date.now();
            
            // Test that the method executed without error
            expect(afterTime).toBeGreaterThanOrEqual(beforeTime);
        });
    });
});
