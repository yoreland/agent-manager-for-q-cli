import { AgentTreeProvider } from '../providers/agentTreeProvider';
import { AgentManagementService } from '../services/agentManagementService';
import { ExtensionLogger } from '../services/logger';
import { AgentItem, DEFAULT_AGENT_CONFIG, AGENT_COMMANDS } from '../types/agent';
import { LogLevel } from '../types/extension';

// Mock VS Code API
jest.mock('vscode', () => ({
    window: {
        createOutputChannel: jest.fn(() => ({
            appendLine: jest.fn(),
            show: jest.fn(),
            dispose: jest.fn()
        }))
    },
    workspace: {
        workspaceFolders: [{
            uri: { fsPath: '/test/workspace' }
        }]
    },
    TreeItemCollapsibleState: {
        None: 0,
        Collapsed: 1,
        Expanded: 2
    },
    TreeItem: jest.fn().mockImplementation((label) => ({
        label,
        description: undefined,
        iconPath: undefined,
        contextValue: undefined,
        collapsibleState: 0,
        command: undefined,
        tooltip: undefined
    })),
    ThemeIcon: jest.fn(),
    EventEmitter: jest.fn(() => ({
        event: jest.fn(),
        fire: jest.fn(),
        dispose: jest.fn()
    })),
    MarkdownString: jest.fn().mockImplementation(() => ({
        appendMarkdown: jest.fn(),
        isTrusted: false
    }))
}));

describe('Agent Tree Command Tests', () => {
    let agentTreeProvider: AgentTreeProvider;
    let mockAgentManagementService: jest.Mocked<AgentManagementService>;
    let mockLogger: ExtensionLogger;

    const testAgentItem: AgentItem = {
        label: 'test-agent',
        description: 'Test agent',
        contextValue: 'agentItem',
        filePath: '/test/workspace/.amazonq/cli-agents/test-agent.json',
        config: {
            ...DEFAULT_AGENT_CONFIG,
            name: 'test-agent'
        },
        command: {
            command: AGENT_COMMANDS.OPEN_AGENT,
            title: 'Open Agent Configuration',
            arguments: [{ label: 'test-agent', filePath: '/test/workspace/.amazonq/cli-agents/test-agent.json', config: { ...DEFAULT_AGENT_CONFIG, name: 'test-agent' } }]
        }
    };

    beforeEach(() => {
        jest.clearAllMocks();

        // Create mock output channel
        const mockOutputChannel = {
            appendLine: jest.fn(),
            show: jest.fn(),
            dispose: jest.fn()
        } as any;

        // Create mock logger
        mockLogger = new ExtensionLogger(mockOutputChannel, LogLevel.DEBUG, true);

        // Create mock agent management service
        mockAgentManagementService = {
            getAgentList: jest.fn().mockResolvedValue([testAgentItem]),
            refreshAgentList: jest.fn().mockResolvedValue(undefined),
            createNewAgent: jest.fn(),
            createNewAgentInteractive: jest.fn(),
            validateAgentName: jest.fn(),
            openAgentConfigFile: jest.fn(),
            startFileWatcher: jest.fn(),
            stopFileWatcher: jest.fn(),
            onAgentListChanged: jest.fn(),
            dispose: jest.fn()
        } as any;

        // Create agent tree provider
        agentTreeProvider = new AgentTreeProvider(mockAgentManagementService, mockLogger);
    });

    afterEach(() => {
        agentTreeProvider.dispose();
    });

    test('should set command property on agent tree items', async () => {
        // Update the tree provider with agent items
        agentTreeProvider.updateAgentItems([testAgentItem]);

        // Get the tree item for the agent
        const treeItem = agentTreeProvider.getTreeItem(testAgentItem);

        // Verify that the tree item has the correct command set
        expect(treeItem.command).toBeDefined();
        expect(treeItem.command?.command).toBe(AGENT_COMMANDS.OPEN_AGENT);
        expect(treeItem.command?.title).toBe('Open Agent Configuration');
        expect(treeItem.command?.arguments).toBeDefined();
        expect(treeItem.command?.arguments?.[0]).toMatchObject({
            label: testAgentItem.label,
            filePath: testAgentItem.filePath,
            config: testAgentItem.config
        });
    });

    test('should set default command when agent item has no command', async () => {
        // Create agent item without command
        const agentItemWithoutCommand: AgentItem = {
            ...testAgentItem
        };
        delete agentItemWithoutCommand.command;

        // Get the tree item for the agent
        const treeItem = agentTreeProvider.getTreeItem(agentItemWithoutCommand);

        // Verify that the tree item has the default command set
        expect(treeItem.command).toBeDefined();
        expect(treeItem.command?.command).toBe(AGENT_COMMANDS.OPEN_AGENT);
        expect(treeItem.command?.title).toBe('Open Agent Configuration');
        expect(treeItem.command?.arguments).toBeDefined();
        expect(treeItem.command?.arguments?.[0]).toEqual(agentItemWithoutCommand);
    });

    test('should preserve existing command when agent item has one', async () => {
        // Create agent item with custom command
        const customCommand = {
            command: 'custom.command',
            title: 'Custom Command',
            arguments: ['custom', 'args']
        };
        const agentItemWithCustomCommand: AgentItem = {
            ...testAgentItem,
            command: customCommand
        };

        // Get the tree item for the agent
        const treeItem = agentTreeProvider.getTreeItem(agentItemWithCustomCommand);

        // Verify that the tree item preserves the custom command
        expect(treeItem.command).toBeDefined();
        expect(treeItem.command?.command).toBe('custom.command');
        expect(treeItem.command?.title).toBe('Custom Command');
        expect(treeItem.command?.arguments).toEqual(['custom', 'args']);
    });

    test('should not set command on create agent button', async () => {
        // Get root items which includes the create button
        const rootItems = await agentTreeProvider.getChildren();
        
        // Find the create button item
        const createButtonItem = rootItems.find(item => 
            'command' in item && item.contextValue === 'createAgentButton'
        );

        expect(createButtonItem).toBeDefined();

        // Get the tree item for the create button
        const treeItem = agentTreeProvider.getTreeItem(createButtonItem!);

        // Verify that the create button has its own command (not the open command)
        expect(treeItem.command).toBeDefined();
        expect(treeItem.command?.command).toBe(AGENT_COMMANDS.CREATE_AGENT);
        expect(treeItem.command?.title).toBe('Create New Agent');
    });

    test('should not set command on empty state item', async () => {
        // Update with empty agent list to show empty state
        agentTreeProvider.updateAgentItems([]);

        // Get root items which includes the empty state
        const rootItems = await agentTreeProvider.getChildren();
        
        // Find the empty state item
        const emptyStateItem = rootItems.find(item => 
            item.contextValue === 'emptyAgentState'
        );

        expect(emptyStateItem).toBeDefined();

        // Get the tree item for the empty state
        const treeItem = agentTreeProvider.getTreeItem(emptyStateItem!);

        // Verify that the empty state item has no command
        expect(treeItem.command).toBeUndefined();
    });
});