import * as vscode from 'vscode';
import { ExtensionLogger } from '../services/logger';
import { WebviewMessage, ExtensionMessage, AgentFormData } from '../types/agentCreation';
import { AgentCreationFormService, IAgentCreationFormService } from '../services/agentCreationFormService';
import { AgentLocation } from '../core/agent/AgentLocationService';

export interface IAgentCreationWebviewProvider {
    showCreationForm(): Promise<void>;
    dispose(): void;
}

export class AgentCreationWebviewProvider implements IAgentCreationWebviewProvider {
    private panel: vscode.WebviewPanel | undefined;
    private disposables: vscode.Disposable[] = [];
    private formService: IAgentCreationFormService;
    private selectedLocation: AgentLocation = AgentLocation.Local; // Default to local

    constructor(
        private readonly context: vscode.ExtensionContext,
        private readonly logger: ExtensionLogger
    ) {
        this.formService = new AgentCreationFormService(logger);
    }

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
                    const defaultData = this.formService.getDefaultFormData();
                    const tools = this.formService.getAvailableTools();
                    const toolSections = this.formService.getToolSections();
                    this.sendMessage({
                        type: 'initialData',
                        data: defaultData,
                        tools,
                        toolSections
                    });
                    break;
                
                case 'formDataChanged':
                    this.logger.debug('Form data changed', message.data);
                    // Could be used for auto-save functionality in the future
                    break;
                
                case 'locationChanged':
                    this.logger.debug('Agent location changed', { location: message.location });
                    // Store the selected location for agent creation
                    this.selectedLocation = message.location;
                    break;
                
                case 'validateForm':
                    this.logger.info('Validating form data');
                    const validationResult = this.formService.validateFormData(message.data);
                    this.sendMessage({
                        type: 'validationResult',
                        result: validationResult
                    });
                    break;
                
                case 'submitForm':
                    this.logger.info('Submitting form data', { 
                        agentName: message.data.name, 
                        location: this.selectedLocation 
                    });
                    
                    // Validate one more time before creation
                    const finalValidation = this.formService.validateFormData(message.data);
                    if (!finalValidation.isValid) {
                        this.sendMessage({
                            type: 'validationResult',
                            result: finalValidation
                        });
                        return;
                    }
                    
                    const creationResult = await this.formService.createAgentFromFormData(
                        message.data, 
                        this.selectedLocation
                    );
                    this.sendMessage({
                        type: 'creationResult',
                        result: creationResult
                    });
                    
                    if (creationResult.success) {
                        this.logger.info('Agent created successfully', { 
                            agentName: message.data.name,
                            location: this.selectedLocation,
                            agentPath: creationResult.agentPath 
                        });
                        // Auto-close after successful creation
                        setTimeout(() => {
                            this.panel?.dispose();
                        }, 2000);
                    }
                    break;
                
                case 'addResource':
                    this.logger.debug('Adding resource', { path: message.path });
                    // This is handled in the webview, but we could add server-side validation here
                    break;
                
                case 'removeResource':
                    this.logger.debug('Removing resource', { index: message.index });
                    // This is handled in the webview, but we could add server-side validation here
                    break;
                
                case 'openAgentFile':
                    this.logger.info('Opening agent file', { path: message.path });
                    try {
                        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
                        if (workspaceFolder) {
                            const fullPath = vscode.Uri.joinPath(workspaceFolder.uri, message.path);
                            await vscode.window.showTextDocument(fullPath);
                        }
                    } catch (error) {
                        this.logger.error('Failed to open agent file', error as Error);
                        this.sendMessage({
                            type: 'error',
                            message: 'Failed to open agent file'
                        });
                    }
                    break;
                
                case 'cancel':
                    this.logger.info('Form cancelled by user');
                    this.panel?.dispose();
                    break;
                
                default:
                    this.logger.warn('Unknown message type', message);
            }
        } catch (error) {
            this.logger.error('Error handling webview message', error as Error);
            this.sendMessage({
                type: 'error',
                message: error instanceof Error ? error.message : 'Unknown error occurred'
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
            line-height: 1.5;
        }
        
        .form-container {
            max-width: 800px;
            margin: 0 auto;
            position: relative;
        }
        
        .loading-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background-color: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
        }
        
        .loading-spinner {
            width: 40px;
            height: 40px;
            border: 4px solid var(--vscode-panel-border);
            border-top: 4px solid var(--vscode-button-background);
            border-radius: 50%;
            animation: spin 1s linear infinite;
        }
        
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        
        .progress-indicator {
            width: 100%;
            height: 4px;
            background-color: var(--vscode-panel-border);
            border-radius: 2px;
            margin-bottom: 20px;
            overflow: hidden;
        }
        
        .progress-bar {
            height: 100%;
            background-color: var(--vscode-button-background);
            width: 0%;
            transition: width 0.3s ease;
        }
        
        h1 {
            color: var(--vscode-titleBar-activeForeground);
            margin-bottom: 20px;
            font-size: 24px;
        }
        
        .form-section {
            margin-bottom: 30px;
            padding: 20px;
            border: 1px solid var(--vscode-panel-border);
            border-radius: 8px;
            background-color: var(--vscode-panel-background);
        }
        
        .form-section h2 {
            margin-top: 0;
            margin-bottom: 15px;
            color: var(--vscode-titleBar-activeForeground);
            font-size: 18px;
        }
        
        .form-group {
            margin-bottom: 15px;
        }
        
        label {
            display: block;
            margin-bottom: 5px;
            font-weight: 500;
            color: var(--vscode-foreground);
        }
        
        input[type="text"], textarea {
            width: 100%;
            padding: 8px 12px;
            border: 1px solid var(--vscode-input-border);
            border-radius: 4px;
            background-color: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size);
            box-sizing: border-box;
            transition: border-color 0.2s, box-shadow 0.2s;
        }
        
        input[type="text"]:focus, textarea:focus {
            outline: none;
            border-color: var(--vscode-focusBorder);
            box-shadow: 0 0 0 1px var(--vscode-focusBorder);
        }
        
        input[type="text"]::placeholder, textarea::placeholder {
            color: var(--vscode-input-placeholderForeground);
            opacity: 0.7;
        }
        
        .form-group {
            margin-bottom: 15px;
            position: relative;
        }
        
        .form-group .help-text {
            font-size: 12px;
            color: var(--vscode-descriptionForeground);
            margin-top: 4px;
            display: block;
        }
        
        .radio-group {
            display: flex;
            flex-direction: column;
            gap: 12px;
        }
        
        .radio-option {
            border: 1px solid var(--vscode-panel-border);
            border-radius: 6px;
            padding: 0;
            transition: border-color 0.2s, background-color 0.2s;
        }
        
        .radio-option:hover {
            border-color: var(--vscode-focusBorder);
            background-color: var(--vscode-list-hoverBackground);
        }
        
        .radio-label {
            display: flex;
            align-items: flex-start;
            padding: 16px;
            cursor: pointer;
            margin: 0;
            width: 100%;
            box-sizing: border-box;
        }
        
        .radio-label input[type="radio"] {
            margin-right: 12px;
            margin-top: 2px;
            flex-shrink: 0;
        }
        
        .radio-label input[type="radio"]:focus {
            outline: 2px solid var(--vscode-focusBorder);
            outline-offset: 2px;
        }
        
        .radio-text {
            flex: 1;
        }
        
        .radio-text strong {
            display: block;
            margin-bottom: 4px;
            color: var(--vscode-foreground);
        }
        
        .radio-description {
            font-size: 12px;
            color: var(--vscode-descriptionForeground);
            line-height: 1.4;
        }
        
        .radio-description code {
            background-color: var(--vscode-textCodeBlock-background);
            padding: 2px 4px;
            border-radius: 3px;
            font-family: var(--vscode-editor-font-family);
            font-size: 11px;
        }
        
        input[type="checkbox"]:focus {
            outline: 2px solid var(--vscode-focusBorder);
            outline-offset: 2px;
        }
        
        .btn:focus {
            outline: 2px solid var(--vscode-focusBorder);
            outline-offset: 2px;
        }
        
        textarea {
            min-height: 100px;
            resize: vertical;
        }
        
        .tool-section {
            margin-bottom: 25px;
        }
        
        .tool-section-title {
            margin-top: 0;
            margin-bottom: 15px;
            font-size: 18px;
            color: var(--vscode-titleBar-activeForeground);
            display: flex;
            align-items: center;
            gap: 10px;
        }
        
        .tools-container {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
        }
        
        .tool-column {
            border: 1px solid var(--vscode-panel-border);
            border-radius: 4px;
            padding: 15px;
            background-color: var(--vscode-editor-background);
        }
        
        .tool-column h4 {
            margin-top: 0;
            margin-bottom: 10px;
            font-size: 14px;
            color: var(--vscode-titleBar-activeForeground);
            font-weight: 600;
        }
        
        .tool-column h3 {
            margin-top: 0;
            margin-bottom: 10px;
            font-size: 16px;
            color: var(--vscode-titleBar-activeForeground);
        }
        
        /* Experimental Tools Styling */
        .experimental-section {
            border: 2px solid #FF9800;
            border-radius: 8px;
            padding: 20px;
            background-color: rgba(255, 152, 0, 0.05);
            margin-top: 20px;
        }
        
        .experimental-header {
            margin-bottom: 20px;
        }
        
        .warning-badge {
            display: inline-flex;
            align-items: center;
            padding: 4px 8px;
            background-color: #FF9800;
            color: white;
            border-radius: 4px;
            font-size: 12px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        
        .experimental-warning {
            background-color: rgba(255, 152, 0, 0.1);
            border: 1px solid #FF9800;
            border-radius: 6px;
            padding: 15px;
            margin-top: 10px;
        }
        
        .experimental-warning p {
            margin: 0 0 10px 0;
            color: var(--vscode-foreground);
            font-size: 14px;
        }
        
        .experimental-details {
            margin-top: 10px;
        }
        
        .experimental-details summary {
            cursor: pointer;
            color: var(--vscode-textLink-foreground);
            font-weight: 500;
            padding: 5px 0;
        }
        
        .experimental-details summary:hover {
            color: var(--vscode-textLink-activeForeground);
        }
        
        .experimental-details ul {
            margin: 10px 0 0 20px;
            padding: 0;
        }
        
        .experimental-details li {
            margin-bottom: 5px;
            color: var(--vscode-descriptionForeground);
            font-size: 13px;
        }
        
        .experimental-details li strong {
            color: var(--vscode-foreground);
        }
        
        .experimental-section .tool-column {
            border-color: #FF9800;
            background-color: rgba(255, 152, 0, 0.02);
        }
        
        .experimental-tool-item {
            position: relative;
            border-left: 3px solid #FF9800;
            background-color: rgba(255, 152, 0, 0.05);
        }
        
        .experimental-indicator {
            font-size: 12px;
            margin-right: 5px;
            opacity: 0.8;
        }
        
        .experimental-tool-item:hover {
            background-color: rgba(255, 152, 0, 0.1);
        }
        
        .tool-item {
            display: flex;
            align-items: flex-start;
            margin-bottom: 10px;
            padding: 8px;
            border-radius: 4px;
            transition: background-color 0.2s;
        }
        
        .tool-item:hover {
            background-color: var(--vscode-list-hoverBackground);
        }
        
        .tool-item input[type="checkbox"] {
            margin-right: 10px;
            margin-top: 2px;
        }
        
        .tool-info {
            flex: 1;
        }
        
        .tool-name {
            font-weight: 500;
            margin-bottom: 2px;
        }
        
        .tool-description {
            font-size: 12px;
            color: var(--vscode-descriptionForeground);
        }
        
        .tool-category {
            display: inline-block;
            padding: 2px 6px;
            border-radius: 3px;
            font-size: 10px;
            font-weight: 500;
            text-transform: uppercase;
            margin-left: 8px;
        }
        
        .category-filesystem { background-color: #4CAF50; color: white; }
        .category-execution { background-color: #FF9800; color: white; }
        .category-aws { background-color: #2196F3; color: white; }
        .category-utility { background-color: #9C27B0; color: white; }
        .category-development { background-color: #607D8B; color: white; }
        
        .resources-list {
            border: 1px solid var(--vscode-panel-border);
            border-radius: 4px;
            max-height: 200px;
            overflow-y: auto;
        }
        
        .resource-item {
            display: flex;
            align-items: center;
            padding: 8px 12px;
            border-bottom: 1px solid var(--vscode-panel-border);
        }
        
        .resource-item:last-child {
            border-bottom: none;
        }
        
        .resource-path {
            flex: 1;
            font-family: var(--vscode-editor-font-family);
            font-size: 13px;
        }
        
        .resource-remove {
            background: none;
            border: none;
            color: var(--vscode-errorForeground);
            cursor: pointer;
            padding: 4px;
            border-radius: 3px;
        }
        
        .resource-remove:hover {
            background-color: var(--vscode-list-hoverBackground);
        }
        
        .add-resource {
            display: flex;
            gap: 10px;
            margin-top: 10px;
        }
        
        .add-resource input {
            flex: 1;
        }
        
        .btn {
            padding: 8px 16px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size);
            transition: background-color 0.2s;
        }
        
        .btn-primary {
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
        }
        
        .btn-primary:hover {
            background-color: var(--vscode-button-hoverBackground);
        }
        
        .btn-secondary {
            background-color: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
        }
        
        .btn-secondary:hover {
            background-color: var(--vscode-button-secondaryHoverBackground);
        }
        
        .form-actions {
            display: flex;
            gap: 10px;
            justify-content: flex-end;
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid var(--vscode-panel-border);
        }
        
        .error {
            color: var(--vscode-errorForeground);
            font-size: 12px;
            margin-top: 5px;
        }
        
        .hidden {
            display: none;
        }
        
        .notification {
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 16px;
            border-radius: 4px;
            color: white;
            font-weight: 500;
            z-index: 1000;
            max-width: 400px;
            word-wrap: break-word;
            animation: slideIn 0.3s ease-out;
        }
        
        .notification-success {
            background-color: #4CAF50;
        }
        
        .notification-error {
            background-color: #f44336;
        }
        
        .notification-warning {
            background-color: #FF9800;
        }
        
        .notification-info {
            background-color: #2196F3;
        }
        
        @keyframes slideIn {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
        
        .post-creation-actions {
            text-align: center;
            padding: 30px;
            border: 2px solid var(--vscode-button-background);
            border-radius: 8px;
            background-color: var(--vscode-panel-background);
            margin-top: 20px;
        }
        
        .success-message h3 {
            color: var(--vscode-button-background);
            margin-bottom: 10px;
            font-size: 20px;
        }
        
        .success-message p {
            color: var(--vscode-descriptionForeground);
            margin-bottom: 20px;
        }
        
        .success-message code {
            background-color: var(--vscode-textCodeBlock-background);
            padding: 2px 6px;
            border-radius: 3px;
            font-family: var(--vscode-editor-font-family);
        }
        
        .action-buttons {
            display: flex;
            gap: 10px;
            justify-content: center;
            flex-wrap: wrap;
        }
        
        .action-buttons .btn {
            min-width: 150px;
        }
    </style>
</head>
<body>
    <div class="form-container">
        <h1>Create New Agent</h1>
        
        <form id="agentForm">
            <!-- Basic Properties Section -->
            <div class="form-section">
                <h2>Basic Properties</h2>
                
                <div class="form-group">
                    <label for="agentName">Agent Name *</label>
                    <input type="text" id="agentName" name="name" required 
                           placeholder="e.g., my-coding-assistant"
                           aria-describedby="nameError nameHelp" aria-invalid="false">
                    <div class="help-text" id="nameHelp">Use letters, numbers, hyphens, and underscores only</div>
                    <div class="error hidden" id="nameError" role="alert" aria-live="polite"></div>
                </div>
                
                <div class="form-group">
                    <label for="agentDescription">Description</label>
                    <input type="text" id="agentDescription" name="description"
                           placeholder="Brief description of what this agent does"
                           aria-describedby="descriptionError descriptionHelp">
                    <div class="help-text" id="descriptionHelp">Optional: Describe the agent's purpose and capabilities</div>
                    <div class="error hidden" id="descriptionError" role="alert" aria-live="polite"></div>
                </div>
                
                <div class="form-group">
                    <label for="agentPrompt">Prompt</label>
                    <textarea id="agentPrompt" name="prompt" 
                              placeholder="You are a helpful assistant that..."
                              aria-describedby="promptError promptHelp"></textarea>
                    <div class="help-text" id="promptHelp">Define the agent's personality, role, and behavior instructions</div>
                    <div class="error hidden" id="promptError" role="alert" aria-live="polite"></div>
                </div>
            </div>
            
            <!-- Agent Location Section -->
            <div class="form-section">
                <h2>Agent Location</h2>
                <p style="margin-bottom: 15px; color: var(--vscode-descriptionForeground);">
                    Choose where to store your agent configuration.
                </p>
                
                <div class="radio-group" role="radiogroup" aria-labelledby="location-heading">
                    <div class="radio-option">
                        <label class="radio-label">
                            <input type="radio" name="location" value="local" id="locationLocal" 
                                   checked onchange="handleLocationChange('local')"
                                   aria-describedby="localLocationHelp">
                            <span class="radio-text">
                                <strong>Local Agent</strong>
                                <div class="radio-description" id="localLocationHelp">
                                    Available only in this workspace. Stored in <code>.amazonq/cli-agents/</code>
                                </div>
                            </span>
                        </label>
                    </div>
                    
                    <div class="radio-option">
                        <label class="radio-label">
                            <input type="radio" name="location" value="global" id="locationGlobal" 
                                   onchange="handleLocationChange('global')"
                                   aria-describedby="globalLocationHelp">
                            <span class="radio-text">
                                <strong>Global Agent</strong>
                                <div class="radio-description" id="globalLocationHelp">
                                    Available across all workspaces. Stored in <code>~/.aws/amazonq/cli-agents/</code>
                                </div>
                            </span>
                        </label>
                    </div>
                </div>
                <div class="error hidden" id="locationError" role="alert" aria-live="polite"></div>
            </div>
            
            <!-- Tools Selection Section -->
            <div class="form-section">
                <h2>Tools Selection</h2>
                <p style="margin-bottom: 15px; color: var(--vscode-descriptionForeground);">
                    Select which tools your agent can use. Tools in "Allowed Tools" are pre-approved and don't require user confirmation.
                </p>
                
                <!-- Standard Tools Section -->
                <div class="tool-section">
                    <h3 class="tool-section-title">Standard Tools</h3>
                    <div class="tools-container" role="group" aria-labelledby="standard-tools-heading">
                        <div class="tool-column">
                            <h4 id="standard-available-tools-heading">Available Tools</h4>
                            <div id="standardAvailableTools" role="group" aria-labelledby="standard-available-tools-heading"></div>
                        </div>
                        
                        <div class="tool-column">
                            <h4 id="standard-allowed-tools-heading">Allowed Tools</h4>
                            <div id="standardAllowedTools" role="group" aria-labelledby="standard-allowed-tools-heading"></div>
                        </div>
                    </div>
                </div>
                
                <!-- Experimental Tools Section -->
                <div class="tool-section experimental-section">
                    <div class="experimental-header">
                        <h3 class="tool-section-title">
                            Experimental Tools
                            <span class="warning-badge" title="These features are in active development">⚠️ Experimental</span>
                        </h3>
                        <div class="experimental-warning">
                            <p><strong>⚠️ Important:</strong> These features are in active development and may change or be removed at any time. Use with caution in production workflows.</p>
                            <details class="experimental-details">
                                <summary>Learn more about experimental features</summary>
                                <ul>
                                    <li><strong>Knowledge:</strong> Persistent context storage with semantic search</li>
                                    <li><strong>Thinking:</strong> Shows AI reasoning process for complex problems</li>
                                    <li><strong>TODO List:</strong> Task management and progress tracking</li>
                                </ul>
                            </details>
                        </div>
                    </div>
                    
                    <div class="tools-container" role="group" aria-labelledby="experimental-tools-heading">
                        <div class="tool-column">
                            <h4 id="experimental-available-tools-heading">Available Tools</h4>
                            <div id="experimentalAvailableTools" role="group" aria-labelledby="experimental-available-tools-heading"></div>
                        </div>
                        
                        <div class="tool-column">
                            <h4 id="experimental-allowed-tools-heading">Allowed Tools</h4>
                            <div id="experimentalAllowedTools" role="group" aria-labelledby="experimental-allowed-tools-heading"></div>
                        </div>
                    </div>
                </div>
                
                <div class="error hidden" id="toolsError" role="alert" aria-live="polite"></div>
            </div>
            
            <!-- Resources Section -->
            <div class="form-section">
                <h2>Resources</h2>
                <p style="margin-bottom: 15px; color: var(--vscode-descriptionForeground);">
                    Specify file resources that your agent can access.
                </p>
                
                <div class="resources-list" id="resourcesList"></div>
                
                <div class="add-resource">
                    <input type="text" id="newResource" placeholder="file://path/to/resource" 
                           title="Enter a file path starting with file://">
                    <button type="button" class="btn btn-secondary" onclick="addResource()" 
                            title="Add this resource to the agent">Add Resource</button>
                </div>
                <div class="help-text">Resources define which files and directories the agent can access</div>
                <div class="error hidden" id="resourcesError" role="alert" aria-live="polite"></div>
            </div>
            
            <div class="form-actions">
                <button type="button" class="btn btn-secondary" onclick="cancelForm()" title="Cancel (Esc)">Cancel</button>
                <button type="submit" class="btn btn-primary" title="Create Agent (Ctrl+Enter)">Create Agent</button>
            </div>
        </form>
    </div>
    
    <script>
        const vscode = acquireVsCodeApi();
        let formData = {};
        let availableToolsList = [];
        let toolSections = [];
        let formState = {
            isSubmitting: false,
            hasUnsavedChanges: false,
            lastValidation: null
        };
        
        // Notify extension that webview is ready
        vscode.postMessage({ type: 'ready' });
        
        // Handle messages from extension
        window.addEventListener('message', event => {
            const message = event.data;
            
            switch (message.type) {
                case 'initialData':
                    formData = message.data;
                    availableToolsList = message.tools;
                    toolSections = message.toolSections || [];
                    populateForm();
                    formState.hasUnsavedChanges = false;
                    updateProgressIndicator(100);
                    break;
                    
                case 'validationResult':
                    formState.lastValidation = message.result;
                    handleValidationResult(message.result);
                    if (pendingSubmit && message.result.isValid) {
                        pendingSubmit = false;
                        updateProgressIndicator(50);
                        submitForm();
                    }
                    break;
                    
                case 'creationResult':
                    formState.isSubmitting = false;
                    showLoadingState(false);
                    updateProgressIndicator(100);
                    handleCreationResult(message.result);
                    break;
                    
                case 'error':
                    formState.isSubmitting = false;
                    showLoadingState(false);
                    showNotification('Error: ' + message.message, 'error');
                    break;
            }
        });
        
        function populateForm() {
            document.getElementById('agentName').value = formData.name || '';
            document.getElementById('agentDescription').value = formData.description || '';
            document.getElementById('agentPrompt').value = formData.prompt || '';
            
            // Set location radio buttons
            const locationLocal = document.getElementById('locationLocal');
            const locationGlobal = document.getElementById('locationGlobal');
            if (formData.location === 'global') {
                locationGlobal.checked = true;
                locationLocal.checked = false;
            } else {
                locationLocal.checked = true;
                locationGlobal.checked = false;
            }
            
            renderTools();
            renderResources();
            updateFormState();
        }
        
        function updateFormState() {
            // Update form state indicators
            const hasChanges = formState.hasUnsavedChanges;
            const isValid = formState.lastValidation?.isValid ?? true;
            
            // Update submit button state
            const submitBtn = document.querySelector('button[type="submit"]');
            if (submitBtn) {
                submitBtn.disabled = formState.isSubmitting || !isValid;
                submitBtn.textContent = formState.isSubmitting ? 'Creating...' : 'Create Agent';
                submitBtn.style.opacity = (formState.isSubmitting || !isValid) ? '0.5' : '1';
                submitBtn.style.cursor = (formState.isSubmitting || !isValid) ? 'not-allowed' : 'pointer';
            }
        }
        
        function markFormChanged() {
            formState.hasUnsavedChanges = true;
            updateFormState();
            
            // Debounced validation
            clearTimeout(window.validationTimeout);
            window.validationTimeout = setTimeout(() => {
                if (formData.name.trim()) {
                    validateForm();
                }
            }, 500);
        }
        
        function validateForm() {
            // Update form data from inputs
            updateFormDataFromInputs();
            vscode.postMessage({ type: 'validateForm', data: formData });
        }
        
        function updateFormDataFromInputs() {
            formData.name = document.getElementById('agentName').value;
            formData.description = document.getElementById('agentDescription').value;
            formData.prompt = document.getElementById('agentPrompt').value;
            
            // Update location from radio buttons
            const locationRadios = document.getElementsByName('location');
            for (const radio of locationRadios) {
                if (radio.checked) {
                    formData.location = radio.value;
                    break;
                }
            }
        }
        
        function renderTools() {
            // Render standard tools
            const standardAvailableContainer = document.getElementById('standardAvailableTools');
            const standardAllowedContainer = document.getElementById('standardAllowedTools');
            
            // Render experimental tools
            const experimentalAvailableContainer = document.getElementById('experimentalAvailableTools');
            const experimentalAllowedContainer = document.getElementById('experimentalAllowedTools');
            
            // Clear all containers
            if (standardAvailableContainer) standardAvailableContainer.innerHTML = '';
            if (standardAllowedContainer) standardAllowedContainer.innerHTML = '';
            if (experimentalAvailableContainer) experimentalAvailableContainer.innerHTML = '';
            if (experimentalAllowedContainer) experimentalAllowedContainer.innerHTML = '';
            
            // Use tool sections if available, otherwise fall back to legacy method
            if (toolSections && toolSections.length > 0) {
                toolSections.forEach(section => {
                    const isExperimental = section.isExperimental;
                    const availableContainer = isExperimental ? experimentalAvailableContainer : standardAvailableContainer;
                    const allowedContainer = isExperimental ? experimentalAllowedContainer : standardAllowedContainer;
                    
                    if (availableContainer && allowedContainer) {
                        section.tools.forEach(tool => {
                            const availableChecked = formData.tools.available.includes(tool.name);
                            const allowedChecked = formData.tools.allowed.includes(tool.name);
                            
                            // Available tools
                            const availableItem = createToolItem(tool, availableChecked, 'available', isExperimental);
                            availableContainer.appendChild(availableItem);
                            
                            // Allowed tools
                            const allowedItem = createToolItem(tool, allowedChecked, 'allowed', isExperimental);
                            allowedContainer.appendChild(allowedItem);
                        });
                    }
                });
            } else {
                // Legacy fallback - render all tools in standard section
                availableToolsList.forEach(tool => {
                    const availableChecked = formData.tools.available.includes(tool.name);
                    const allowedChecked = formData.tools.allowed.includes(tool.name);
                    const isExperimental = tool.isExperimental || false;
                    
                    const availableContainer = isExperimental ? experimentalAvailableContainer : standardAvailableContainer;
                    const allowedContainer = isExperimental ? experimentalAllowedContainer : standardAllowedContainer;
                    
                    if (availableContainer && allowedContainer) {
                        // Available tools
                        const availableItem = createToolItem(tool, availableChecked, 'available', isExperimental);
                        availableContainer.appendChild(availableItem);
                        
                        // Allowed tools
                        const allowedItem = createToolItem(tool, allowedChecked, 'allowed', isExperimental);
                        allowedContainer.appendChild(allowedItem);
                    }
                });
            }
        }
        
        function createToolItem(tool, checked, type, isExperimental = false) {
            const item = document.createElement('div');
            item.className = isExperimental ? 'tool-item experimental-tool-item' : 'tool-item';
            
            const experimentalWarning = isExperimental ? 
                \`<span class="experimental-indicator" title="Experimental feature">⚠️</span>\` : '';
            
            item.innerHTML = \`
                <input type="checkbox" id="\${type}_\${tool.name}" 
                       \${checked ? 'checked' : ''} 
                       onchange="toggleTool('\${tool.name}', '\${type}', this.checked, \${isExperimental})"
                       aria-describedby="\${type}_\${tool.name}_desc">
                <div class="tool-info">
                    <div class="tool-name">
                        \${experimentalWarning}
                        \${tool.displayName}
                        <span class="tool-category category-\${tool.category}">\${tool.category}</span>
                    </div>
                    <div class="tool-description" id="\${type}_\${tool.name}_desc">\${tool.description}</div>
                </div>
            \`;
            
            return item;
        }
        
        function handleLocationChange(location) {
            // Update form data
            formData.location = location;
            
            // Mark form as changed
            markFormChanged();
            
            // Send location change message to extension
            vscode.postMessage({ 
                type: 'locationChanged', 
                location: location 
            });
            
            // Clear any previous location errors
            const locationError = document.getElementById('locationError');
            if (locationError) {
                locationError.textContent = '';
                locationError.classList.add('hidden');
            }
        }
        
        function toggleTool(toolName, type, checked, isExperimental = false) {
            // Show confirmation dialog for experimental tools
            if (isExperimental && checked) {
                const confirmed = showExperimentalToolConfirmation(toolName);
                if (!confirmed) {
                    // Revert the checkbox state
                    document.getElementById(type + '_' + toolName).checked = false;
                    return;
                }
            }
            
            if (type === 'available') {
                if (checked) {
                    if (!formData.tools.available.includes(toolName)) {
                        formData.tools.available.push(toolName);
                    }
                    // Track experimental tools separately
                    if (isExperimental && !formData.tools.experimental.includes(toolName)) {
                        formData.tools.experimental.push(toolName);
                    }
                } else {
                    formData.tools.available = formData.tools.available.filter(t => t !== toolName);
                    formData.tools.allowed = formData.tools.allowed.filter(t => t !== toolName);
                    formData.tools.experimental = formData.tools.experimental.filter(t => t !== toolName);
                    const allowedCheckbox = document.getElementById('allowed_' + toolName);
                    if (allowedCheckbox) allowedCheckbox.checked = false;
                }
            } else if (type === 'allowed') {
                if (checked) {
                    if (!formData.tools.allowed.includes(toolName)) {
                        formData.tools.allowed.push(toolName);
                    }
                    if (!formData.tools.available.includes(toolName)) {
                        formData.tools.available.push(toolName);
                        const availableCheckbox = document.getElementById('available_' + toolName);
                        if (availableCheckbox) availableCheckbox.checked = true;
                    }
                    // Track experimental tools separately
                    if (isExperimental && !formData.tools.experimental.includes(toolName)) {
                        formData.tools.experimental.push(toolName);
                    }
                } else {
                    formData.tools.allowed = formData.tools.allowed.filter(t => t !== toolName);
                }
            }
            markFormChanged();
        }
        
        function showExperimentalToolConfirmation(toolName) {
            const toolInfo = getExperimentalToolInfo(toolName);
            const message = toolInfo ? 
                \`Are you sure you want to enable the experimental tool "\${toolInfo.displayName}"?\\n\\n\${toolInfo.description}\\n\\nWarning: \${toolInfo.stabilityNote || 'This feature is in active development and may change.'}\` :
                \`Are you sure you want to enable the experimental tool "\${toolName}"?\\n\\nThis feature is in active development and may change or be removed at any time.\`;
            
            return confirm(message);
        }
        
        function getExperimentalToolInfo(toolName) {
            // Find tool info from available tools list
            return availableToolsList.find(tool => tool.name === toolName && tool.isExperimental);
        }
        
        function renderResources() {
            const container = document.getElementById('resourcesList');
            container.innerHTML = '';
            
            formData.resources.forEach((resource, index) => {
                const item = document.createElement('div');
                item.className = 'resource-item';
                item.innerHTML = \`
                    <span class="resource-path">\${resource}</span>
                    <button type="button" class="resource-remove" onclick="removeResource(\${index})">×</button>
                \`;
                container.appendChild(item);
            });
        }
        
        function addResource() {
            const input = document.getElementById('newResource');
            const path = input.value.trim();
            
            if (!path) {
                showNotification('Please enter a resource path', 'warning');
                return;
            }
            
            if (!path.startsWith('file://')) {
                showNotification('Resource path must start with "file://"', 'error');
                return;
            }
            
            if (formData.resources.includes(path)) {
                showNotification('This resource is already added', 'warning');
                return;
            }
            
            formData.resources.push(path);
            input.value = '';
            renderResources();
            markFormChanged();
        }
        
        function removeResource(index) {
            formData.resources.splice(index, 1);
            renderResources();
            markFormChanged();
        }
        
        function submitForm() {
            if (formState.isSubmitting) return;
            
            formState.isSubmitting = true;
            updateFormState();
            showLoadingState(true);
            vscode.postMessage({ type: 'submitForm', data: formData });
        }
        
        function showLoadingState(show) {
            let overlay = document.querySelector('.loading-overlay');
            if (show && !overlay) {
                overlay = document.createElement('div');
                overlay.className = 'loading-overlay';
                overlay.innerHTML = '<div class="loading-spinner"></div>';
                document.body.appendChild(overlay);
            } else if (!show && overlay) {
                overlay.remove();
            }
        }
        
        function updateProgressIndicator(progress) {
            let indicator = document.querySelector('.progress-indicator');
            if (!indicator) {
                indicator = document.createElement('div');
                indicator.className = 'progress-indicator';
                indicator.innerHTML = '<div class="progress-bar"></div>';
                document.querySelector('.form-container').insertBefore(indicator, document.querySelector('h1').nextSibling);
            }
            
            const bar = indicator.querySelector('.progress-bar');
            bar.style.width = progress + '%';
            
            if (progress >= 100) {
                setTimeout(() => {
                    indicator.remove();
                }, 500);
            }
        }
        
        function handleValidationResult(result) {
            // Clear previous errors and warnings
            document.querySelectorAll('.error').forEach(el => {
                el.classList.add('hidden');
                el.textContent = '';
            });
            
            // Show errors
            result.errors.forEach(error => {
                const errorEl = document.getElementById(error.field + 'Error');
                if (errorEl) {
                    errorEl.textContent = error.message;
                    errorEl.classList.remove('hidden');
                } else {
                    // Show general error for fields without specific error elements
                    console.error('Validation error:', error.message);
                    showNotification('Error: ' + error.message, 'error');
                }
            });
            
            // Show warnings as notifications
            result.warnings.forEach(warning => {
                console.warn('Warning:', warning.message);
                showNotification('Warning: ' + warning.message, 'warning');
            });
            
            // Enable/disable submit button
            const submitBtn = document.querySelector('button[type="submit"]');
            if (submitBtn) {
                submitBtn.disabled = !result.isValid;
                submitBtn.style.opacity = result.isValid ? '1' : '0.5';
                submitBtn.style.cursor = result.isValid ? 'pointer' : 'not-allowed';
            }
            
            // Scroll to first error if any
            if (result.errors.length > 0) {
                const firstErrorField = result.errors[0].field;
                const firstErrorEl = document.getElementById(firstErrorField + 'Error');
                if (firstErrorEl) {
                    firstErrorEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }
        }
        
        function showNotification(message, type = 'info') {
            // Create notification element
            const notification = document.createElement('div');
            notification.className = \`notification notification-\${type}\`;
            notification.textContent = message;
            
            // Add to body
            document.body.appendChild(notification);
            
            // Auto remove after 5 seconds
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 5000);
        }
        
        function handleCreationResult(result) {
            if (result.success) {
                showNotification('Agent created successfully!', 'success');
                
                // Show post-creation actions
                showPostCreationActions(result.agentPath);
                
                // Form will auto-close after 3 seconds unless user interacts
                setTimeout(() => {
                    if (!document.querySelector('.post-creation-actions:hover')) {
                        showNotification('Closing form...', 'info');
                        setTimeout(() => {
                            vscode.postMessage({ type: 'cancel' });
                        }, 1000);
                    }
                }, 3000);
            } else {
                showNotification('Failed to create agent: ' + result.error, 'error');
                // Re-enable form for retry
                const submitBtn = document.querySelector('button[type="submit"]');
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.style.opacity = '1';
                    submitBtn.style.cursor = 'pointer';
                }
            }
        }
        
        function showPostCreationActions(agentPath) {
            const existingActions = document.querySelector('.post-creation-actions');
            if (existingActions) {
                existingActions.remove();
            }
            
            const actionsDiv = document.createElement('div');
            actionsDiv.className = 'post-creation-actions';
            actionsDiv.innerHTML = \`
                <div class="success-message">
                    <h3>🎉 Agent Created Successfully!</h3>
                    <p>Your agent has been saved to: <code>\${agentPath}</code></p>
                </div>
                <div class="action-buttons">
                    <button class="btn btn-primary" onclick="openAgentFile('\${agentPath}')">
                        📝 Open Configuration
                    </button>
                    <button class="btn btn-secondary" onclick="createAnotherAgent()">
                        ➕ Create Another Agent
                    </button>
                    <button class="btn btn-secondary" onclick="closeForm()">
                        ✅ Done
                    </button>
                </div>
            \`;
            
            // Insert after form
            const form = document.getElementById('agentForm');
            form.style.display = 'none';
            form.parentNode.insertBefore(actionsDiv, form.nextSibling);
        }
        
        function openAgentFile(agentPath) {
            vscode.postMessage({ type: 'openAgentFile', path: agentPath });
        }
        
        function createAnotherAgent() {
            // Reset form and show it again
            const form = document.getElementById('agentForm');
            const actions = document.querySelector('.post-creation-actions');
            
            if (actions) actions.remove();
            form.style.display = 'block';
            
            // Reset form data
            formData = {
                name: '',
                description: '',
                prompt: '',
                tools: {
                    available: availableToolsList.map(tool => tool.name),
                    allowed: availableToolsList.filter(tool => tool.defaultAllowed).map(tool => tool.name)
                },
                resources: [
                    'file://AmazonQ.md',
                    'file://README.md',
                    'file://.amazonq/rules/**/*.md'
                ]
            };
            
            populateForm();
            formState.hasUnsavedChanges = false;
            formState.isSubmitting = false;
            updateFormState();
            
            // Focus on name field
            document.getElementById('agentName').focus();
        }
        
        function closeForm() {
            vscode.postMessage({ type: 'cancel' });
        }
        
        function cancelForm() {
            vscode.postMessage({ type: 'cancel' });
        }
        
        // Form submission
        document.getElementById('agentForm').addEventListener('submit', (e) => {
            e.preventDefault();
            
            // Update form data from inputs
            formData.name = document.getElementById('agentName').value;
            formData.description = document.getElementById('agentDescription').value;
            formData.prompt = document.getElementById('agentPrompt').value;
            
            // Validate first
            vscode.postMessage({ type: 'validateForm', data: formData });
        });
        
        // Real-time validation on name input
        document.getElementById('agentName').addEventListener('input', (e) => {
            const name = e.target.value;
            const nameError = document.getElementById('nameError');
            
            if (!name.trim()) {
                nameError.textContent = 'Agent name is required';
                nameError.classList.remove('hidden');
            } else if (!/^[a-zA-Z0-9_-]+$/.test(name)) {
                nameError.textContent = 'Agent name can only contain letters, numbers, hyphens, and underscores';
                nameError.classList.remove('hidden');
            } else {
                nameError.classList.add('hidden');
            }
        });
        
        // Submit after successful validation
        let pendingSubmit = false;
        
        // Form submission
        document.getElementById('agentForm').addEventListener('submit', (e) => {
            e.preventDefault();
            
            if (formState.isSubmitting) return;
            
            // Update form data from inputs
            updateFormDataFromInputs();
            
            // Validate first, then submit if valid
            pendingSubmit = true;
            vscode.postMessage({ type: 'validateForm', data: formData });
        });
        
        // Real-time validation and change tracking
        ['agentName', 'agentDescription', 'agentPrompt'].forEach(id => {
            const element = document.getElementById(id);
            element.addEventListener('input', markFormChanged);
        });
        
        // Special handling for name field
        document.getElementById('agentName').addEventListener('input', (e) => {
            const name = e.target.value;
            const nameError = document.getElementById('nameError');
            
            if (!name.trim()) {
                nameError.textContent = 'Agent name is required';
                nameError.classList.remove('hidden');
            } else if (!/^[a-zA-Z0-9_-]+$/.test(name)) {
                nameError.textContent = 'Agent name can only contain letters, numbers, hyphens, and underscores';
                nameError.classList.remove('hidden');
            } else {
                nameError.classList.add('hidden');
            }
        });
        
        // Location radio button change listeners
        document.getElementById('locationLocal').addEventListener('change', (e) => {
            if (e.target.checked) {
                handleLocationChange('local');
            }
        });
        
        document.getElementById('locationGlobal').addEventListener('change', (e) => {
            if (e.target.checked) {
                handleLocationChange('global');
            }
        });
        
        // Allow Enter key to add resources
        document.getElementById('newResource').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                addResource();
            }
        });
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            // Ctrl/Cmd + Enter to submit form
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                e.preventDefault();
                const submitBtn = document.querySelector('button[type="submit"]');
                if (submitBtn && !submitBtn.disabled) {
                    document.getElementById('agentForm').dispatchEvent(new Event('submit'));
                }
            }
            
            // Escape to cancel
            if (e.key === 'Escape') {
                e.preventDefault();
                if (document.querySelector('.post-creation-actions')) {
                    closeForm();
                } else {
                    cancelForm();
                }
            }
            
            // Ctrl/Cmd + N for new agent (when in post-creation state)
            if ((e.ctrlKey || e.metaKey) && e.key === 'n' && document.querySelector('.post-creation-actions')) {
                e.preventDefault();
                createAnotherAgent();
            }
            
            // Arrow key navigation for location radio buttons
            if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                const focusedElement = document.activeElement;
                if (focusedElement && focusedElement.name === 'location') {
                    e.preventDefault();
                    const locationRadios = document.getElementsByName('location');
                    const currentIndex = Array.from(locationRadios).indexOf(focusedElement);
                    let nextIndex;
                    
                    if (e.key === 'ArrowUp') {
                        nextIndex = currentIndex > 0 ? currentIndex - 1 : locationRadios.length - 1;
                    } else {
                        nextIndex = currentIndex < locationRadios.length - 1 ? currentIndex + 1 : 0;
                    }
                    
                    locationRadios[nextIndex].focus();
                    locationRadios[nextIndex].checked = true;
                    handleLocationChange(locationRadios[nextIndex].value);
                }
            }
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
