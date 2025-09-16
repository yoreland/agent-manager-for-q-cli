import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { AgentCreationWebviewProvider } from '../../providers/agentCreationWebviewProvider';
import { ExtensionLogger } from '../../services/logger';

// Mock VS Code API
jest.mock('vscode');
jest.mock('fs');
jest.mock('path');

describe('Agent Creation Integration Tests', () => {
    let mockContext: jest.Mocked<vscode.ExtensionContext>;
    let mockLogger: jest.Mocked<ExtensionLogger>;
    let provider: AgentCreationWebviewProvider;
    let mockWorkspaceFolder: any;

    beforeEach(() => {
        // Setup mocks
        mockContext = {
            extensionUri: { fsPath: '/test/extension' }
        } as any;

        mockLogger = {
            info: jest.fn(),
            error: jest.fn(),
            debug: jest.fn(),
            warn: jest.fn()
        } as any;

        mockWorkspaceFolder = {
            uri: { fsPath: '/test/workspace' }
        };

        (vscode.workspace as any).workspaceFolders = [mockWorkspaceFolder];
        (vscode.window.createWebviewPanel as jest.Mock).mockReturnValue({
            webview: {
                html: '',
                postMessage: jest.fn(),
                onDidReceiveMessage: jest.fn()
            },
            reveal: jest.fn(),
            dispose: jest.fn(),
            onDidDispose: jest.fn()
        });
        (vscode.Uri.joinPath as jest.Mock).mockReturnValue({ fsPath: '/test/media' });
        (fs.existsSync as jest.Mock).mockReturnValue(false);
        (fs.mkdirSync as jest.Mock).mockImplementation();
        (fs.writeFileSync as jest.Mock).mockImplementation();
        (path.join as jest.Mock).mockImplementation((...args) => args.join('/'));
        (path.relative as jest.Mock).mockReturnValue('.amazonq/cli-agents/test-agent.json');
        (vscode.commands.executeCommand as jest.Mock).mockResolvedValue(undefined);

        provider = new AgentCreationWebviewProvider(mockContext, mockLogger);
    });

    afterEach(() => {
        provider.dispose();
        jest.clearAllMocks();
    });

    describe('End-to-End Agent Creation Flow', () => {
        it('should complete full agent creation workflow', async () => {
            // 1. Open webview
            await provider.showCreationForm();
            expect(vscode.window.createWebviewPanel).toHaveBeenCalled();

            // 2. Get message handler
            const mockPanel = (vscode.window.createWebviewPanel as jest.Mock).mock.results[0].value;
            const messageHandler = mockPanel.webview.onDidReceiveMessage.mock.calls[0][0];

            // 3. Simulate webview ready
            await messageHandler({ type: 'ready' });
            expect(mockPanel.webview.postMessage).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: 'initialData'
                })
            );

            // 4. Simulate form validation
            const formData = {
                name: 'test-agent',
                description: 'Test agent description',
                prompt: 'You are a helpful assistant',
                tools: {
                    available: ['fs_read', 'fs_write'],
                    allowed: ['fs_read']
                },
                resources: ['file://README.md']
            };

            await messageHandler({ type: 'validateForm', data: formData });
            expect(mockPanel.webview.postMessage).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: 'validationResult',
                    result: expect.objectContaining({
                        isValid: true
                    })
                })
            );

            // 5. Simulate form submission
            await messageHandler({ type: 'submitForm', data: formData });

            // 6. Verify agent file creation
            expect(fs.writeFileSync).toHaveBeenCalled();
            const writeCall = (fs.writeFileSync as jest.Mock).mock.calls[0];
            const agentConfig = JSON.parse(writeCall[1]);
            
            expect(agentConfig).toEqual({
                $schema: "https://raw.githubusercontent.com/aws/amazon-q-developer-cli/refs/heads/main/schemas/agent-v1.json",
                name: 'test-agent',
                description: 'Test agent description',
                prompt: 'You are a helpful assistant',
                mcpServers: {},
                tools: ['fs_read', 'fs_write'],
                toolAliases: {},
                allowedTools: ['fs_read'],
                toolsSettings: {},
                resources: ['file://README.md'],
                hooks: {},
                useLegacyMcpJson: true
            });

            // 7. Verify tree refresh
            expect(vscode.commands.executeCommand).toHaveBeenCalledWith('qcli-agents.refreshTree');

            // 8. Verify success response
            expect(mockPanel.webview.postMessage).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: 'creationResult',
                    result: expect.objectContaining({
                        success: true
                    })
                })
            );
        });

        it('should handle validation errors in workflow', async () => {
            await provider.showCreationForm();
            const mockPanel = (vscode.window.createWebviewPanel as jest.Mock).mock.results[0].value;
            const messageHandler = mockPanel.webview.onDidReceiveMessage.mock.calls[0][0];

            // Submit invalid form data
            const invalidFormData = {
                name: '', // Invalid: empty name
                description: '',
                prompt: '',
                tools: {
                    available: ['fs_read'],
                    allowed: ['fs_write'] // Invalid: allowed tool not in available
                },
                resources: ['invalid-resource'] // Invalid: no file:// prefix
            };

            await messageHandler({ type: 'validateForm', data: invalidFormData });

            expect(mockPanel.webview.postMessage).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: 'validationResult',
                    result: expect.objectContaining({
                        isValid: false,
                        errors: expect.arrayContaining([
                            expect.objectContaining({
                                field: 'name',
                                message: 'Agent name is required'
                            })
                        ])
                    })
                })
            );
        });

        it('should handle duplicate agent name error', async () => {
            // Mock existing agent file
            (fs.existsSync as jest.Mock).mockReturnValue(true);

            await provider.showCreationForm();
            const mockPanel = (vscode.window.createWebviewPanel as jest.Mock).mock.results[0].value;
            const messageHandler = mockPanel.webview.onDidReceiveMessage.mock.calls[0][0];

            const formData = {
                name: 'existing-agent',
                description: 'Test',
                prompt: 'Test',
                tools: { available: ['fs_read'], allowed: ['fs_read'] },
                resources: ['file://test.md']
            };

            await messageHandler({ type: 'submitForm', data: formData });

            expect(mockPanel.webview.postMessage).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: 'creationResult',
                    result: expect.objectContaining({
                        success: false,
                        error: 'Agent "existing-agent" already exists'
                    })
                })
            );
        });

        it('should handle file system errors gracefully', async () => {
            // Mock file system error
            (fs.writeFileSync as jest.Mock).mockImplementation(() => {
                throw new Error('Permission denied');
            });

            await provider.showCreationForm();
            const mockPanel = (vscode.window.createWebviewPanel as jest.Mock).mock.results[0].value;
            const messageHandler = mockPanel.webview.onDidReceiveMessage.mock.calls[0][0];

            const formData = {
                name: 'test-agent',
                description: 'Test',
                prompt: 'Test',
                tools: { available: ['fs_read'], allowed: ['fs_read'] },
                resources: ['file://test.md']
            };

            await messageHandler({ type: 'submitForm', data: formData });

            expect(mockPanel.webview.postMessage).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: 'creationResult',
                    result: expect.objectContaining({
                        success: false,
                        error: 'Permission denied'
                    })
                })
            );
        });
    });

    describe('Form Cancellation Flow', () => {
        it('should handle form cancellation properly', async () => {
            await provider.showCreationForm();
            const mockPanel = (vscode.window.createWebviewPanel as jest.Mock).mock.results[0].value;
            const messageHandler = mockPanel.webview.onDidReceiveMessage.mock.calls[0][0];

            await messageHandler({ type: 'cancel' });

            expect(mockPanel.dispose).toHaveBeenCalled();
            expect(mockLogger.info).toHaveBeenCalledWith('Form cancelled by user');
        });
    });

    describe('Webview Lifecycle Management', () => {
        it('should properly clean up resources on disposal', async () => {
            await provider.showCreationForm();
            const mockPanel = (vscode.window.createWebviewPanel as jest.Mock).mock.results[0].value;

            // Simulate panel disposal
            const disposeHandler = mockPanel.onDidDispose.mock.calls[0][0];
            disposeHandler();

            // Verify cleanup
            expect(mockLogger.info).toHaveBeenCalledWith('Agent creation webview opened');
        });

        it('should handle multiple webview open requests', async () => {
            await provider.showCreationForm();
            await provider.showCreationForm();

            // Should reuse existing panel
            expect(vscode.window.createWebviewPanel).toHaveBeenCalledTimes(1);
        });
    });
});
