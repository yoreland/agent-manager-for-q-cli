import * as vscode from 'vscode';
import { AgentManagementService, IAgentManagementService } from '../services/agentManagementService';
import { IAgentConfigService } from '../services/agentConfigService';
import { ExtensionLogger } from '../services/logger';
import { 
    AgentConfig,
    DEFAULT_AGENT_CONFIG
} from '../types/agent';
import { LogLevel } from '../types/extension';

// Mock VS Code API
jest.mock('vscode', () => ({
    workspace: {
        workspaceFolders: [{
            uri: { fsPath: '/test/workspace' },
            name: 'test-workspace',
            index: 0
        }],
        createFileSystemWatcher: jest.fn()
    },
    window: {
        showInputBox: jest.fn(),
        showErrorMessage: jest.fn(),
        showInformationMessage: jest.fn()
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
    RelativePattern: jest.fn().mockImplementation((base: string, pattern: string) => ({ base, pattern }))
}));

// Mock file system watcher
const mockFileWatcher = {
    onDidCreate: jest.fn(),
    onDidChange: jest.fn(),
    onDidDelete: jest.fn(),
    dispose: jest.fn()
};

describe('AgentManagementService', () => {
    let agentManagementService: IAgentManagementService;
    let mockAgentConfigService: jest.Mocked<IAgentConfigService>;
    let mockLogger: ExtensionLogger;

    const testAgentConfig: AgentConfig = {
        ...DEFAULT_AGENT_CONFIG,
        name: 'test-agent',
        description: 'Test agent for unit tests'
    };



    beforeEach(() => {
        // Reset mocks
        jest.clearAllMocks();
        
        // Setup workspace mock
        (vscode.workspace.createFileSystemWatcher as jest.Mock).mockReturnValue(mockFileWatcher);
        
        // Create mock output channel
        const mockOutputChannel = {
            name: 'test-channel',
            append: jest.fn(),
            appendLine: jest.fn(),
            replace: jest.fn(),
            clear: jest.fn(),
            show: jest.fn(),
            hide: jest.fn(),
            dispose: jest.fn()
        } as any;
        
        // Create mock logger
        mockLogger = new ExtensionLogger(mockOutputChannel, LogLevel.DEBUG, true);
        
        // Create mock agent config service
        mockAgentConfigService = {
            ensureAgentDirectory: jest.fn().mockResolvedValue(undefined),
            getAgentDirectory: jest.fn().mockReturnValue('/test/workspace/.amazonq/cli-agents'),
            scanAgentFiles: jest.fn().mockResolvedValue([]),
            readAgentConfig: jest.fn().mockResolvedValue(testAgentConfig),
            writeAgentConfig: jest.fn().mockResolvedValue(undefined),
            deleteAgentConfig: jest.fn().mockResolvedValue(undefined),
            validateAgentConfig: jest.fn().mockReturnValue({ isValid: true, errors: [] }),
            isAgentNameExists: jest.fn().mockResolvedValue(false),
            validateAgentName: jest.fn().mockReturnValue({ isValid: true, errors: [] }),
            createDefaultAgentConfig: jest.fn().mockReturnValue(testAgentConfig),
            createAgentConfigFromTemplate: jest.fn().mockReturnValue(testAgentConfig),
            createMinimalAgentConfig: jest.fn().mockReturnValue(testAgentConfig),
            createComprehensiveAgentConfig: jest.fn().mockReturnValue(testAgentConfig),
            getAgentFilePath: jest.fn().mockReturnValue('/test/workspace/.amazonq/cli-agents/test-agent.json'),
            extractAgentNameFromPath: jest.fn().mockReturnValue('test-agent'),
            isValidAgentFilePath: jest.fn().mockReturnValue(true),
            fileExists: jest.fn().mockResolvedValue(true),
            isValidTool: jest.fn().mockReturnValue(true),
            getTemplateSuggestions: jest.fn().mockReturnValue([]),
            validateTemplateOptions: jest.fn().mockReturnValue({ isValid: true, errors: [] })
        };
        
        // Create mock error handler
        const mockErrorHandler = {
            handleAgentCreationError: jest.fn(),
            handleFileSystemError: jest.fn(),
            handleValidationError: jest.fn(),
            showErrorMessage: jest.fn(),
            showSuccessMessage: jest.fn(),
            showWarningMessage: jest.fn()
        } as any;

        // Create service instance
        agentManagementService = new AgentManagementService(mockAgentConfigService, mockLogger, mockErrorHandler);
    });

    afterEach(() => {
        // Clean up
        agentManagementService.dispose();
    });

    describe('getAgentList', () => {
        it('should return empty list when no agent files exist', async () => {
            mockAgentConfigService.scanAgentFiles.mockResolvedValue([]);
            
            const result = await agentManagementService.getAgentList();
            
            expect(result).toEqual([]);
            expect(mockAgentConfigService.scanAgentFiles).toHaveBeenCalledTimes(1);
        });

        it('should return agent items for valid agent files', async () => {
            const agentFiles = ['/test/workspace/.amazonq/cli-agents/test-agent.json'];
            mockAgentConfigService.scanAgentFiles.mockResolvedValue(agentFiles);
            mockAgentConfigService.readAgentConfig.mockResolvedValue(testAgentConfig);
            
            const result = await agentManagementService.getAgentList();
            
            expect(result).toHaveLength(1);
            expect(result[0]!.label).toBe('test-agent');
            expect(result[0]!.config).toEqual(testAgentConfig);
            expect(mockAgentConfigService.readAgentConfig).toHaveBeenCalledWith(agentFiles[0]);
        });

        it('should handle invalid agent files gracefully', async () => {
            const agentFiles = ['/test/workspace/.amazonq/cli-agents/invalid-agent.json'];
            mockAgentConfigService.scanAgentFiles.mockResolvedValue(agentFiles);
            mockAgentConfigService.readAgentConfig.mockRejectedValue(new Error('Invalid JSON'));
            mockAgentConfigService.extractAgentNameFromPath.mockReturnValue('invalid-agent');
            
            const result = await agentManagementService.getAgentList();
            
            expect(result).toHaveLength(1);
            expect(result[0]!.label).toBe('invalid-agent (Invalid)');
            expect(result[0]!.contextValue).toBe('invalidAgentItem');
        });

        it('should sort agents by name', async () => {
            const agentFiles = [
                '/test/workspace/.amazonq/cli-agents/zebra-agent.json',
                '/test/workspace/.amazonq/cli-agents/alpha-agent.json'
            ];
            mockAgentConfigService.scanAgentFiles.mockResolvedValue(agentFiles);
            mockAgentConfigService.readAgentConfig
                .mockResolvedValueOnce({ ...testAgentConfig, name: 'zebra-agent' })
                .mockResolvedValueOnce({ ...testAgentConfig, name: 'alpha-agent' });
            
            const result = await agentManagementService.getAgentList();
            
            expect(result).toHaveLength(2);
            expect(result[0]!.label).toBe('alpha-agent');
            expect(result[1]!.label).toBe('zebra-agent');
        });
    });

    describe('createNewAgent', () => {
        it('should create a new agent successfully', async () => {
            const agentName = 'new-agent';
            mockAgentConfigService.validateAgentName.mockReturnValue({ isValid: true, errors: [] });
            mockAgentConfigService.isAgentNameExists.mockResolvedValue(false);
            mockAgentConfigService.createDefaultAgentConfig.mockReturnValue({ ...testAgentConfig, name: agentName });
            mockAgentConfigService.getAgentFilePath.mockReturnValue(`/test/workspace/.amazonq/cli-agents/${agentName}.json`);
            
            const result = await agentManagementService.createNewAgent(agentName);
            
            expect(result.success).toBe(true);
            expect(result.message).toContain('created successfully');
            expect(result.agentItem).toBeDefined();
            expect(result.agentItem!.label).toBe(agentName);
            expect(mockAgentConfigService.writeAgentConfig).toHaveBeenCalledWith(agentName, expect.any(Object));
        });

        it('should fail when agent name is invalid', async () => {
            const agentName = 'invalid name!';
            mockAgentConfigService.validateAgentName.mockReturnValue({ 
                isValid: false, 
                errors: ['Invalid characters in name'] 
            });
            
            const result = await agentManagementService.createNewAgent(agentName);
            
            expect(result.success).toBe(false);
            expect(result.message).toContain('Invalid agent name');
            expect(mockAgentConfigService.writeAgentConfig).not.toHaveBeenCalled();
        });

        it('should fail when agent already exists', async () => {
            const agentName = 'existing-agent';
            mockAgentConfigService.validateAgentName.mockReturnValue({ isValid: true, errors: [] });
            mockAgentConfigService.isAgentNameExists.mockResolvedValue(true);
            
            const result = await agentManagementService.createNewAgent(agentName);
            
            expect(result.success).toBe(false);
            expect(result.message).toContain('already exists');
            expect(mockAgentConfigService.writeAgentConfig).not.toHaveBeenCalled();
        });

        it('should handle file system errors', async () => {
            const agentName = 'test-agent';
            mockAgentConfigService.validateAgentName.mockReturnValue({ isValid: true, errors: [] });
            mockAgentConfigService.isAgentNameExists.mockResolvedValue(false);
            mockAgentConfigService.createDefaultAgentConfig.mockReturnValue({ ...testAgentConfig, name: agentName });
            mockAgentConfigService.writeAgentConfig.mockRejectedValue(new Error('Permission denied'));
            
            const result = await agentManagementService.createNewAgent(agentName);
            
            expect(result.success).toBe(false);
            expect(result.message).toContain('Permission denied');
            expect(result.error).toBeDefined();
        });
    });

    describe('refreshAgentList', () => {
        it('should refresh agent list and fire change event', async () => {
            const mockEventEmitter = {
                fire: jest.fn(),
                event: jest.fn(),
                dispose: jest.fn()
            };
            
            // Mock the event emitter
            (agentManagementService as any)._onAgentListChanged = mockEventEmitter;
            
            mockAgentConfigService.scanAgentFiles.mockResolvedValue(['/test/workspace/.amazonq/cli-agents/test-agent.json']);
            mockAgentConfigService.readAgentConfig.mockResolvedValue(testAgentConfig);
            
            await agentManagementService.refreshAgentList();
            
            expect(mockEventEmitter.fire).toHaveBeenCalledWith(expect.any(Array));
        });
    });

    describe('file watcher', () => {
        it('should start file watcher successfully', () => {
            agentManagementService.startFileWatcher();
            
            expect(vscode.workspace.createFileSystemWatcher).toHaveBeenCalledWith(
                expect.objectContaining({
                    base: '/test/workspace/.amazonq/cli-agents',
                    pattern: '*.json'
                })
            );
            expect(mockFileWatcher.onDidCreate).toHaveBeenCalled();
            expect(mockFileWatcher.onDidChange).toHaveBeenCalled();
            expect(mockFileWatcher.onDidDelete).toHaveBeenCalled();
        });

        it('should not start file watcher if already running', () => {
            agentManagementService.startFileWatcher();
            agentManagementService.startFileWatcher();
            
            expect(vscode.workspace.createFileSystemWatcher).toHaveBeenCalledTimes(1);
        });

        it('should stop file watcher successfully', () => {
            agentManagementService.startFileWatcher();
            agentManagementService.stopFileWatcher();
            
            expect(mockFileWatcher.dispose).toHaveBeenCalled();
        });
    });

    describe('validateAgentName', () => {
        it('should delegate to agent config service', () => {
            const agentName = 'test-agent';
            const expectedResult = { isValid: true, errors: [] };
            mockAgentConfigService.validateAgentName.mockReturnValue(expectedResult);
            
            const result = agentManagementService.validateAgentName(agentName);
            
            expect(result).toEqual(expectedResult);
            expect(mockAgentConfigService.validateAgentName).toHaveBeenCalledWith(agentName);
        });
    });

    describe('interactive agent creation', () => {
        it('should create agent interactively with valid input', async () => {
            const agentName = 'interactive-agent';
            (vscode.window.showInputBox as jest.Mock).mockResolvedValue(agentName);
            mockAgentConfigService.validateAgentName.mockReturnValue({ isValid: true, errors: [] });
            mockAgentConfigService.isAgentNameExists.mockResolvedValue(false);
            mockAgentConfigService.createDefaultAgentConfig.mockReturnValue({ ...testAgentConfig, name: agentName });
            mockAgentConfigService.getAgentFilePath.mockReturnValue(`/test/workspace/.amazonq/cli-agents/${agentName}.json`);
            
            await (agentManagementService as any).createNewAgentInteractive();
            
            expect(vscode.window.showInputBox).toHaveBeenCalled();
            expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
                expect.stringContaining('created successfully')
            );
        });

        it('should handle user cancellation', async () => {
            (vscode.window.showInputBox as jest.Mock).mockResolvedValue(undefined);
            
            await (agentManagementService as any).createNewAgentInteractive();
            
            expect(mockAgentConfigService.writeAgentConfig).not.toHaveBeenCalled();
            expect(vscode.window.showInformationMessage).not.toHaveBeenCalled();
        });

        it('should show error message on creation failure', async () => {
            const agentName = 'test-agent';
            (vscode.window.showInputBox as jest.Mock).mockResolvedValue(agentName);
            mockAgentConfigService.validateAgentName.mockReturnValue({ isValid: true, errors: [] });
            mockAgentConfigService.isAgentNameExists.mockResolvedValue(false);
            mockAgentConfigService.createDefaultAgentConfig.mockReturnValue({ ...testAgentConfig, name: agentName });
            mockAgentConfigService.writeAgentConfig.mockRejectedValue(new Error('Write failed'));
            
            await (agentManagementService as any).createNewAgentInteractive();
            
            expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
                expect.stringContaining('Write failed')
            );
        });
    });

    describe('agent statistics', () => {
        it('should return correct statistics', async () => {
            // Setup mixed valid and invalid agents
            const agentFiles = [
                '/test/workspace/.amazonq/cli-agents/valid-agent.json',
                '/test/workspace/.amazonq/cli-agents/invalid-agent.json'
            ];
            mockAgentConfigService.scanAgentFiles.mockResolvedValue(agentFiles);
            mockAgentConfigService.readAgentConfig
                .mockResolvedValueOnce(testAgentConfig)
                .mockRejectedValueOnce(new Error('Invalid JSON'));
            mockAgentConfigService.extractAgentNameFromPath.mockReturnValue('invalid-agent');
            
            await agentManagementService.getAgentList();
            const stats = (agentManagementService as any).getAgentStatistics();
            
            expect(stats.total).toBe(2);
            expect(stats.valid).toBe(1);
            expect(stats.invalid).toBe(1);
        });
    });

    describe('dispose', () => {
        it('should dispose all resources', () => {
            agentManagementService.startFileWatcher();
            agentManagementService.dispose();
            
            expect(mockFileWatcher.dispose).toHaveBeenCalled();
        });
    });
});