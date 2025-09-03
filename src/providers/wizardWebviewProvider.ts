import * as vscode from 'vscode';
import { ExtensionLogger } from '../services/logger';
import { WizardState, WizardStep, WizardMessage, WizardResponse, ValidationResult } from '../types/wizard';
import { AgentLocation } from '../core/agent/AgentLocationService';

export interface IWizardWebviewProvider {
    showWizard(): Promise<void>;
    dispose(): void;
}

export class WizardWebviewProvider implements IWizardWebviewProvider {
    private panel: vscode.WebviewPanel | undefined;
    private disposables: vscode.Disposable[] = [];
    private wizardState: WizardState;

    constructor(
        private readonly context: vscode.ExtensionContext,
        private readonly logger: ExtensionLogger
    ) {
        this.wizardState = this.createInitialState();
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

    private createInitialState(): WizardState {
        return {
            currentStep: WizardStep.BasicProperties,
            totalSteps: 5,
            stepData: {
                basicProperties: { name: '', description: '', prompt: '' },
                agentLocation: { location: 'local' },
                toolsSelection: { standardTools: [], experimentalTools: [] },
                resources: { resources: [] }
            },
            validation: {},
            isComplete: false
        };
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
                        this.updateStepData(message.data);
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
        // Validate current step before proceeding
        const validation = await this.validateStep(this.wizardState.currentStep);
        
        if (!validation.isValid && newStep > this.wizardState.currentStep) {
            this.sendResponse({
                type: 'validationResult',
                validation,
                canProceed: false
            });
            return;
        }

        this.wizardState.currentStep = newStep;
        this.sendResponse({
            type: 'stateUpdate',
            state: this.wizardState
        });
    }

    private updateStepData(data: Partial<WizardState['stepData']>): void {
        this.wizardState.stepData = { ...this.wizardState.stepData, ...data };
        this.sendResponse({
            type: 'stateUpdate',
            state: this.wizardState
        });
    }

    private async validateCurrentStep(): Promise<void> {
        const validation = await this.validateStep(this.wizardState.currentStep);
        this.wizardState.validation[this.wizardState.currentStep] = validation;
        
        this.sendResponse({
            type: 'validationResult',
            validation,
            canProceed: validation.isValid
        });
    }

    private async validateStep(step: WizardStep): Promise<ValidationResult> {
        const errors: string[] = [];
        
        switch (step) {
            case WizardStep.BasicProperties:
                const { name, prompt } = this.wizardState.stepData.basicProperties;
                if (!name.trim()) errors.push('Agent name is required');
                if (!prompt.trim()) errors.push('Prompt is required');
                break;
                
            case WizardStep.AgentLocation:
                // Location is always valid as it has a default
                break;
                
            case WizardStep.ToolsSelection:
                // Tools selection is optional
                break;
                
            case WizardStep.Resources:
                // Resources are optional
                break;
        }
        
        return { isValid: errors.length === 0, errors };
    }

    private async completeWizard(): Promise<void> {
        // TODO: Integrate with existing agent creation service
        this.logger.info('Wizard completed', this.wizardState);
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
                    }
                    .step.active {
                        border-bottom-color: var(--vscode-focusBorder);
                        color: var(--vscode-focusBorder);
                    }
                    .step.completed {
                        border-bottom-color: var(--vscode-charts-green);
                        color: var(--vscode-charts-green);
                    }
                    .step-content {
                        min-height: 400px;
                        padding: 20px 0;
                    }
                    .navigation {
                        display: flex;
                        justify-content: space-between;
                        margin-top: 30px;
                    }
                    button {
                        padding: 10px 20px;
                        border: 1px solid var(--vscode-button-border);
                        background: var(--vscode-button-background);
                        color: var(--vscode-button-foreground);
                        cursor: pointer;
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
                        <button id="prevBtn" onclick="previousStep()" disabled>Previous</button>
                        <div>
                            <button id="cancelBtn" onclick="cancelWizard()">Cancel</button>
                            <button id="nextBtn" onclick="nextStep()" class="primary">Next</button>
                        </div>
                    </div>
                </div>
                
                <script>
                    const vscode = acquireVsCodeApi();
                    let currentStep = 1;
                    let wizardState = null;
                    
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
                        // TODO: Display validation errors
                        console.log('Validation:', validation, 'Can proceed:', canProceed);
                    }
                    
                    // Step content generators (placeholder)
                    function getBasicPropertiesHTML() {
                        return '<h2>Basic Properties</h2><p>Agent name, description, and prompt fields will go here.</p>';
                    }
                    
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
