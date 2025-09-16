import * as vscode from 'vscode';
import { activate } from '../extension';

// Mock VS Code API
jest.mock('vscode', () => ({
    workspace: {
        workspaceFolders: [{
            uri: { fsPath: '/test/workspace' },
            name: 'test-workspace',
            index: 0
        }],
        createFileSystemWatcher: jest.fn().mockReturnValue({
            onDidCreate: jest.fn(),
            onDidChange: jest.fn(),
            onDidDelete: jest.fn(),
            dispose: jest.fn()
        }),
        getConfiguration: jest.fn().mockReturnValue({
            get: jest.fn().mockReturnValue('info')
        }),
        onDidChangeConfiguration: jest.fn()
    },
    window: {
        createOutputChannel: jest.fn().mockReturnValue({
            name: 'test-channel',
            append: jest.fn(),
            appendLine: jest.fn(),
            replace: jest.fn(),
            clear: jest.fn(),
            show: jest.fn(),
            hide: jest.fn(),
            dispose: jest.fn()
        }),
        showInputBox: jest.fn(),
        showErrorMessage: jest.fn(),
        showInformationMessage: jest.fn(),
        showWarningMessage: jest.fn(),
        createTreeView: jest.fn().mockReturnValue({
            dispose: jest.fn()
        })
    },
    commands: {
        registerCommand: jest.fn().mockReturnValue({
            dispose: jest.fn()
        }),
        executeCommand: jest.fn()
    },
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
    RelativePattern: jest.fn().mockImplementation((base: string, pattern: string) => ({ base, pattern })),
    TreeItem: jest.fn()
}));

// Mock file system
jest.mock('fs/promises', () => ({
    readdir: jest.fn().mockResolvedValue([]),
    readFile: jest.fn().mockResolvedValue('{}'),
    writeFile: jest.fn().mockResolvedValue(undefined),
    mkdir: jest.fn().mockResolvedValue(undefined),
    access: jest.fn().mockResolvedValue(undefined)
}));

describe('Agent Creation Integration Tests', () => {
    let mockContext: vscode.ExtensionContext;

    beforeEach(() => {
        jest.clearAllMocks();
        
        mockContext = {
            subscriptions: [],
            workspaceState: {
                get: jest.fn(),
                update: jest.fn(),
                keys: jest.fn().mockReturnValue([])
            },
            globalState: {
                get: jest.fn(),
                update: jest.fn(),
                keys: jest.fn().mockReturnValue([]),
                setKeysForSync: jest.fn()
            },
            extensionUri: { fsPath: '/test/extension' } as any,
            extensionPath: '/test/extension',
            asAbsolutePath: jest.fn(),
            storageUri: { fsPath: '/test/storage' } as any,
            storagePath: '/test/storage',
            globalStorageUri: { fsPath: '/test/global-storage' } as any,
            globalStoragePath: '/test/global-storage',
            logUri: { fsPath: '/test/logs' } as any,
            logPath: '/test/logs',
            extensionMode: 1,
            environmentVariableCollection: {} as any,
            secrets: {} as any,
            extension: {} as any,
            languageModelAccessInformation: {} as any
        } as vscode.ExtensionContext;
    });

    test('should register create agent command during activation', async () => {
        // Execute
        await activate(mockContext);

        // Verify that the create agent command was registered
        expect(vscode.commands.registerCommand).toHaveBeenCalledWith(
            'qcli-agents.createAgent',
            expect.any(Function)
        );
    });

    test('should handle create agent command execution', async () => {
        // Setup
        (vscode.window.showInputBox as jest.Mock).mockResolvedValue('test-agent');
        
        // Execute activation
        await activate(mockContext);

        // Get the registered command handler
        const registerCommandCalls = (vscode.commands.registerCommand as jest.Mock).mock.calls;
        const createAgentCall = registerCommandCalls.find(call => call[0] === 'qcli-agents.createAgent');
        
        expect(createAgentCall).toBeDefined();
        
        const commandHandler = createAgentCall[1];
        
        // Wait for non-critical components to initialize
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Execute the command handler
        await commandHandler();

        // Verify that the agent creation was attempted (should show error since agent already exists in mock)
        expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
            expect.stringContaining('already exists')
        );
    });
});