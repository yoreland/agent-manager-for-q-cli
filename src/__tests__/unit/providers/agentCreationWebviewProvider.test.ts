import { AgentCreationWebviewProvider } from '../../providers/agentCreationWebviewProvider';
import { ExtensionLogger } from '../../services/logger';
import { WebviewMessage } from '../../types/agentCreation';
import * as vscode from 'vscode';

// Mock dependencies
jest.mock('vscode');
jest.mock('../../services/agentCreationFormService');

describe('AgentCreationWebviewProvider', () => {
    let provider: AgentCreationWebviewProvider;
    let mockContext: jest.Mocked<vscode.ExtensionContext>;
    let mockLogger: jest.Mocked<ExtensionLogger>;
    let mockPanel: jest.Mocked<vscode.WebviewPanel>;
    let mockWebview: jest.Mocked<vscode.Webview>;

    beforeEach(() => {
        mockContext = {
            extensionUri: { fsPath: '/test/extension' }
        } as any;

        mockLogger = {
            info: jest.fn(),
            error: jest.fn(),
            debug: jest.fn(),
            warn: jest.fn()
        } as any;

        mockWebview = {
            html: '',
            postMessage: jest.fn(),
            onDidReceiveMessage: jest.fn()
        } as any;

        mockPanel = {
            webview: mockWebview,
            reveal: jest.fn(),
            dispose: jest.fn(),
            onDidDispose: jest.fn()
        } as any;

        (vscode.window.createWebviewPanel as jest.Mock).mockReturnValue(mockPanel);
        (vscode.Uri.joinPath as jest.Mock).mockReturnValue({ fsPath: '/test/media' });

        provider = new AgentCreationWebviewProvider(mockContext, mockLogger);
    });

    afterEach(() => {
        provider.dispose();
        jest.clearAllMocks();
    });

    describe('showCreationForm', () => {
        it('should create webview panel with correct configuration', async () => {
            await provider.showCreationForm();

            expect(vscode.window.createWebviewPanel).toHaveBeenCalledWith(
                'agentCreation',
                'Create New Agent',
                vscode.ViewColumn.One,
                {
                    enableScripts: true,
                    retainContextWhenHidden: true,
                    localResourceRoots: [{ fsPath: '/test/media' }]
                }
            );
        });

        it('should reveal existing panel if already open', async () => {
            await provider.showCreationForm();
            await provider.showCreationForm();

            expect(mockPanel.reveal).toHaveBeenCalled();
            expect(vscode.window.createWebviewPanel).toHaveBeenCalledTimes(1);
        });

        it('should set webview HTML content', async () => {
            await provider.showCreationForm();

            expect(mockWebview.html).toContain('Create New Agent');
            expect(mockWebview.html).toContain('agentForm');
            expect(mockWebview.html).toContain('vscode.postMessage');
        });

        it('should register message handler', async () => {
            await provider.showCreationForm();

            expect(mockWebview.onDidReceiveMessage).toHaveBeenCalled();
        });

        it('should register disposal handler', async () => {
            await provider.showCreationForm();

            expect(mockPanel.onDidDispose).toHaveBeenCalled();
        });
    });

    describe('message handling', () => {
        beforeEach(async () => {
            await provider.showCreationForm();
        });

        it('should handle ready message', async () => {
            const messageHandler = (mockWebview.onDidReceiveMessage as jest.Mock).mock.calls[0][0];
            const readyMessage: WebviewMessage = { type: 'ready' };

            await messageHandler(readyMessage);

            expect(mockLogger.info).toHaveBeenCalledWith('Webview ready, sending initial data');
            expect(mockWebview.postMessage).toHaveBeenCalled();
        });

        it('should handle cancel message', async () => {
            const messageHandler = (mockWebview.onDidReceiveMessage as jest.Mock).mock.calls[0][0];
            const cancelMessage: WebviewMessage = { type: 'cancel' };

            await messageHandler(cancelMessage);

            expect(mockLogger.info).toHaveBeenCalledWith('Form cancelled by user');
            expect(mockPanel.dispose).toHaveBeenCalled();
        });

        it('should handle validateForm message', async () => {
            const messageHandler = (mockWebview.onDidReceiveMessage as jest.Mock).mock.calls[0][0];
            const validateMessage: WebviewMessage = {
                type: 'validateForm',
                data: {
                    name: 'test-agent',
                    description: '',
                    prompt: '',
                    tools: { available: [], allowed: [] },
                    resources: []
                }
            };

            await messageHandler(validateMessage);

            expect(mockLogger.info).toHaveBeenCalledWith('Validating form data');
            expect(mockWebview.postMessage).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: 'validationResult'
                })
            );
        });

        it('should handle submitForm message', async () => {
            const messageHandler = (mockWebview.onDidReceiveMessage as jest.Mock).mock.calls[0][0];
            const submitMessage: WebviewMessage = {
                type: 'submitForm',
                data: {
                    name: 'test-agent',
                    description: 'Test',
                    prompt: 'Test prompt',
                    tools: { available: ['fs_read'], allowed: ['fs_read'] },
                    resources: ['file://test.md']
                }
            };

            await messageHandler(submitMessage);

            expect(mockLogger.info).toHaveBeenCalledWith('Submitting form data', { agentName: 'test-agent' });
            expect(mockWebview.postMessage).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: 'creationResult'
                })
            );
        });

        it('should handle unknown message type', async () => {
            const messageHandler = (mockWebview.onDidReceiveMessage as jest.Mock).mock.calls[0][0];
            const unknownMessage = { type: 'unknown' } as any;

            await messageHandler(unknownMessage);

            expect(mockLogger.warn).toHaveBeenCalledWith('Unknown message type', unknownMessage);
        });

        it('should handle message processing errors', async () => {
            const messageHandler = (mockWebview.onDidReceiveMessage as jest.Mock).mock.calls[0][0];
            
            // Mock form service to throw error
            const mockFormService = (provider as any).formService;
            mockFormService.validateFormData.mockImplementation(() => {
                throw new Error('Test error');
            });

            const validateMessage: WebviewMessage = {
                type: 'validateForm',
                data: {
                    name: 'test-agent',
                    description: '',
                    prompt: '',
                    tools: { available: [], allowed: [] },
                    resources: []
                }
            };

            await messageHandler(validateMessage);

            expect(mockLogger.error).toHaveBeenCalledWith('Error handling webview message', expect.any(Error));
            expect(mockWebview.postMessage).toHaveBeenCalledWith({
                type: 'error',
                message: 'Test error'
            });
        });
    });

    describe('disposal', () => {
        it('should dispose panel and clean up resources', async () => {
            await provider.showCreationForm();
            
            provider.dispose();

            expect(mockPanel.dispose).toHaveBeenCalled();
        });

        it('should handle disposal when panel is already disposed', () => {
            provider.dispose();
            provider.dispose(); // Should not throw

            expect(mockPanel.dispose).not.toHaveBeenCalled();
        });
    });
});
