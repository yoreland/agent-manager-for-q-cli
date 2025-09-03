import * as vscode from 'vscode';
import { WebviewMessage, ExtensionMessage, AgentFormData, ToolSection } from '../types/agentCreation';
import { AgentLocation } from '../types/agent';
import { EnhancedAgentCreationFormService } from '../services/EnhancedAgentCreationFormService';
import { ToolCategoryManager } from '../services/ToolCategoryManager';
import { ILogger } from '../shared/infrastructure/ILogger';

export class EnhancedAgentCreationWebviewProvider {
    private panel: vscode.WebviewPanel | undefined;
    private disposables: vscode.Disposable[] = [];

    constructor(
        private readonly context: vscode.ExtensionContext,
        private readonly formService: EnhancedAgentCreationFormService,
        private readonly toolCategoryManager: ToolCategoryManager,
        private readonly logger: ILogger
    ) {}

    async showCreationForm(): Promise<void> {
        if (this.panel) {
            this.panel.reveal();
            return;
        }

        this.panel = vscode.window.createWebviewPanel(
            'enhancedAgentCreation',
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
        
        this.panel.onDidDispose(() => {
            this.panel = undefined;
            this.dispose();
        }, null, this.disposables);

        this.panel.webview.onDidReceiveMessage(
            this.handleWebviewMessage.bind(this),
            undefined,
            this.disposables
        );

        // Send initial data
        await this.sendInitialData();
    }

    private async sendInitialData(): Promise<void> {
        const defaultFormData = this.formService.getDefaultFormData();
        const toolSections = this.formService.getToolSections();

        const message: ExtensionMessage = {
            type: 'initialData',
            data: defaultFormData,
            tools: [], // Legacy compatibility
            toolSections
        };

        await this.panel?.webview.postMessage(message);
    }

    private async handleWebviewMessage(message: WebviewMessage): Promise<void> {
        try {
            switch (message.type) {
                case 'ready':
                    await this.sendInitialData();
                    break;

                case 'locationChanged':
                    await this.handleLocationChange(message.location);
                    break;

                case 'requestExperimentalToolInfo':
                    await this.handleExperimentalToolInfoRequest(message.toolName);
                    break;

                case 'validateForm':
                    await this.handleFormValidation(message.data);
                    break;

                case 'submitForm':
                    await this.handleFormSubmission(message.data);
                    break;

                case 'cancel':
                    this.panel?.dispose();
                    break;
            }
        } catch (error) {
            this.logger.error('Error handling webview message', error);
            await this.sendErrorMessage('An error occurred while processing your request.');
        }
    }

    private async handleLocationChange(location: AgentLocation): Promise<void> {
        const validation = await this.formService.validateLocation(location);
        
        const message: ExtensionMessage = {
            type: 'locationValidation',
            isValid: validation.isValid,
            message: validation.message
        };

        await this.panel?.webview.postMessage(message);
    }

    private async handleExperimentalToolInfoRequest(toolName: string): Promise<void> {
        const toolInfo = this.formService.getExperimentalToolInfo(toolName);
        
        const message: ExtensionMessage = {
            type: 'experimentalToolInfo',
            tool: toolInfo
        };

        await this.panel?.webview.postMessage(message);
    }

    private async handleFormValidation(data: AgentFormData): Promise<void> {
        const result = await this.formService.validateFormData(data);
        
        const message: ExtensionMessage = {
            type: 'validationResult',
            result
        };

        await this.panel?.webview.postMessage(message);
    }

    private async handleFormSubmission(data: AgentFormData): Promise<void> {
        const result = await this.formService.createAgentFromFormData(data);
        
        const message: ExtensionMessage = {
            type: 'creationResult',
            result
        };

        await this.panel?.webview.postMessage(message);

        if (result.success) {
            this.panel?.dispose();
        }
    }

    private async sendErrorMessage(errorMessage: string): Promise<void> {
        const message: ExtensionMessage = {
            type: 'error',
            message: errorMessage
        };

        await this.panel?.webview.postMessage(message);
    }

    private getWebviewContent(): string {
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Create New Agent</title>
    <style>
        ${this.getWebviewStyles()}
    </style>
</head>
<body>
    <div class="container">
        <h1>Create New Agent</h1>
        
        <form id="agentForm">
            <!-- Basic Information -->
            <div class="form-section">
                <h2>Basic Information</h2>
                <div class="form-group">
                    <label for="name">Agent Name *</label>
                    <input type="text" id="name" name="name" required>
                    <div class="validation-message" id="name-validation"></div>
                </div>
                
                <div class="form-group">
                    <label for="description">Description</label>
                    <textarea id="description" name="description" rows="3"></textarea>
                </div>
                
                <div class="form-group">
                    <label for="prompt">Custom Prompt</label>
                    <textarea id="prompt" name="prompt" rows="4" placeholder="Optional: Custom instructions for the agent"></textarea>
                </div>
            </div>

            <!-- Agent Location -->
            <div class="form-section">
                <h2>Agent Location</h2>
                <div class="radio-group">
                    <label class="radio-label">
                        <input type="radio" name="location" value="local" checked>
                        <span class="radio-text">
                            <strong>Local Agent</strong>
                            <small>Available only in this workspace (.amazonq/cli-agents/)</small>
                        </span>
                    </label>
                    <label class="radio-label">
                        <input type="radio" name="location" value="global">
                        <span class="radio-text">
                            <strong>Global Agent</strong>
                            <small>Available across all workspaces (~/.aws/amazonq/cli-agents/)</small>
                        </span>
                    </label>
                </div>
                <div class="validation-message" id="location-validation"></div>
            </div>

            <!-- Tools Selection -->
            <div class="form-section">
                <h2>Tools</h2>
                <div id="tool-sections"></div>
            </div>

            <!-- Resources -->
            <div class="form-section">
                <h2>Resources</h2>
                <div class="form-group">
                    <label>File Resources</label>
                    <div id="resources-list"></div>
                    <button type="button" id="add-resource">Add Resource</button>
                </div>
            </div>

            <!-- Actions -->
            <div class="form-actions">
                <button type="button" id="cancel-btn" class="secondary">Cancel</button>
                <button type="submit" id="create-btn" class="primary">Create Agent</button>
            </div>
        </form>
    </div>

    <script>
        ${this.getWebviewScript()}
    </script>
</body>
</html>`;
    }

    private getWebviewStyles(): string {
        return `
            body {
                font-family: var(--vscode-font-family);
                font-size: var(--vscode-font-size);
                color: var(--vscode-foreground);
                background-color: var(--vscode-editor-background);
                margin: 0;
                padding: 20px;
            }

            .container {
                max-width: 800px;
                margin: 0 auto;
            }

            .form-section {
                margin-bottom: 30px;
                padding: 20px;
                border: 1px solid var(--vscode-panel-border);
                border-radius: 6px;
                background-color: var(--vscode-panel-background);
            }

            .form-section h2 {
                margin-top: 0;
                margin-bottom: 15px;
                color: var(--vscode-foreground);
            }

            .form-group {
                margin-bottom: 15px;
            }

            .form-group label {
                display: block;
                margin-bottom: 5px;
                font-weight: 500;
            }

            .form-group input, .form-group textarea {
                width: 100%;
                padding: 8px 12px;
                border: 1px solid var(--vscode-input-border);
                border-radius: 4px;
                background-color: var(--vscode-input-background);
                color: var(--vscode-input-foreground);
                font-family: inherit;
                font-size: inherit;
            }

            .radio-group {
                display: flex;
                flex-direction: column;
                gap: 12px;
            }

            .radio-label {
                display: flex;
                align-items: flex-start;
                gap: 10px;
                padding: 12px;
                border: 1px solid var(--vscode-input-border);
                border-radius: 6px;
                cursor: pointer;
                transition: background-color 0.2s;
            }

            .radio-label:hover {
                background-color: var(--vscode-list-hoverBackground);
            }

            .radio-label input[type="radio"] {
                margin: 0;
                width: auto;
            }

            .radio-text {
                display: flex;
                flex-direction: column;
                gap: 4px;
            }

            .radio-text small {
                color: var(--vscode-descriptionForeground);
                font-size: 0.9em;
            }

            .tool-section {
                margin-bottom: 20px;
                padding: 15px;
                border: 1px solid var(--vscode-input-border);
                border-radius: 6px;
            }

            .tool-section.experimental {
                border-color: var(--vscode-problemsWarningIcon-foreground);
                background-color: var(--vscode-inputValidation-warningBackground);
            }

            .tool-section h3 {
                margin: 0 0 10px 0;
                display: flex;
                align-items: center;
                gap: 8px;
            }

            .warning-badge {
                background-color: var(--vscode-problemsWarningIcon-foreground);
                color: var(--vscode-editor-background);
                padding: 2px 6px;
                border-radius: 3px;
                font-size: 0.8em;
                font-weight: bold;
            }

            .experimental-warning {
                background-color: var(--vscode-inputValidation-warningBackground);
                border: 1px solid var(--vscode-problemsWarningIcon-foreground);
                padding: 10px;
                border-radius: 4px;
                margin-bottom: 15px;
                font-size: 0.9em;
            }

            .tool-grid {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
                gap: 10px;
            }

            .tool-item {
                display: flex;
                align-items: flex-start;
                gap: 8px;
                padding: 8px;
                border: 1px solid var(--vscode-input-border);
                border-radius: 4px;
            }

            .tool-item input[type="checkbox"] {
                margin: 0;
                width: auto;
            }

            .tool-info {
                flex: 1;
            }

            .tool-name {
                font-weight: 500;
                margin-bottom: 2px;
            }

            .tool-description {
                font-size: 0.9em;
                color: var(--vscode-descriptionForeground);
            }

            .validation-message {
                margin-top: 5px;
                font-size: 0.9em;
                color: var(--vscode-problemsErrorIcon-foreground);
            }

            .validation-message.warning {
                color: var(--vscode-problemsWarningIcon-foreground);
            }

            .form-actions {
                display: flex;
                justify-content: flex-end;
                gap: 10px;
                margin-top: 30px;
            }

            button {
                padding: 10px 20px;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-family: inherit;
                font-size: inherit;
            }

            button.primary {
                background-color: var(--vscode-button-background);
                color: var(--vscode-button-foreground);
            }

            button.primary:hover {
                background-color: var(--vscode-button-hoverBackground);
            }

            button.secondary {
                background-color: var(--vscode-button-secondaryBackground);
                color: var(--vscode-button-secondaryForeground);
            }

            button.secondary:hover {
                background-color: var(--vscode-button-secondaryHoverBackground);
            }
        `;
    }

    private getWebviewScript(): string {
        return `
            const vscode = acquireVsCodeApi();
            let currentFormData = {};
            let toolSections = [];

            // Initialize
            document.addEventListener('DOMContentLoaded', () => {
                vscode.postMessage({ type: 'ready' });
                setupEventListeners();
            });

            function setupEventListeners() {
                // Location change
                document.querySelectorAll('input[name="location"]').forEach(radio => {
                    radio.addEventListener('change', (e) => {
                        vscode.postMessage({ 
                            type: 'locationChanged', 
                            location: e.target.value 
                        });
                    });
                });

                // Form submission
                document.getElementById('agentForm').addEventListener('submit', (e) => {
                    e.preventDefault();
                    const formData = collectFormData();
                    vscode.postMessage({ type: 'submitForm', data: formData });
                });

                // Cancel
                document.getElementById('cancel-btn').addEventListener('click', () => {
                    vscode.postMessage({ type: 'cancel' });
                });
            }

            function collectFormData() {
                const form = document.getElementById('agentForm');
                const formData = new FormData(form);
                
                return {
                    name: formData.get('name'),
                    description: formData.get('description'),
                    prompt: formData.get('prompt'),
                    location: formData.get('location'),
                    tools: {
                        available: Array.from(document.querySelectorAll('.tool-item input[type="checkbox"]:checked'))
                            .map(cb => cb.value),
                        allowed: Array.from(document.querySelectorAll('.tool-item input[type="checkbox"][data-allowed="true"]:checked'))
                            .map(cb => cb.value),
                        experimental: Array.from(document.querySelectorAll('.tool-section.experimental input[type="checkbox"]:checked'))
                            .map(cb => cb.value)
                    },
                    resources: []
                };
            }

            function renderToolSections(sections) {
                const container = document.getElementById('tool-sections');
                container.innerHTML = '';

                sections.forEach(section => {
                    const sectionDiv = document.createElement('div');
                    sectionDiv.className = 'tool-section' + (section.isExperimental ? ' experimental' : '');
                    
                    let html = '<h3>' + section.title;
                    if (section.isExperimental) {
                        html += ' <span class="warning-badge">⚠️ Experimental</span>';
                    }
                    html += '</h3>';
                    
                    if (section.warningMessage) {
                        html += '<div class="experimental-warning">' + section.warningMessage + '</div>';
                    }
                    
                    html += '<div class="tool-grid">';
                    section.tools.forEach(tool => {
                        html += '<div class="tool-item">';
                        html += '<input type="checkbox" id="tool-' + tool.name + '" value="' + tool.name + '"';
                        if (tool.defaultAllowed) html += ' data-allowed="true"';
                        html += '>';
                        html += '<div class="tool-info">';
                        html += '<div class="tool-name">' + tool.displayName + '</div>';
                        html += '<div class="tool-description">' + tool.description + '</div>';
                        html += '</div></div>';
                    });
                    html += '</div>';
                    
                    sectionDiv.innerHTML = html;
                    container.appendChild(sectionDiv);
                });
            }

            // Handle messages from extension
            window.addEventListener('message', event => {
                const message = event.data;
                
                switch (message.type) {
                    case 'initialData':
                        currentFormData = message.data;
                        toolSections = message.toolSections;
                        renderToolSections(toolSections);
                        break;
                        
                    case 'locationValidation':
                        const validationDiv = document.getElementById('location-validation');
                        if (message.isValid) {
                            validationDiv.textContent = '';
                        } else {
                            validationDiv.textContent = message.message;
                            validationDiv.className = 'validation-message';
                        }
                        break;
                        
                    case 'creationResult':
                        if (message.result.success) {
                            vscode.postMessage({ type: 'cancel' });
                        } else {
                            alert('Error: ' + message.result.error);
                        }
                        break;
                }
            });
        `;
    }

    dispose(): void {
        this.disposables.forEach(d => d.dispose());
        this.disposables = [];
    }
}
