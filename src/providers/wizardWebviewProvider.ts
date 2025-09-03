import * as vscode from 'vscode';
import { ExtensionLogger } from '../services/logger';
import { WizardState, WizardStep, WizardMessage, WizardResponse, ValidationResult } from '../types/wizard';
import { WizardStateService, IWizardStateService } from '../services/wizardStateService';
import { WizardValidationService, IWizardValidationService } from '../services/wizardValidationService';
import { AgentLocation } from '../core/agent/AgentLocationService';

export interface IWizardWebviewProvider {
    showWizard(): Promise<void>;
    dispose(): void;
}

export class WizardWebviewProvider implements IWizardWebviewProvider {
    private panel: vscode.WebviewPanel | undefined;
    private disposables: vscode.Disposable[] = [];
    private stateService: IWizardStateService;
    private validationService: IWizardValidationService;

    constructor(
        private readonly context: vscode.ExtensionContext,
        private readonly logger: ExtensionLogger
    ) {
        this.stateService = new WizardStateService(logger);
        this.validationService = new WizardValidationService(logger);
        
        // Initialize agent config service for validation
        this.initializeServices();
    }

    private async initializeServices(): Promise<void> {
        try {
            // Import and initialize agent config service
            const { AgentConfigService } = await import('../services/agentConfigService');
            const agentConfigService = new AgentConfigService(this.logger);
            this.validationService.setAgentConfigService(agentConfigService);
        } catch (error) {
            this.logger.warn('Failed to initialize agent config service for validation', error as Error);
        }
    }

    async showWizard(): Promise<void> {
        if (this.panel) {
            this.panel.reveal();
            return;
        }

        this.panel = vscode.window.createWebviewPanel(
            'agentWizard',
            'Create New Agent',
            vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
                localResourceRoots: [this.context.extensionUri]
            }
        );

        this.panel.webview.html = this.getWebviewContent();
        
        // Handle messages from webview
        this.panel.webview.onDidReceiveMessage(
            (message: WizardMessage) => this.handleWizardMessage(message),
            undefined,
            this.disposables
        );

        // Handle panel disposal
        this.panel.onDidDispose(() => this.dispose(), null, this.disposables);
    }

    private async handleWizardMessage(message: WizardMessage): Promise<void> {
        try {
            switch (message.type) {
                case 'stepChanged':
                    if (message.step) {
                        await this.changeStep(message.step);
                    }
                    break;
                
                case 'dataUpdated':
                    if (message.data) {
                        await this.updateStepData(message.data);
                    }
                    break;
                
                case 'validationRequested':
                    await this.validateCurrentStep();
                    break;
                
                case 'wizardCompleted':
                    await this.completeWizard();
                    break;
            }
        } catch (error) {
            this.logger.error('Error handling wizard message', error as Error);
        }
    }

    private async changeStep(newStep: WizardStep): Promise<void> {
        const currentState = this.stateService.getState();
        
        // Validate current step before proceeding forward
        if (newStep > currentState.currentStep) {
            const validation = await this.validationService.validateStep(
                currentState.currentStep, 
                currentState.stepData
            );
            
            if (!validation.isValid) {
                this.stateService.setValidation(currentState.currentStep, validation);
                this.sendResponse({
                    type: 'validationResult',
                    validation,
                    canProceed: false
                });
                return;
            }
            
            this.stateService.setValidation(currentState.currentStep, validation);
        }

        // Check if we can proceed to the target step
        if (!this.stateService.canProceedToStep(newStep)) {
            this.sendResponse({
                type: 'navigationUpdate',
                canProceed: false
            });
            return;
        }

        this.stateService.setCurrentStep(newStep);
        this.sendResponse({
            type: 'stateUpdate',
            state: this.stateService.getState()
        });
    }

    private async updateStepData(data: Partial<WizardState['stepData']>): Promise<void> {
        const currentState = this.stateService.getState();
        
        // Update step data based on current step
        switch (currentState.currentStep) {
            case WizardStep.BasicProperties:
                if (data.basicProperties) {
                    this.stateService.updateStepData('basicProperties', data.basicProperties);
                }
                break;
            case WizardStep.AgentLocation:
                if (data.agentLocation) {
                    this.stateService.updateStepData('agentLocation', data.agentLocation);
                }
                break;
            case WizardStep.ToolsSelection:
                if (data.toolsSelection) {
                    this.stateService.updateStepData('toolsSelection', data.toolsSelection);
                }
                break;
            case WizardStep.Resources:
                if (data.resources) {
                    this.stateService.updateStepData('resources', data.resources);
                }
                break;
        }

        // Send updated state
        this.sendResponse({
            type: 'stateUpdate',
            state: this.stateService.getState()
        });
    }

    private async validateCurrentStep(): Promise<void> {
        const currentState = this.stateService.getState();
        const validation = await this.validationService.validateStep(
            currentState.currentStep, 
            currentState.stepData
        );
        
        this.stateService.setValidation(currentState.currentStep, validation);
        
        this.sendResponse({
            type: 'validationResult',
            validation,
            canProceed: validation.isValid
        });
    }

    private async completeWizard(): Promise<void> {
        const finalState = this.stateService.getState();
        
        // Final validation of all steps
        for (let step = WizardStep.BasicProperties; step < WizardStep.Summary; step++) {
            const validation = await this.validationService.validateStep(step, finalState.stepData);
            if (!validation.isValid) {
                this.sendResponse({
                    type: 'validationResult',
                    validation,
                    canProceed: false
                });
                return;
            }
        }

        // TODO: Integrate with existing agent creation service
        this.logger.info('Wizard completed', finalState);
        this.panel?.dispose();
    }

    private sendResponse(response: WizardResponse): void {
        this.panel?.webview.postMessage(response);
    }

    private getWebviewContent(): string {
        return `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Create New Agent</title>
                <style>
                    body { 
                        font-family: var(--vscode-font-family);
                        color: var(--vscode-foreground);
                        background: var(--vscode-editor-background);
                        margin: 0;
                        padding: 20px;
                    }
                    .wizard-container {
                        max-width: 800px;
                        margin: 0 auto;
                    }
                    .progress-bar {
                        display: flex;
                        margin-bottom: 30px;
                    }
                    .step {
                        flex: 1;
                        text-align: center;
                        padding: 10px;
                        border-bottom: 2px solid var(--vscode-input-border);
                        font-size: 12px;
                    }
                    .step.active {
                        border-bottom-color: var(--vscode-focusBorder);
                        color: var(--vscode-focusBorder);
                        font-weight: bold;
                    }
                    .step.completed {
                        border-bottom-color: var(--vscode-charts-green);
                        color: var(--vscode-charts-green);
                    }
                    .step-content {
                        min-height: 400px;
                        padding: 20px 0;
                    }
                    .form-group {
                        margin-bottom: 20px;
                    }
                    .form-label {
                        display: block;
                        margin-bottom: 8px;
                        font-weight: 500;
                        color: var(--vscode-foreground);
                    }
                    .required {
                        color: var(--vscode-errorForeground);
                    }
                    .form-input {
                        width: 100%;
                        padding: 8px 12px;
                        border: 1px solid var(--vscode-input-border);
                        background: var(--vscode-input-background);
                        color: var(--vscode-input-foreground);
                        border-radius: 2px;
                        font-family: var(--vscode-font-family);
                        font-size: 14px;
                        box-sizing: border-box;
                    }
                    .form-input:focus {
                        outline: none;
                        border-color: var(--vscode-focusBorder);
                    }
                    .form-textarea {
                        min-height: 100px;
                        resize: vertical;
                        font-family: var(--vscode-editor-font-family);
                    }
                    .form-textarea.code-style {
                        min-height: 120px;
                        font-family: var(--vscode-editor-font-family);
                        font-size: var(--vscode-editor-font-size);
                        line-height: 1.4;
                    }
                    .form-help {
                        font-size: 12px;
                        color: var(--vscode-descriptionForeground);
                        margin-top: 4px;
                    }
                    .validation-error {
                        color: var(--vscode-errorForeground);
                        font-size: 12px;
                        margin-top: 4px;
                        display: none;
                    }
                    .validation-error.show {
                        display: block;
                    }
                    .validation-warning {
                        color: var(--vscode-notificationsWarningIcon-foreground);
                        font-size: 12px;
                        margin-top: 4px;
                        display: none;
                    }
                    .validation-warning.show {
                        display: block;
                    }
                    .char-counter {
                        font-size: 11px;
                        color: var(--vscode-descriptionForeground);
                        text-align: right;
                        margin-top: 4px;
                    }
                    .navigation {
                        display: flex;
                        justify-content: space-between;
                        margin-top: 30px;
                        padding-top: 20px;
                        border-top: 1px solid var(--vscode-input-border);
                    }
                    button {
                        padding: 10px 20px;
                        border: 1px solid var(--vscode-button-border);
                        background: var(--vscode-button-background);
                        color: var(--vscode-button-foreground);
                        cursor: pointer;
                        border-radius: 2px;
                        font-family: var(--vscode-font-family);
                    }
                    button:hover {
                        background: var(--vscode-button-hoverBackground);
                    }
                    button:disabled {
                        opacity: 0.5;
                        cursor: not-allowed;
                    }
                    .primary {
                        background: var(--vscode-button-background);
                    }
                    .secondary {
                        background: var(--vscode-button-secondaryBackground);
                        color: var(--vscode-button-secondaryForeground);
                    }
                </style>
            </head>
            <body>
                <div class="wizard-container">
                    <div class="progress-bar">
                        <div class="step active" data-step="1">1. Basic Properties</div>
                        <div class="step" data-step="2">2. Location</div>
                        <div class="step" data-step="3">3. Tools</div>
                        <div class="step" data-step="4">4. Resources</div>
                        <div class="step" data-step="5">5. Summary</div>
                    </div>
                    
                    <div class="step-content" id="stepContent">
                        <!-- Step content will be dynamically loaded here -->
                    </div>
                    
                    <div class="navigation">
                        <button id="prevBtn" onclick="previousStep()" disabled class="secondary">Previous</button>
                        <div>
                            <button id="cancelBtn" onclick="cancelWizard()" class="secondary">Cancel</button>
                            <button id="nextBtn" onclick="nextStep()" class="primary">Next</button>
                        </div>
                    </div>
                </div>
                
                <script>
                    const vscode = acquireVsCodeApi();
                    let currentStep = 1;
                    let wizardState = null;
                    let validationTimeout = null;
                    
                    // Initialize wizard
                    window.addEventListener('message', event => {
                        const message = event.data;
                        handleWizardResponse(message);
                    });
                    
                    function handleWizardResponse(response) {
                        switch (response.type) {
                            case 'stateUpdate':
                                wizardState = response.state;
                                updateUI();
                                break;
                            case 'validationResult':
                                handleValidation(response.validation, response.canProceed);
                                break;
                        }
                    }
                    
                    function updateUI() {
                        if (!wizardState) return;
                        
                        currentStep = wizardState.currentStep;
                        updateProgressBar();
                        updateStepContent();
                        updateNavigation();
                    }
                    
                    function updateProgressBar() {
                        document.querySelectorAll('.step').forEach((step, index) => {
                            step.classList.remove('active', 'completed');
                            if (index + 1 === currentStep) {
                                step.classList.add('active');
                            } else if (index + 1 < currentStep) {
                                step.classList.add('completed');
                            }
                        });
                    }
                    
                    function updateStepContent() {
                        const content = document.getElementById('stepContent');
                        switch (currentStep) {
                            case 1:
                                content.innerHTML = getBasicPropertiesHTML();
                                setupBasicPropertiesHandlers();
                                break;
                            case 2:
                                content.innerHTML = getAgentLocationHTML();
                                break;
                            case 3:
                                content.innerHTML = getToolsSelectionHTML();
                                break;
                            case 4:
                                content.innerHTML = getResourcesHTML();
                                break;
                            case 5:
                                content.innerHTML = getSummaryHTML();
                                break;
                        }
                    }
                    
                    function updateNavigation() {
                        document.getElementById('prevBtn').disabled = currentStep === 1;
                        const nextBtn = document.getElementById('nextBtn');
                        if (currentStep === 5) {
                            nextBtn.textContent = 'Create Agent';
                        } else {
                            nextBtn.textContent = 'Next';
                        }
                    }
                    
                    function previousStep() {
                        if (currentStep > 1) {
                            vscode.postMessage({
                                type: 'stepChanged',
                                step: currentStep - 1
                            });
                        }
                    }
                    
                    function nextStep() {
                        if (currentStep < 5) {
                            vscode.postMessage({
                                type: 'stepChanged',
                                step: currentStep + 1
                            });
                        } else {
                            vscode.postMessage({
                                type: 'wizardCompleted'
                            });
                        }
                    }
                    
                    function cancelWizard() {
                        vscode.postMessage({
                            type: 'wizardCancelled'
                        });
                    }
                    
                    function handleValidation(validation, canProceed) {
                        if (currentStep === 1) {
                            displayBasicPropertiesValidation(validation);
                        }
                        
                        // Update next button state
                        document.getElementById('nextBtn').disabled = !canProceed;
                    }
                    
                    // Basic Properties Step Implementation
                    function getBasicPropertiesHTML() {
                        const data = wizardState?.stepData?.basicProperties || { name: '', description: '', prompt: '' };
                        return \`
                            <h2>Basic Properties</h2>
                            <p>Define the basic information for your agent.</p>
                            
                            <div class="form-group">
                                <label class="form-label" for="agentName">
                                    Agent Name <span class="required">*</span>
                                </label>
                                <input 
                                    type="text" 
                                    id="agentName" 
                                    class="form-input" 
                                    value="\${data.name}"
                                    placeholder="Enter a unique name for your agent"
                                    maxlength="50"
                                />
                                <div class="form-help">
                                    Use letters, numbers, hyphens, and underscores only. This will be used as the filename.
                                </div>
                                <div class="validation-error" id="nameError"></div>
                            </div>
                            
                            <div class="form-group">
                                <label class="form-label" for="agentDescription">
                                    Description
                                </label>
                                <textarea 
                                    id="agentDescription" 
                                    class="form-input form-textarea" 
                                    placeholder="Brief description of what this agent does (optional)"
                                    maxlength="500"
                                >\${data.description || ''}</textarea>
                                <div class="char-counter">
                                    <span id="descCounter">\${(data.description || '').length}</span>/500 characters
                                </div>
                                <div class="validation-warning" id="descWarning"></div>
                            </div>
                            
                            <div class="form-group">
                                <label class="form-label" for="agentPrompt">
                                    System Prompt <span class="required">*</span>
                                </label>
                                <textarea 
                                    id="agentPrompt" 
                                    class="form-input form-textarea code-style" 
                                    placeholder="Define the agent's behavior, role, and instructions..."
                                    rows="6"
                                >\${data.prompt}</textarea>
                                <div class="form-help">
                                    This defines how your agent will behave and respond. Be specific about the agent's role and capabilities.
                                </div>
                                <div class="validation-error" id="promptError"></div>
                            </div>
                        \`;
                    }
                    
                    function setupBasicPropertiesHandlers() {
                        const nameInput = document.getElementById('agentName');
                        const descInput = document.getElementById('agentDescription');
                        const promptInput = document.getElementById('agentPrompt');
                        const descCounter = document.getElementById('descCounter');
                        
                        // Real-time validation with debouncing
                        nameInput.addEventListener('input', () => {
                            clearTimeout(validationTimeout);
                            validationTimeout = setTimeout(() => {
                                updateBasicPropertiesData();
                                validateField('name', nameInput.value);
                            }, 300);
                        });
                        
                        descInput.addEventListener('input', () => {
                            descCounter.textContent = descInput.value.length;
                            clearTimeout(validationTimeout);
                            validationTimeout = setTimeout(() => {
                                updateBasicPropertiesData();
                            }, 300);
                        });
                        
                        promptInput.addEventListener('input', () => {
                            clearTimeout(validationTimeout);
                            validationTimeout = setTimeout(() => {
                                updateBasicPropertiesData();
                                validateField('prompt', promptInput.value);
                            }, 300);
                        });
                    }
                    
                    function updateBasicPropertiesData() {
                        const name = document.getElementById('agentName').value;
                        const description = document.getElementById('agentDescription').value;
                        const prompt = document.getElementById('agentPrompt').value;
                        
                        vscode.postMessage({
                            type: 'dataUpdated',
                            data: {
                                basicProperties: { name, description, prompt }
                            }
                        });
                    }
                    
                    function validateField(field, value) {
                        // Client-side validation for immediate feedback
                        if (field === 'name') {
                            const errorEl = document.getElementById('nameError');
                            let error = '';
                            
                            if (!value.trim()) {
                                error = 'Agent name is required';
                            } else if (value.length < 2) {
                                error = 'Agent name must be at least 2 characters';
                            } else if (!/^[a-zA-Z0-9_-]+$/.test(value)) {
                                error = 'Agent name can only contain letters, numbers, hyphens, and underscores';
                            }
                            
                            if (error) {
                                errorEl.textContent = error;
                                errorEl.classList.add('show');
                            } else {
                                errorEl.classList.remove('show');
                            }
                        } else if (field === 'prompt') {
                            const errorEl = document.getElementById('promptError');
                            let error = '';
                            
                            if (!value.trim()) {
                                error = 'System prompt is required';
                            } else if (value.length < 10) {
                                error = 'System prompt must be at least 10 characters';
                            }
                            
                            if (error) {
                                errorEl.textContent = error;
                                errorEl.classList.add('show');
                            } else {
                                errorEl.classList.remove('show');
                            }
                        }
                    }
                    
                    function displayBasicPropertiesValidation(validation) {
                        // Clear all previous errors
                        document.querySelectorAll('.validation-error').forEach(el => el.classList.remove('show'));
                        document.querySelectorAll('.validation-warning').forEach(el => el.classList.remove('show'));
                        
                        // Display errors
                        validation.errors.forEach(error => {
                            if (error.includes('name')) {
                                const errorEl = document.getElementById('nameError');
                                errorEl.textContent = error;
                                errorEl.classList.add('show');
                            } else if (error.includes('prompt') || error.includes('Prompt')) {
                                const errorEl = document.getElementById('promptError');
                                errorEl.textContent = error;
                                errorEl.classList.add('show');
                            }
                        });
                        
                        // Display warnings
                        if (validation.warnings) {
                            validation.warnings.forEach(warning => {
                                if (warning.includes('Description')) {
                                    const warningEl = document.getElementById('descWarning');
                                    warningEl.textContent = warning;
                                    warningEl.classList.add('show');
                                }
                            });
                        }
                    }
                    
                    // Placeholder functions for other steps
                    function getAgentLocationHTML() {
                        return '<h2>Agent Location</h2><p>Local vs Global selection cards will go here.</p>';
                    }
                    
                    function getToolsSelectionHTML() {
                        return '<h2>Tools Selection</h2><p>Standard and Experimental tools tabs will go here.</p>';
                    }
                    
                    function getResourcesHTML() {
                        return '<h2>Resources</h2><p>Drag & drop file selection will go here.</p>';
                    }
                    
                    function getSummaryHTML() {
                        return '<h2>Summary</h2><p>Configuration summary will go here.</p>';
                    }
                    
                    // Initialize
                    updateUI();
                </script>
            </body>
            </html>
        `;
    }

    dispose(): void {
        this.panel?.dispose();
        this.disposables.forEach(d => d.dispose());
        this.disposables = [];
    }
}
