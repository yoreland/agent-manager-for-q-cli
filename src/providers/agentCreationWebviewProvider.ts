import * as vscode from 'vscode';
import { ExtensionLogger } from '../services/logger';
import { WebviewMessage, ExtensionMessage, AgentFormData } from '../types/agentCreation';

export interface IAgentCreationWebviewProvider {
    showCreationForm(): Promise<void>;
    dispose(): void;
}

export class AgentCreationWebviewProvider implements IAgentCreationWebviewProvider {
    private panel: vscode.WebviewPanel | undefined;
    private disposables: vscode.Disposable[] = [];

    constructor(
        private readonly context: vscode.ExtensionContext,
        private readonly logger: ExtensionLogger
    ) {}

    async showCreationForm(): Promise<void> {
        if (this.panel) {
            this.panel.reveal();
            return;
        }

        this.panel = vscode.window.createWebviewPanel(
            'agentCreation',
            'Create New Agent',
            vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
                localResourceRoots: [
                    vscode.Uri.joinPath(this.context.extensionUri, 'media')
                ]
            }
        );

        this.panel.webview.html = this.getWebviewContent();
        
        // Handle webview disposal
        this.panel.onDidDispose(() => {
            this.panel = undefined;
            this.dispose();
        }, null, this.disposables);

        // Handle messages from webview
        this.panel.webview.onDidReceiveMessage(
            (message: WebviewMessage) => this.handleWebviewMessage(message),
            undefined,
            this.disposables
        );

        this.logger.info('Agent creation webview opened');
    }

    private async handleWebviewMessage(message: WebviewMessage): Promise<void> {
        try {
            switch (message.type) {
                case 'ready':
                    this.logger.info('Webview ready, sending initial data');
                    // TODO: Send initial form data
                    break;
                
                case 'formDataChanged':
                    this.logger.debug('Form data changed', message.data);
                    break;
                
                case 'validateForm':
                    this.logger.info('Validating form data');
                    // TODO: Validate form data
                    break;
                
                case 'submitForm':
                    this.logger.info('Submitting form data');
                    // TODO: Create agent
                    break;
                
                case 'cancel':
                    this.logger.info('Form cancelled');
                    this.panel?.dispose();
                    break;
                
                default:
                    this.logger.warn('Unknown message type', message);
            }
        } catch (error) {
            this.logger.error('Error handling webview message', error as Error);
            this.sendMessage({
                type: 'error',
                message: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }

    private sendMessage(message: ExtensionMessage): void {
        if (this.panel) {
            this.panel.webview.postMessage(message);
        }
    }

    private getWebviewContent(): string {
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Create New Agent</title>
    <style>
        body {
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size);
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
            padding: 20px;
            margin: 0;
        }
        .form-container {
            max-width: 600px;
            margin: 0 auto;
        }
        h1 {
            color: var(--vscode-titleBar-activeForeground);
            margin-bottom: 20px;
        }
        .placeholder {
            text-align: center;
            color: var(--vscode-descriptionForeground);
            padding: 40px;
            border: 2px dashed var(--vscode-panel-border);
            border-radius: 8px;
        }
    </style>
</head>
<body>
    <div class="form-container">
        <h1>Create New Agent</h1>
        <div class="placeholder">
            Agent creation form will be implemented here
        </div>
    </div>
    
    <script>
        const vscode = acquireVsCodeApi();
        
        // Notify extension that webview is ready
        vscode.postMessage({ type: 'ready' });
        
        // Handle messages from extension
        window.addEventListener('message', event => {
            const message = event.data;
            console.log('Received message:', message);
        });
    </script>
</body>
</html>`;
    }

    dispose(): void {
        this.disposables.forEach(d => d.dispose());
        this.disposables = [];
        if (this.panel) {
            this.panel.dispose();
            this.panel = undefined;
        }
    }
}
