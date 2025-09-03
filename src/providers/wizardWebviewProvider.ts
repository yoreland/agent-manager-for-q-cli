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
                    
                    /* Location Cards Styling */
                    .location-cards {
                        display: grid;
                        grid-template-columns: 1fr 1fr;
                        gap: 20px;
                        margin: 30px 0;
                    }
                    
                    .location-card {
                        border: 2px solid var(--vscode-input-border);
                        border-radius: 8px;
                        padding: 24px;
                        cursor: pointer;
                        transition: all 0.2s ease;
                        background: var(--vscode-input-background);
                        text-align: center;
                        position: relative;
                    }
                    
                    .location-card:hover {
                        border-color: var(--vscode-focusBorder);
                        background: var(--vscode-list-hoverBackground);
                        transform: translateY(-2px);
                        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
                    }
                    
                    .location-card.selected {
                        border-color: var(--vscode-focusBorder);
                        background: var(--vscode-list-activeSelectionBackground);
                        color: var(--vscode-list-activeSelectionForeground);
                    }
                    
                    .location-card.selected::before {
                        content: '✓';
                        position: absolute;
                        top: 12px;
                        right: 12px;
                        width: 20px;
                        height: 20px;
                        background: var(--vscode-focusBorder);
                        color: white;
                        border-radius: 50%;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        font-size: 12px;
                        font-weight: bold;
                    }
                    
                    .card-icon {
                        font-size: 48px;
                        margin-bottom: 16px;
                        line-height: 1;
                    }
                    
                    .card-title {
                        font-size: 18px;
                        font-weight: 600;
                        margin-bottom: 8px;
                        color: var(--vscode-foreground);
                    }
                    
                    .location-card.selected .card-title {
                        color: var(--vscode-list-activeSelectionForeground);
                    }
                    
                    .card-description {
                        font-size: 14px;
                        color: var(--vscode-descriptionForeground);
                        margin-bottom: 16px;
                        font-weight: 500;
                    }
                    
                    .location-card.selected .card-description {
                        color: var(--vscode-list-activeSelectionForeground);
                        opacity: 0.9;
                    }
                    
                    .card-details {
                        font-size: 12px;
                        color: var(--vscode-descriptionForeground);
                        text-align: left;
                        line-height: 1.5;
                        background: var(--vscode-editor-background);
                        padding: 12px;
                        border-radius: 4px;
                        border: 1px solid var(--vscode-input-border);
                    }
                    
                    .location-card.selected .card-details {
                        background: rgba(255, 255, 255, 0.1);
                        border-color: rgba(255, 255, 255, 0.2);
                        color: var(--vscode-list-activeSelectionForeground);
                        opacity: 0.9;
                    }
                    
                    .card-details code {
                        background: var(--vscode-textCodeBlock-background);
                        color: var(--vscode-textPreformat-foreground);
                        padding: 2px 4px;
                        border-radius: 2px;
                        font-family: var(--vscode-editor-font-family);
                        font-size: 11px;
                    }
                    
                    .location-card.selected .card-details code {
                        background: rgba(255, 255, 255, 0.2);
                        color: var(--vscode-list-activeSelectionForeground);
                    }
                    
                    /* Responsive design */
                    @media (max-width: 600px) {
                        .location-cards {
                            grid-template-columns: 1fr;
                            gap: 16px;
                        }
                        
                        .location-card {
                            padding: 20px;
                        }
                        
                        .card-icon {
                            font-size: 40px;
                            margin-bottom: 12px;
                        }
                        
                        .card-title {
                            font-size: 16px;
                        }
                    }
                    
                    /* Navigation Enhancements */
                    .navigation {
                        position: relative;
                    }
                    
                    .step-counter {
                        position: absolute;
                        left: 50%;
                        top: 50%;
                        transform: translate(-50%, -50%);
                        font-size: 12px;
                        color: var(--vscode-descriptionForeground);
                        font-weight: 500;
                    }
                    
                    button.loading {
                        position: relative;
                        color: transparent;
                    }
                    
                    .spinner {
                        position: absolute;
                        top: 50%;
                        left: 50%;
                        transform: translate(-50%, -50%);
                        width: 16px;
                        height: 16px;
                        border: 2px solid transparent;
                        border-top: 2px solid currentColor;
                        border-radius: 50%;
                        animation: spin 1s linear infinite;
                        color: var(--vscode-button-foreground);
                    }
                    
                    @keyframes spin {
                        0% { transform: translate(-50%, -50%) rotate(0deg); }
                        100% { transform: translate(-50%, -50%) rotate(360deg); }
                    }
                    
                    .create-btn {
                        background: var(--vscode-button-background);
                        font-weight: 600;
                    }
                    
                    .create-btn:hover {
                        background: var(--vscode-button-hoverBackground);
                        transform: translateY(-1px);
                    }
                    
                    /* Step Transition Animations */
                    .step-content {
                        transition: opacity 0.3s ease, transform 0.3s ease;
                    }
                    
                    .step-transition-out {
                        opacity: 0;
                        transform: translateX(-20px);
                    }
                    
                    .step-transition-in {
                        opacity: 0;
                        transform: translateX(20px);
                        animation: stepIn 0.3s ease forwards;
                    }
                    
                    @keyframes stepIn {
                        to {
                            opacity: 1;
                            transform: translateX(0);
                        }
                    }
                    
                    /* Error Summary */
                    .error-summary {
                        display: flex;
                        align-items: flex-start;
                        gap: 12px;
                        background: var(--vscode-inputValidation-errorBackground);
                        border: 1px solid var(--vscode-inputValidation-errorBorder);
                        border-radius: 4px;
                        padding: 16px;
                        margin-top: 20px;
                        opacity: 0;
                        transform: translateY(-10px);
                        transition: all 0.3s ease;
                    }
                    
                    .error-summary.show {
                        opacity: 1;
                        transform: translateY(0);
                    }
                    
                    .error-icon {
                        font-size: 20px;
                        flex-shrink: 0;
                    }
                    
                    .error-text {
                        color: var(--vscode-inputValidation-errorForeground);
                        font-size: 14px;
                    }
                    
                    .error-text strong {
                        display: block;
                        margin-bottom: 8px;
                    }
                    
                    .error-text ul {
                        margin: 0;
                        padding-left: 16px;
                    }
                    
                    .error-text li {
                        margin-bottom: 4px;
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
                        
                        const previousStep = currentStep;
                        currentStep = wizardState.currentStep;
                        
                        updateProgressBar();
                        
                        // Add transition animation for step changes
                        if (previousStep !== currentStep) {
                            const content = document.getElementById('stepContent');
                            content.classList.add('step-transition-in');
                            
                            setTimeout(() => {
                                content.classList.remove('step-transition-in', 'step-transition-out');
                            }, 300);
                        }
                        
                        updateStepContent();
                        updateNavigation();
                        
                        // Clear any pending navigation states
                        setNavigationLoading(false);
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
                                setupAgentLocationHandlers();
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
                        const prevBtn = document.getElementById('prevBtn');
                        const nextBtn = document.getElementById('nextBtn');
                        const cancelBtn = document.getElementById('cancelBtn');
                        
                        // Previous button state
                        prevBtn.disabled = currentStep === 1;
                        prevBtn.style.display = currentStep === 1 ? 'none' : 'inline-block';
                        
                        // Next/Create button state and text
                        if (currentStep === 5) {
                            nextBtn.textContent = 'Create Agent';
                            nextBtn.className = 'primary create-btn';
                            nextBtn.setAttribute('aria-label', 'Create the agent with current configuration');
                        } else {
                            nextBtn.textContent = 'Next';
                            nextBtn.className = 'primary';
                            nextBtn.setAttribute('aria-label', \`Proceed to step \${currentStep + 1}\`);
                        }
                        
                        // Update button states based on validation
                        updateNavigationStates();
                        
                        // Update step counter
                        updateStepCounter();
                    }
                    
                    function updateNavigationStates() {
                        const nextBtn = document.getElementById('nextBtn');
                        const currentValidation = wizardState?.validation?.[currentStep];
                        
                        // Check if current step is valid
                        const isCurrentStepValid = currentValidation ? currentValidation.isValid : true;
                        
                        // For step 2 (Agent Location), always allow proceeding as it has a default
                        const canProceed = currentStep === 2 || isCurrentStepValid;
                        
                        nextBtn.disabled = !canProceed;
                        
                        // Add loading state support
                        if (nextBtn.classList.contains('loading')) {
                            nextBtn.disabled = true;
                            nextBtn.innerHTML = currentStep === 5 ? 
                                '<span class="spinner"></span> Creating...' : 
                                '<span class="spinner"></span> Validating...';
                        }
                    }
                    
                    function updateStepCounter() {
                        // Add step counter if it doesn't exist
                        let stepCounter = document.getElementById('stepCounter');
                        if (!stepCounter) {
                            stepCounter = document.createElement('div');
                            stepCounter.id = 'stepCounter';
                            stepCounter.className = 'step-counter';
                            document.querySelector('.navigation').appendChild(stepCounter);
                        }
                        
                        stepCounter.textContent = \`Step \${currentStep} of 5\`;
                        stepCounter.setAttribute('aria-live', 'polite');
                    }
                    
                    function setNavigationLoading(isLoading) {
                        const nextBtn = document.getElementById('nextBtn');
                        const prevBtn = document.getElementById('prevBtn');
                        
                        if (isLoading) {
                            nextBtn.classList.add('loading');
                            prevBtn.disabled = true;
                        } else {
                            nextBtn.classList.remove('loading');
                            nextBtn.innerHTML = currentStep === 5 ? 'Create Agent' : 'Next';
                        }
                        
                        updateNavigationStates();
                    }
                    
                    function previousStep() {
                        if (currentStep > 1) {
                            setNavigationLoading(true);
                            
                            // Add transition animation
                            const content = document.getElementById('stepContent');
                            content.classList.add('step-transition-out');
                            
                            setTimeout(() => {
                                vscode.postMessage({
                                    type: 'stepChanged',
                                    step: currentStep - 1
                                });
                            }, 150);
                        }
                    }
                    
                    function nextStep() {
                        if (currentStep < 5) {
                            // Validate current step before proceeding
                            setNavigationLoading(true);
                            
                            // Mark that we want to proceed after validation
                            document.getElementById('nextBtn').classList.add('proceed-pending');
                            
                            vscode.postMessage({
                                type: 'validationRequested'
                            });
                            
                            // The actual step change will happen in handleValidation
                        } else {
                            // Final step - create agent
                            setNavigationLoading(true);
                            
                            vscode.postMessage({
                                type: 'wizardCompleted'
                            });
                        }
                    }
                    
                    function proceedToNextStep() {
                        const content = document.getElementById('stepContent');
                        content.classList.add('step-transition-out');
                        
                        setTimeout(() => {
                            vscode.postMessage({
                                type: 'stepChanged',
                                step: currentStep + 1
                            });
                        }, 150);
                    }
                    
                    function cancelWizard() {
                        vscode.postMessage({
                            type: 'wizardCancelled'
                        });
                    }
                    
                    function handleValidation(validation, canProceed) {
                        setNavigationLoading(false);
                        
                        if (currentStep === 1) {
                            displayBasicPropertiesValidation(validation);
                        }
                        
                        // Update next button state
                        updateNavigationStates();
                        
                        // If validation passed and this was triggered by nextStep, proceed
                        if (canProceed && document.getElementById('nextBtn').classList.contains('proceed-pending')) {
                            document.getElementById('nextBtn').classList.remove('proceed-pending');
                            proceedToNextStep();
                        } else if (!canProceed) {
                            // Show validation errors with animation
                            showValidationErrors(validation);
                        }
                    }
                    
                    function showValidationErrors(validation) {
                        // Create or update error summary
                        let errorSummary = document.getElementById('errorSummary');
                        if (!errorSummary) {
                            errorSummary = document.createElement('div');
                            errorSummary.id = 'errorSummary';
                            errorSummary.className = 'error-summary';
                            document.getElementById('stepContent').appendChild(errorSummary);
                        }
                        
                        if (validation.errors && validation.errors.length > 0) {
                            errorSummary.innerHTML = \`
                                <div class="error-icon">⚠️</div>
                                <div class="error-text">
                                    <strong>Please fix the following issues:</strong>
                                    <ul>
                                        \${validation.errors.map(error => \`<li>\${error}</li>\`).join('')}
                                    </ul>
                                </div>
                            \`;
                            errorSummary.classList.add('show');
                            
                            // Auto-hide after 5 seconds
                            setTimeout(() => {
                                errorSummary.classList.remove('show');
                            }, 5000);
                        } else {
                            errorSummary.classList.remove('show');
                        }
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
                    
                    function setupAgentLocationHandlers() {
                        // Add keyboard navigation support
                        document.querySelectorAll('.location-card').forEach(card => {
                            card.setAttribute('tabindex', '0');
                            card.setAttribute('role', 'button');
                            card.setAttribute('aria-pressed', card.classList.contains('selected'));
                            
                            // Keyboard support
                            card.addEventListener('keydown', (e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    const location = card.getAttribute('data-location');
                                    selectLocation(location);
                                }
                            });
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
                        const data = wizardState?.stepData?.agentLocation || { location: 'local' };
                        return \`
                            <h2>Agent Location</h2>
                            <p>Choose where your agent will be stored and available.</p>
                            
                            <div class="location-cards">
                                <div class="location-card \${data.location === 'local' ? 'selected' : ''}" 
                                     onclick="selectLocation('local')" 
                                     data-location="local">
                                    <div class="card-icon">💻</div>
                                    <div class="card-title">Local Agent</div>
                                    <div class="card-description">
                                        Available only in this workspace
                                    </div>
                                    <div class="card-details">
                                        • Stored in <code>.amazonq/cli-agents/</code><br>
                                        • Project-specific configuration<br>
                                        • Can be shared via version control
                                    </div>
                                </div>
                                
                                <div class="location-card \${data.location === 'global' ? 'selected' : ''}" 
                                     onclick="selectLocation('global')" 
                                     data-location="global">
                                    <div class="card-icon">🌍</div>
                                    <div class="card-title">Global Agent</div>
                                    <div class="card-description">
                                        Available in all workspaces
                                    </div>
                                    <div class="card-details">
                                        • Stored in <code>~/.aws/amazonq/cli-agents/</code><br>
                                        • User-wide configuration<br>
                                        • Available across all projects
                                    </div>
                                </div>
                            </div>
                        \`;
                    }
                    
                    function selectLocation(location) {
                        // Update visual selection
                        document.querySelectorAll('.location-card').forEach(card => {
                            card.classList.remove('selected');
                            card.setAttribute('aria-pressed', 'false');
                        });
                        
                        const selectedCard = document.querySelector(\`[data-location="\${location}"]\`);
                        selectedCard.classList.add('selected');
                        selectedCard.setAttribute('aria-pressed', 'true');
                        
                        // Update wizard state
                        vscode.postMessage({
                            type: 'dataUpdated',
                            data: {
                                agentLocation: { location }
                            }
                        });
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
