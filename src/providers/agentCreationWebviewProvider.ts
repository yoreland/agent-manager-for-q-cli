import * as vscode from 'vscode';
import { ExtensionLogger } from '../services/logger';
import { WebviewMessage, ExtensionMessage, AgentFormData } from '../types/agentCreation';
import { AgentCreationFormService, IAgentCreationFormService } from '../services/agentCreationFormService';

export interface IAgentCreationWebviewProvider {
    showCreationForm(): Promise<void>;
    dispose(): void;
}

export class AgentCreationWebviewProvider implements IAgentCreationWebviewProvider {
    private panel: vscode.WebviewPanel | undefined;
    private disposables: vscode.Disposable[] = [];
    private formService: IAgentCreationFormService;

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
                    this.sendMessage({
                        type: 'initialData',
                        data: defaultData,
                        tools
                    });
                    break;
                
                case 'formDataChanged':
                    this.logger.debug('Form data changed', message.data);
                    // Could be used for auto-save functionality in the future
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
                    this.logger.info('Submitting form data', { agentName: message.data.name });
                    
                    // Validate one more time before creation
                    const finalValidation = this.formService.validateFormData(message.data);
                    if (!finalValidation.isValid) {
                        this.sendMessage({
                            type: 'validationResult',
                            result: finalValidation
                        });
                        return;
                    }
                    
                    const creationResult = await this.formService.createAgentFromFormData(message.data);
                    this.sendMessage({
                        type: 'creationResult',
                        result: creationResult
                    });
                    
                    if (creationResult.success) {
                        this.logger.info('Agent created successfully', { 
                            agentName: message.data.name,
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
        }
        
        input[type="text"]:focus, textarea:focus {
            outline: none;
            border-color: var(--vscode-focusBorder);
            box-shadow: 0 0 0 1px var(--vscode-focusBorder);
        }
        
        textarea {
            min-height: 100px;
            resize: vertical;
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
        
        .tool-column h3 {
            margin-top: 0;
            margin-bottom: 10px;
            font-size: 16px;
            color: var(--vscode-titleBar-activeForeground);
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
                    <input type="text" id="agentName" name="name" required>
                    <div class="error hidden" id="nameError"></div>
                </div>
                
                <div class="form-group">
                    <label for="agentDescription">Description</label>
                    <input type="text" id="agentDescription" name="description">
                    <div class="error hidden" id="descriptionError"></div>
                </div>
                
                <div class="form-group">
                    <label for="agentPrompt">Prompt</label>
                    <textarea id="agentPrompt" name="prompt" placeholder="Enter the system prompt for your agent..."></textarea>
                    <div class="error hidden" id="promptError"></div>
                </div>
            </div>
            
            <!-- Tools Selection Section -->
            <div class="form-section">
                <h2>Tools Selection</h2>
                <p style="margin-bottom: 15px; color: var(--vscode-descriptionForeground);">
                    Select which tools your agent can use. Tools in "Allowed Tools" are pre-approved and don't require user confirmation.
                </p>
                
                <div class="tools-container">
                    <div class="tool-column">
                        <h3>Available Tools</h3>
                        <div id="availableTools"></div>
                    </div>
                    
                    <div class="tool-column">
                        <h3>Allowed Tools</h3>
                        <div id="allowedTools"></div>
                    </div>
                </div>
                <div class="error hidden" id="toolsError"></div>
            </div>
            
            <!-- Resources Section -->
            <div class="form-section">
                <h2>Resources</h2>
                <p style="margin-bottom: 15px; color: var(--vscode-descriptionForeground);">
                    Specify file resources that your agent can access.
                </p>
                
                <div class="resources-list" id="resourcesList"></div>
                
                <div class="add-resource">
                    <input type="text" id="newResource" placeholder="file://path/to/resource">
                    <button type="button" class="btn btn-secondary" onclick="addResource()">Add Resource</button>
                </div>
                <div class="error hidden" id="resourcesError"></div>
            </div>
            
            <div class="form-actions">
                <button type="button" class="btn btn-secondary" onclick="cancelForm()">Cancel</button>
                <button type="submit" class="btn btn-primary">Create Agent</button>
            </div>
        </form>
    </div>
    
    <script>
        const vscode = acquireVsCodeApi();
        let formData = {};
        let availableToolsList = [];
        
        // Notify extension that webview is ready
        vscode.postMessage({ type: 'ready' });
        
        // Handle messages from extension
        window.addEventListener('message', event => {
            const message = event.data;
            
            switch (message.type) {
                case 'initialData':
                    formData = message.data;
                    availableToolsList = message.tools;
                    populateForm();
                    break;
                    
                case 'validationResult':
                    handleValidationResult(message.result);
                    if (pendingSubmit && message.result.isValid) {
                        pendingSubmit = false;
                        vscode.postMessage({ type: 'submitForm', data: formData });
                    }
                    break;
                    
                case 'creationResult':
                    handleCreationResult(message.result);
                    break;
                    
                case 'error':
                    alert('Error: ' + message.message);
                    break;
            }
        });
        
        function populateForm() {
            document.getElementById('agentName').value = formData.name || '';
            document.getElementById('agentDescription').value = formData.description || '';
            document.getElementById('agentPrompt').value = formData.prompt || '';
            
            renderTools();
            renderResources();
        }
        
        function renderTools() {
            const availableContainer = document.getElementById('availableTools');
            const allowedContainer = document.getElementById('allowedTools');
            
            availableContainer.innerHTML = '';
            allowedContainer.innerHTML = '';
            
            availableToolsList.forEach(tool => {
                const availableChecked = formData.tools.available.includes(tool.name);
                const allowedChecked = formData.tools.allowed.includes(tool.name);
                
                // Available tools
                const availableItem = createToolItem(tool, availableChecked, 'available');
                availableContainer.appendChild(availableItem);
                
                // Allowed tools
                const allowedItem = createToolItem(tool, allowedChecked, 'allowed');
                allowedContainer.appendChild(allowedItem);
            });
        }
        
        function createToolItem(tool, checked, type) {
            const item = document.createElement('div');
            item.className = 'tool-item';
            
            item.innerHTML = \`
                <input type="checkbox" id="\${type}_\${tool.name}" 
                       \${checked ? 'checked' : ''} 
                       onchange="toggleTool('\${tool.name}', '\${type}', this.checked)">
                <div class="tool-info">
                    <div class="tool-name">
                        \${tool.displayName}
                        <span class="tool-category category-\${tool.category}">\${tool.category}</span>
                    </div>
                    <div class="tool-description">\${tool.description}</div>
                </div>
            \`;
            
            return item;
        }
        
        function toggleTool(toolName, type, checked) {
            if (type === 'available') {
                if (checked) {
                    if (!formData.tools.available.includes(toolName)) {
                        formData.tools.available.push(toolName);
                    }
                } else {
                    formData.tools.available = formData.tools.available.filter(t => t !== toolName);
                    formData.tools.allowed = formData.tools.allowed.filter(t => t !== toolName);
                    document.getElementById('allowed_' + toolName).checked = false;
                }
            } else if (type === 'allowed') {
                if (checked) {
                    if (!formData.tools.allowed.includes(toolName)) {
                        formData.tools.allowed.push(toolName);
                    }
                    if (!formData.tools.available.includes(toolName)) {
                        formData.tools.available.push(toolName);
                        document.getElementById('available_' + toolName).checked = true;
                    }
                } else {
                    formData.tools.allowed = formData.tools.allowed.filter(t => t !== toolName);
                }
            }
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
                alert('Please enter a resource path');
                return;
            }
            
            if (!path.startsWith('file://')) {
                alert('Resource path must start with "file://"');
                return;
            }
            
            if (formData.resources.includes(path)) {
                alert('This resource is already added');
                return;
            }
            
            formData.resources.push(path);
            input.value = '';
            renderResources();
        }
        
        function removeResource(index) {
            formData.resources.splice(index, 1);
            renderResources();
        }
        
        function handleValidationResult(result) {
            // Clear previous errors
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
                    alert('Error: ' + error.message);
                }
            });
            
            // Show warnings
            result.warnings.forEach(warning => {
                console.warn('Warning:', warning.message);
            });
            
            // Enable/disable submit button
            const submitBtn = document.querySelector('button[type="submit"]');
            if (submitBtn) {
                submitBtn.disabled = !result.isValid;
                submitBtn.style.opacity = result.isValid ? '1' : '0.5';
            }
        }
        
        function handleCreationResult(result) {
            if (result.success) {
                alert('Agent created successfully at: ' + result.agentPath);
            } else {
                alert('Failed to create agent: ' + result.error);
            }
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
            
            // Update form data from inputs
            formData.name = document.getElementById('agentName').value;
            formData.description = document.getElementById('agentDescription').value;
            formData.prompt = document.getElementById('agentPrompt').value;
            
            // Validate first, then submit if valid
            pendingSubmit = true;
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
        
        // Allow Enter key to add resources
        document.getElementById('newResource').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                addResource();
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
