import * as vscode from 'vscode';
import { AgentTreeProvider } from '../providers/agentTreeProvider';
import { IAgentManagementService } from '../services/agentManagementService';
import { ExtensionLogger } from '../services/logger';
import { 
    AgentItem, 
    AGENT_CONSTANTS, 
    DEFAULT_AGENT_CONFIG 
} from '../types/agent';

// Mock VS Code API
jest.mock('vscode', () => ({
    EventEmitter: jest.fn().mockImplementation(() => ({
        event: jest.fn(),
        fire: jest.fn(),
        dispose: jest.fn()
    })),
    TreeItem: jest.fn().mockImplementation((label) => ({ label })),
    TreeItemCollapsibleState: {
        None: 0,
        Collapsed: 1,
        Expanded: 2
    },
    ThemeIcon: jest.fn().mockImplementation((id) => ({ id })),
    MarkdownString: jest.fn().mockImplementation(() => ({
        appendMarkdown: jest.fn(),
        isTrusted: false
    }))
}));

describe('AgentTreeProvider', () => {
    let mockAgentManagementService: jest.Mocked<IAgentManagementService>;
    let mockLogger: jest.Mocked<ExtensionLogger>;
    let agentTreeProvider: AgentTreeProvider;
    let mockEventEmitter: any;

    const createMockAgentItem = (name: string, description?: string): AgentItem => ({
        label: name,
        description: description || `${name} description`,
        iconPath: AGENT_CONSTANTS.DEFAULT_ICON,
        contextValue: AGENT_CONSTANTS.CONTEXT_VALUES.AGENT_ITEM,
        filePath: `/path/to/${name}.json`,
        config: {
            ...DEFAULT_AGENT_CONFIG,
            name,
            description: description || `${name} description`
        },
        collapsibleState: vscode.TreeItemCollapsibleState.None
    });

    beforeEach(() => {
        // Create mock event emitter
        mockEventEmitter = {
            event: jest.fn(),
            fire: jest.fn(),
            dispose: jest.fn()
        };

        // Mock AgentManagementService
        mockAgentManagementService = {
            getAgentList: jest.fn(),
            refreshAgentList: jest.fn(),
            createNewAgent: jest.fn(),
            validateAgentName: jest.fn(),
            startFileWatcher: jest.fn(),
            stopFileWatcher: jest.fn(),
            onAgentListChanged: mockEventEmitter.event,
            dispose: jest.fn()
        } as any;

        // Mock Logger
        mockLogger = {
            debug: jest.fn(),
            info: jest.fn(),
            warn: jest.fn(),
            error: jest.fn(),
            logUserAction: jest.fn(),
            logTiming: jest.fn()
        } as any;

        // Mock vscode.EventEmitter constructor
        (vscode.EventEmitter as jest.Mock).mockImplementation(() => mockEventEmitter);

        agentTreeProvider = new AgentTreeProvider(mockAgentManagementService, mockLogger);
    });

    afterEach(() => {
        agentTreeProvider.dispose();
        jest.clearAllMocks();
    });

    describe('initialization', () => {
        it('should initialize with empty agent list', () => {
            expect(mockLogger.debug).toHaveBeenCalledWith('AgentTreeProvider initialized');
        });

        it('should register for agent list changes', () => {
            expect(mockEventEmitter.event).toHaveBeenCalled();
        });
    });

    describe('getTreeItem', () => {
        it('should return tree item for agent item', () => {
            const agentItem = createMockAgentItem('test-agent');
            
            const treeItem = agentTreeProvider.getTreeItem(agentItem);
            
            expect(treeItem.label).toBe('test-agent');
            expect(vscode.TreeItem).toHaveBeenCalledWith('test-agent');
        });

        it('should return tree item for create button', async () => {
            const children = await agentTreeProvider.getChildren();
            const createButton = children[0]; // First item should be create button
            
            if (createButton) {
                const treeItem = agentTreeProvider.getTreeItem(createButton);
                expect(treeItem.label).toBe('Create New Agent');
            }
        });

        it('should handle disposed state', () => {
            agentTreeProvider.dispose();
            
            const agentItem = createMockAgentItem('test-agent');
            const treeItem = agentTreeProvider.getTreeItem(agentItem);
            
            expect(treeItem.label).toBe('Disposed');
        });
    });

    describe('getChildren', () => {
        it('should return root items when no element provided', async () => {
            const children = await agentTreeProvider.getChildren();
            
            // Should have create button and empty state
            expect(children).toHaveLength(2);
            expect(children[0]).toHaveProperty('label', 'Create New Agent');
            expect(children[1]).toHaveProperty('label', 'No agents found');
        });

        it('should return agent items when agents exist', async () => {
            const mockAgents = [
                createMockAgentItem('agent1'),
                createMockAgentItem('agent2')
            ];
            
            agentTreeProvider.updateAgentItems(mockAgents);
            const children = await agentTreeProvider.getChildren();
            
            // Should have create button + 2 agents
            expect(children).toHaveLength(3);
            expect(children[0]).toHaveProperty('label', 'Create New Agent');
            expect(children[1]).toHaveProperty('label', 'agent1');
            expect(children[2]).toHaveProperty('label', 'agent2');
        });

        it('should return empty array when disposed', async () => {
            agentTreeProvider.dispose();
            
            const children = await agentTreeProvider.getChildren();
            
            expect(children).toEqual([]);
        });

        it('should return agent children when agent element provided', async () => {
            const agentWithChildren = createMockAgentItem('parent-agent');
            agentWithChildren.children = [createMockAgentItem('child-agent')];
            
            const children = await agentTreeProvider.getChildren(agentWithChildren);
            
            expect(children).toHaveLength(1);
            expect(children[0]).toHaveProperty('label', 'child-agent');
        });
    });

    describe('updateAgentItems', () => {
        it('should update agent items and refresh tree', () => {
            const mockAgents = [
                createMockAgentItem('agent1'),
                createMockAgentItem('agent2')
            ];
            
            agentTreeProvider.updateAgentItems(mockAgents);
            
            expect(mockLogger.debug).toHaveBeenCalledWith('Updating agent tree with 2 items');
            expect(mockEventEmitter.fire).toHaveBeenCalled();
        });

        it('should handle empty agent list', () => {
            agentTreeProvider.updateAgentItems([]);
            
            expect(mockLogger.debug).toHaveBeenCalledWith('Updating agent tree with 0 items');
            expect(mockEventEmitter.fire).toHaveBeenCalled();
        });

        it('should not update when disposed', () => {
            agentTreeProvider.dispose();
            
            agentTreeProvider.updateAgentItems([createMockAgentItem('test')]);
            
            // Should not log or fire events after disposal
            expect(mockLogger.debug).not.toHaveBeenCalledWith(expect.stringContaining('Updating agent tree'));
        });
    });

    describe('addAgentItem', () => {
        it('should add new agent item', () => {
            const agentItem = createMockAgentItem('new-agent');
            
            agentTreeProvider.addAgentItem(agentItem);
            
            expect(mockLogger.debug).toHaveBeenCalledWith('Adding agent item: new-agent');
            expect(mockEventEmitter.fire).toHaveBeenCalled();
        });

        it('should replace existing agent item with same name', () => {
            const originalAgent = createMockAgentItem('test-agent', 'original description');
            const updatedAgent = createMockAgentItem('test-agent', 'updated description');
            
            agentTreeProvider.addAgentItem(originalAgent);
            agentTreeProvider.addAgentItem(updatedAgent);
            
            const agentItems = agentTreeProvider.getAgentItems();
            expect(agentItems).toHaveLength(1);
            expect(agentItems[0]?.description).toBe('updated description');
        });

        it('should sort agents by label', () => {
            agentTreeProvider.addAgentItem(createMockAgentItem('zebra-agent'));
            agentTreeProvider.addAgentItem(createMockAgentItem('alpha-agent'));
            
            const agentItems = agentTreeProvider.getAgentItems();
            expect(agentItems[0]?.label).toBe('alpha-agent');
            expect(agentItems[1]?.label).toBe('zebra-agent');
        });
    });

    describe('removeAgentItem', () => {
        it('should remove agent item', () => {
            const agentItem = createMockAgentItem('test-agent');
            
            agentTreeProvider.addAgentItem(agentItem);
            expect(agentTreeProvider.getAgentItems()).toHaveLength(1);
            
            agentTreeProvider.removeAgentItem(agentItem);
            expect(agentTreeProvider.getAgentItems()).toHaveLength(0);
            expect(mockLogger.debug).toHaveBeenCalledWith('Removing agent item: test-agent');
        });

        it('should handle removing non-existent item', () => {
            const agentItem = createMockAgentItem('non-existent');
            
            agentTreeProvider.removeAgentItem(agentItem);
            
            expect(mockLogger.debug).toHaveBeenCalledWith('Removing agent item: non-existent');
            // Should not crash or cause issues
        });
    });

    describe('refresh', () => {
        it('should fire tree data change event', () => {
            agentTreeProvider.refresh();
            
            expect(mockLogger.debug).toHaveBeenCalledWith('Agent tree view refreshed');
            expect(mockEventEmitter.fire).toHaveBeenCalled();
        });

        it('should not refresh when disposed', () => {
            // Clear previous calls
            jest.clearAllMocks();
            
            agentTreeProvider.dispose();
            agentTreeProvider.refresh();
            
            // Should not log or fire after disposal
            expect(mockLogger.debug).not.toHaveBeenCalledWith('Agent tree view refreshed');
        });
    });

    describe('forceRefresh', () => {
        it('should call management service refresh', async () => {
            await agentTreeProvider.forceRefresh();
            
            expect(mockLogger.debug).toHaveBeenCalledWith('Force refreshing agent tree');
            expect(mockAgentManagementService.refreshAgentList).toHaveBeenCalled();
        });

        it('should handle refresh errors gracefully', async () => {
            const error = new Error('Refresh failed');
            mockAgentManagementService.refreshAgentList.mockRejectedValue(error);
            
            await agentTreeProvider.forceRefresh();
            
            expect(mockLogger.error).toHaveBeenCalledWith('Failed to force refresh agent tree', error);
            expect(mockEventEmitter.fire).toHaveBeenCalled();
        });

        it('should not refresh when disposed', async () => {
            agentTreeProvider.dispose();
            
            await agentTreeProvider.forceRefresh();
            
            expect(mockAgentManagementService.refreshAgentList).not.toHaveBeenCalled();
        });
    });

    describe('dispose', () => {
        it('should dispose resources and clear state', () => {
            agentTreeProvider.addAgentItem(createMockAgentItem('test'));
            expect(agentTreeProvider.getAgentItems()).toHaveLength(1);
            
            agentTreeProvider.dispose();
            
            expect(mockEventEmitter.dispose).toHaveBeenCalled();
            expect(mockLogger.debug).toHaveBeenCalledWith('AgentTreeProvider disposed');
            expect(agentTreeProvider.getAgentItems()).toHaveLength(0);
        });

        it('should handle multiple dispose calls', () => {
            agentTreeProvider.dispose();
            agentTreeProvider.dispose(); // Should not throw or cause issues
            
            expect(mockEventEmitter.dispose).toHaveBeenCalledTimes(1);
        });
    });

    describe('agent list change handling', () => {
        it('should update items when agent list changes', () => {
            const mockAgents = [createMockAgentItem('new-agent')];
            
            // Simulate agent list change event
            const onAgentListChangedCallback = mockEventEmitter.event.mock.calls[0][0];
            onAgentListChangedCallback(mockAgents);
            
            expect(mockLogger.debug).toHaveBeenCalledWith('Agent list changed: 1 agents');
            expect(mockEventEmitter.fire).toHaveBeenCalled();
        });
    });
});