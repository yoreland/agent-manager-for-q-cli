import * as vscode from 'vscode';
import { AgentManagementService } from '../services/agentManagementService';
import { AgentConfigService } from '../services/agentConfigService';
import { ExtensionLogger } from '../services/logger';
import { ErrorHandler } from '../services/errorHandler';
import { AgentItem, DEFAULT_AGENT_CONFIG } from '../types/agent';
import { LogLevel } from '../types/extension';

// Mock VS Code API
jest.mock('vscode', () => ({
    window: {
        createOutputChannel: jest.fn(() => ({
            appendLine: jest.fn(),
            show: jest.fn(),
            dispose: jest.fn()
        })),
        showErrorMessage: jest.fn(),
        showInformationMessage: jest.fn(),
        showWarningMessage: jest.fn(),
        showTextDocument: jest.fn()
    },
    workspace: {
        workspaceFolders: [{
            uri: { fsPath: '/test/workspace' }
        }],
        openTextDocument: jest.fn()
    },
    TreeItemCollapsibleState: {
        None: 0,
        Collapsed: 1,
        Expanded: 2
    },
    ThemeIcon: jest.fn(),
    EventEmitter: jest.fn(() => ({
        event: jest.fn(),
        fire: jest.fn(),
        dispose: jest.fn()
    }))
}));

describe('Agent Open Integration Tests', () => {
    let agentManagementService: AgentManagementService;
    let mockAgentConfigService: jest.Mocked<AgentConfigService>;
    let mockLogger: ExtensionLogger;
    let mockErrorHandler: jest.Mocked<ErrorHandler>;

    const testAgentItem: AgentItem = {
        label: 'test-agent',
        description: 'Test agent',
        contextValue: 'agentItem',
        filePath: '/test/workspace/.amazonq/cli-agents/test-agent.json',
        config: {
            ...DEFAULT_AGENT_CONFIG,
            name: 'test-agent'
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

        // Create mock agent config service
        mockAgentConfigService = {
            fileExists: jest.fn().mockResolvedValue(true),
            ensureAgentDirectory: jest.fn().mockResolvedValue(undefined),
            getAgentDirectory: jest.fn().mockReturnValue('/test/workspace/.amazonq/cli-agents'),
            scanAgentFiles: jest.fn().mockResolvedValue([]),
            readAgentConfig: jest.fn().mockResolvedValue(testAgentItem.config),
            writeAgentConfig: jest.fn().mockResolvedValue(undefined),
            deleteAgentConfig: jest.fn().mockResolvedValue(undefined),
            validateAgentConfig: jest.fn().mockReturnValue({ isValid: true, errors: [] }),
            isAgentNameExists: jest.fn().mockResolvedValue(false),
            validateAgentName: jest.fn().mockReturnValue({ isValid: true, errors: [] }),
            createDefaultAgentConfig: jest.fn().mockReturnValue(testAgentItem.config),
            createAgentConfigFromTemplate: jest.fn().mockReturnValue(testAgentItem.config),
            createMinimalAgentConfig: jest.fn().mockReturnValue(testAgentItem.config),
            createComprehensiveAgentConfig: jest.fn().mockReturnValue(testAgentItem.config),
            getAgentFilePath: jest.fn().mockReturnValue('/test/workspace/.amazonq/cli-agents/test-agent.json'),
            extractAgentNameFromPath: jest.fn().mockReturnValue('test-agent'),
            isValidAgentFilePath: jest.fn().mockReturnValue(true),
            isValidTool: jest.fn().mockReturnValue(true),
            getTemplateSuggestions: jest.fn().mockReturnValue([]),
            validateTemplateOptions: jest.fn().mockReturnValue({ isValid: true, errors: [] })
        } as any;

        // Create mock error handler
        mockErrorHandler = {
            handleAgentCreationError: jest.fn(),
            handleFileSystemError: jest.fn(),
            handleValidationError: jest.fn(),
            handleFileAccessError: jest.fn(),
            showSuccessMessage: jest.fn(),
            showErrorMessage: jest.fn(),
            showWarningMessage: jest.fn(),
            categorizeError: jest.fn(),
            getErrorSuggestions: jest.fn(),
            isRecoverableError: jest.fn(),
            handleActivationError: jest.fn(),
            logCompatibilityIssue: jest.fn()
        } as any;

        // Create agent management service
        agentManagementService = new AgentManagementService(
            mockAgentConfigService,
            mockLogger,
            mockErrorHandler
        );
    });

    afterEach(() => {
        agentManagementService.dispose();
    });

    test('should open agent configuration file successfully', async () => {
        // Mock successful file opening
        const mockDocument = { uri: { fsPath: testAgentItem.filePath } };
        (vscode.workspace.openTextDocument as jest.Mock).mockResolvedValue(mockDocument);
        (vscode.window.showTextDocument as jest.Mock).mockResolvedValue(undefined);

        // Call the open agent file method
        await agentManagementService.openAgentConfigFile(testAgentItem);

        // Verify that file existence was checked
        expect(mockAgentConfigService.fileExists).toHaveBeenCalledWith(testAgentItem.filePath);

        // Verify that the document was opened
        expect(vscode.workspace.openTextDocument).toHaveBeenCalledWith(testAgentItem.filePath);

        // Verify that the document was shown in the editor
        expect(vscode.window.showTextDocument).toHaveBeenCalledWith(mockDocument, {
            preview: false,
            preserveFocus: false
        });

        // Verify no error was shown
        expect(mockErrorHandler.handleFileAccessError).not.toHaveBeenCalled();
    });

    test('should handle file not found error', async () => {
        // Mock file not existing
        mockAgentConfigService.fileExists.mockResolvedValue(false);

        // Call the open agent file method
        await agentManagementService.openAgentConfigFile(testAgentItem);

        // Verify that file existence was checked
        expect(mockAgentConfigService.fileExists).toHaveBeenCalledWith(testAgentItem.filePath);

        // Verify that error handler was called
        expect(mockErrorHandler.handleFileAccessError).toHaveBeenCalledWith(
            expect.any(Error),
            testAgentItem.filePath
        );

        // Verify that document opening was not attempted
        expect(vscode.workspace.openTextDocument).not.toHaveBeenCalled();
        expect(vscode.window.showTextDocument).not.toHaveBeenCalled();
    });

    test('should handle document opening error', async () => {
        // Mock file exists but document opening fails
        mockAgentConfigService.fileExists.mockResolvedValue(true);
        const openError = new Error('Failed to open document');
        (vscode.workspace.openTextDocument as jest.Mock).mockRejectedValue(openError);

        // Call the open agent file method and expect it to throw
        await expect(agentManagementService.openAgentConfigFile(testAgentItem)).rejects.toThrow();

        // Verify that file existence was checked
        expect(mockAgentConfigService.fileExists).toHaveBeenCalledWith(testAgentItem.filePath);

        // Verify that document opening was attempted
        expect(vscode.workspace.openTextDocument).toHaveBeenCalledWith(testAgentItem.filePath);

        // Verify that error handler was called
        expect(mockErrorHandler.handleFileAccessError).toHaveBeenCalledWith(
            openError,
            testAgentItem.filePath
        );
    });

    test('should handle show text document error', async () => {
        // Mock file exists and document opens but showing fails
        mockAgentConfigService.fileExists.mockResolvedValue(true);
        const mockDocument = { uri: { fsPath: testAgentItem.filePath } };
        (vscode.workspace.openTextDocument as jest.Mock).mockResolvedValue(mockDocument);
        const showError = new Error('Failed to show document');
        (vscode.window.showTextDocument as jest.Mock).mockRejectedValue(showError);

        // Call the open agent file method and expect it to throw
        await expect(agentManagementService.openAgentConfigFile(testAgentItem)).rejects.toThrow();

        // Verify that file existence was checked
        expect(mockAgentConfigService.fileExists).toHaveBeenCalledWith(testAgentItem.filePath);

        // Verify that document opening was attempted
        expect(vscode.workspace.openTextDocument).toHaveBeenCalledWith(testAgentItem.filePath);

        // Verify that showing document was attempted
        expect(vscode.window.showTextDocument).toHaveBeenCalledWith(mockDocument, {
            preview: false,
            preserveFocus: false
        });

        // Verify that error handler was called
        expect(mockErrorHandler.handleFileAccessError).toHaveBeenCalledWith(
            showError,
            testAgentItem.filePath
        );
    });
});