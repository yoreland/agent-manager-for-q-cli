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
                    
                    /* Tools Selection Styling */
                    .tools-tabs {
                        display: flex;
                        border-bottom: 1px solid var(--vscode-input-border);
                        margin-bottom: 20px;
                    }
                    
                    .tab-button {
                        background: transparent;
                        border: none;
                        padding: 12px 20px;
                        cursor: pointer;
                        color: var(--vscode-descriptionForeground);
                        border-bottom: 2px solid transparent;
                        transition: all 0.2s ease;
                        display: flex;
                        align-items: center;
                        gap: 8px;
                        font-family: var(--vscode-font-family);
                        font-size: 14px;
                    }
                    
                    .tab-button:hover {
                        color: var(--vscode-foreground);
                        background: var(--vscode-list-hoverBackground);
                    }
                    
                    .tab-button.active {
                        color: var(--vscode-focusBorder);
                        border-bottom-color: var(--vscode-focusBorder);
                        font-weight: 600;
                    }
                    
                    .experimental-badge {
                        background: var(--vscode-notificationsWarningIcon-foreground);
                        color: white;
                        font-size: 10px;
                        padding: 2px 6px;
                        border-radius: 8px;
                        font-weight: bold;
                    }
                    
                    .tab-content {
                        position: relative;
                    }
                    
                    .tab-panel {
                        display: none;
                    }
                    
                    .tab-panel.active {
                        display: block;
                        animation: fadeIn 0.3s ease;
                    }
                    
                    @keyframes fadeIn {
                        from { opacity: 0; transform: translateY(10px); }
                        to { opacity: 1; transform: translateY(0); }
                    }
                    
                    .experimental-warning {
                        display: flex;
                        align-items: center;
                        gap: 12px;
                        background: var(--vscode-inputValidation-warningBackground);
                        border: 1px solid var(--vscode-inputValidation-warningBorder);
                        border-radius: 6px;
                        padding: 16px;
                        margin-bottom: 20px;
                    }
                    
                    .warning-icon {
                        font-size: 20px;
                        flex-shrink: 0;
                    }
                    
                    .warning-text {
                        color: var(--vscode-inputValidation-warningForeground);
                        font-size: 14px;
                    }
                    
                    .tools-grid {
                        display: grid;
                        gap: 16px;
                    }
                    
                    .tool-card {
                        border: 1px solid var(--vscode-input-border);
                        border-radius: 6px;
                        padding: 16px;
                        cursor: pointer;
                        transition: all 0.2s ease;
                        background: var(--vscode-input-background);
                    }
                    
                    .tool-card:hover {
                        border-color: var(--vscode-focusBorder);
                        background: var(--vscode-list-hoverBackground);
                    }
                    
                    .tool-card.selected {
                        border-color: var(--vscode-focusBorder);
                        background: var(--vscode-list-activeSelectionBackground);
                        color: var(--vscode-list-activeSelectionForeground);
                    }
                    
                    .tool-card.experimental {
                        border-left: 4px solid var(--vscode-notificationsWarningIcon-foreground);
                    }
                    
                    .tool-header {
                        display: flex;
                        align-items: flex-start;
                        gap: 12px;
                    }
                    
                    .tool-checkbox {
                        flex-shrink: 0;
                        margin-top: 2px;
                    }
                    
                    .tool-checkbox input[type="checkbox"] {
                        width: 16px;
                        height: 16px;
                        cursor: pointer;
                    }
                    
                    .tool-info {
                        flex: 1;
                    }
                    
                    .tool-name {
                        font-weight: 600;
                        font-size: 16px;
                        margin-bottom: 4px;
                        display: flex;
                        align-items: center;
                        gap: 8px;
                    }
                    
                    .experimental-tag {
                        background: var(--vscode-notificationsWarningIcon-foreground);
                        color: white;
                        font-size: 10px;
                        padding: 2px 6px;
                        border-radius: 8px;
                        font-weight: bold;
                    }
                    
                    .tool-description {
                        color: var(--vscode-descriptionForeground);
                        font-size: 14px;
                        margin-bottom: 8px;
                    }
                    
                    .tool-card.selected .tool-description {
                        color: var(--vscode-list-activeSelectionForeground);
                        opacity: 0.9;
                    }
                    
                    .tool-details {
                        max-height: 0;
                        overflow: hidden;
                        transition: max-height 0.3s ease, padding-top 0.3s ease;
                        font-size: 13px;
                        color: var(--vscode-descriptionForeground);
                        line-height: 1.5;
                    }
                    
                    .tool-details.expanded {
                        max-height: 100px;
                        padding-top: 8px;
                        border-top: 1px solid var(--vscode-input-border);
                    }
                    
                    .tool-card.selected .tool-details {
                        color: var(--vscode-list-activeSelectionForeground);
                        opacity: 0.8;
                        border-top-color: rgba(255, 255, 255, 0.2);
                    }
                    
                    /* Resources Section Styling */
                    .resources-section {
                        display: flex;
                        flex-direction: column;
                        gap: 24px;
                    }
                    
                    .drop-zone {
                        border: 2px dashed var(--vscode-input-border);
                        border-radius: 8px;
                        padding: 40px 20px;
                        text-align: center;
                        cursor: pointer;
                        transition: all 0.2s ease;
                        background: var(--vscode-input-background);
                    }
                    
                    .drop-zone:hover,
                    .drop-zone.drag-over {
                        border-color: var(--vscode-focusBorder);
                        background: var(--vscode-list-hoverBackground);
                    }
                    
                    .drop-zone-content {
                        pointer-events: none;
                    }
                    
                    .drop-icon {
                        font-size: 48px;
                        margin-bottom: 16px;
                    }
                    
                    .drop-text {
                        color: var(--vscode-foreground);
                        font-size: 16px;
                        line-height: 1.5;
                    }
                    
                    .manual-input-section {
                        position: relative;
                    }
                    
                    .input-group {
                        display: flex;
                        gap: 8px;
                        align-items: flex-start;
                    }
                    
                    .input-group .form-input {
                        flex: 1;
                    }
                    
                    .add-btn {
                        padding: 8px 16px;
                        background: var(--vscode-button-background);
                        color: var(--vscode-button-foreground);
                        border: 1px solid var(--vscode-button-border);
                        border-radius: 2px;
                        cursor: pointer;
                        font-family: var(--vscode-font-family);
                        font-size: 14px;
                        white-space: nowrap;
                    }
                    
                    .add-btn:hover {
                        background: var(--vscode-button-hoverBackground);
                    }
                    
                    .resource-error {
                        color: var(--vscode-errorForeground);
                        font-size: 12px;
                        margin-top: 4px;
                        opacity: 0;
                        transform: translateY(-5px);
                        transition: all 0.2s ease;
                    }
                    
                    .resource-error.show {
                        opacity: 1;
                        transform: translateY(0);
                    }
                    
                    .resources-list {
                        min-height: 100px;
                    }
                    
                    .empty-resources {
                        text-align: center;
                        padding: 40px 20px;
                        color: var(--vscode-descriptionForeground);
                    }
                    
                    .empty-icon {
                        font-size: 48px;
                        margin-bottom: 12px;
                        opacity: 0.5;
                    }
                    
                    .empty-text {
                        font-size: 16px;
                    }
                    
                    .resources-header {
                        display: flex;
                        align-items: center;
                        justify-content: space-between;
                        margin-bottom: 16px;
                    }
                    
                    .resources-header h3 {
                        margin: 0;
                        font-size: 16px;
                        font-weight: 600;
                        color: var(--vscode-foreground);
                    }
                    
                    .resources-grid {
                        display: flex;
                        flex-direction: column;
                        gap: 8px;
                    }
                    
                    .resource-item {
                        display: flex;
                        align-items: center;
                        gap: 12px;
                        padding: 12px;
                        border: 1px solid var(--vscode-input-border);
                        border-radius: 4px;
                        background: var(--vscode-input-background);
                        transition: all 0.2s ease;
                    }
                    
                    .resource-item:hover {
                        background: var(--vscode-list-hoverBackground);
                        border-color: var(--vscode-focusBorder);
                    }
                    
                    .resource-icon {
                        font-size: 20px;
                        flex-shrink: 0;
                    }
                    
                    .resource-info {
                        flex: 1;
                        min-width: 0;
                    }
                    
                    .resource-path {
                        font-family: var(--vscode-editor-font-family);
                        font-size: 13px;
                        color: var(--vscode-foreground);
                        word-break: break-all;
                        margin-bottom: 2px;
                    }
                    
                    .resource-type {
                        font-size: 11px;
                        color: var(--vscode-descriptionForeground);
                        text-transform: uppercase;
                        font-weight: 500;
                    }
                    
                    .remove-btn {
                        background: transparent;
                        border: none;
                        color: var(--vscode-errorForeground);
                        cursor: pointer;
                        padding: 4px;
                        border-radius: 2px;
                        font-size: 14px;
                        opacity: 0.7;
                        transition: all 0.2s ease;
                        flex-shrink: 0;
                    }
                    
                    .remove-btn:hover {
                        opacity: 1;
                        background: var(--vscode-inputValidation-errorBackground);
                    }
                    
                    /* Summary Page Styling */
                    .summary-sections {
                        display: flex;
                        flex-direction: column;
                        gap: 24px;
                        margin-bottom: 24px;
                    }
                    
                    .summary-section {
                        border: 1px solid var(--vscode-input-border);
                        border-radius: 6px;
                        background: var(--vscode-input-background);
                    }
                    
                    .summary-header {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        padding: 16px 20px;
                        border-bottom: 1px solid var(--vscode-input-border);
                        background: var(--vscode-editor-background);
                    }
                    
                    .summary-header h3 {
                        margin: 0;
                        font-size: 16px;
                        font-weight: 600;
                        color: var(--vscode-foreground);
                    }
                    
                    .edit-btn {
                        background: transparent;
                        border: 1px solid var(--vscode-button-border);
                        color: var(--vscode-button-foreground);
                        padding: 6px 12px;
                        border-radius: 2px;
                        cursor: pointer;
                        font-size: 12px;
                        font-family: var(--vscode-font-family);
                        transition: all 0.2s ease;
                    }
                    
                    .edit-btn:hover {
                        background: var(--vscode-button-hoverBackground);
                    }
                    
                    .summary-content {
                        padding: 20px;
                    }
                    
                    .summary-item {
                        display: flex;
                        margin-bottom: 12px;
                        align-items: flex-start;
                        gap: 12px;
                    }
                    
                    .summary-label {
                        font-weight: 600;
                        color: var(--vscode-foreground);
                        min-width: 80px;
                        flex-shrink: 0;
                    }
                    
                    .summary-value {
                        color: var(--vscode-foreground);
                        flex: 1;
                    }
                    
                    .summary-prompt {
                        background: var(--vscode-textCodeBlock-background);
                        border: 1px solid var(--vscode-input-border);
                        border-radius: 4px;
                        padding: 12px;
                        font-family: var(--vscode-editor-font-family);
                        font-size: 13px;
                        line-height: 1.4;
                        color: var(--vscode-textPreformat-foreground);
                        white-space: pre-wrap;
                        max-height: 120px;
                        overflow-y: auto;
                        flex: 1;
                    }
                    
                    .location-summary {
                        display: flex;
                        align-items: center;
                        gap: 16px;
                    }
                    
                    .location-icon {
                        font-size: 32px;
                    }
                    
                    .location-info {
                        flex: 1;
                    }
                    
                    .location-name {
                        font-weight: 600;
                        font-size: 16px;
                        color: var(--vscode-foreground);
                        margin-bottom: 4px;
                    }
                    
                    .location-desc {
                        color: var(--vscode-descriptionForeground);
                        font-size: 14px;
                    }
                    
                    .tools-summary {
                        display: flex;
                        flex-direction: column;
                        gap: 16px;
                    }
                    
                    .tools-group-title {
                        font-weight: 600;
                        color: var(--vscode-foreground);
                        margin-bottom: 8px;
                        display: flex;
                        align-items: center;
                        gap: 8px;
                    }
                    
                    .tools-list {
                        display: flex;
                        flex-wrap: wrap;
                        gap: 6px;
                    }
                    
                    .tool-tag {
                        background: var(--vscode-badge-background);
                        color: var(--vscode-badge-foreground);
                        padding: 4px 8px;
                        border-radius: 12px;
                        font-size: 11px;
                        font-weight: 500;
                        text-transform: uppercase;
                    }
                    
                    .tool-tag.experimental {
                        background: var(--vscode-notificationsWarningIcon-foreground);
                        color: white;
                    }
                    
                    .resources-summary {
                        display: flex;
                        flex-direction: column;
                        gap: 12px;
                    }
                    
                    .resources-count {
                        font-weight: 600;
                        color: var(--vscode-foreground);
                    }
                    
                    .resources-preview {
                        display: flex;
                        flex-direction: column;
                        gap: 6px;
                    }
                    
                    .resource-preview-item {
                        display: flex;
                        align-items: center;
                        gap: 8px;
                        font-size: 13px;
                    }
                    
                    .resource-preview-icon {
                        font-size: 14px;
                    }
                    
                    .resource-preview-path {
                        font-family: var(--vscode-editor-font-family);
                        color: var(--vscode-textPreformat-foreground);
                        word-break: break-all;
                    }
                    
                    .resource-preview-more {
                        color: var(--vscode-descriptionForeground);
                        font-style: italic;
                        font-size: 12px;
                        margin-left: 22px;
                    }
                    
                    .empty-summary {
                        display: flex;
                        align-items: center;
                        gap: 8px;
                        color: var(--vscode-descriptionForeground);
                        font-style: italic;
                    }
                    
                    .empty-icon {
                        font-size: 16px;
                        opacity: 0.7;
                    }
                    
                    .creation-info {
                        display: flex;
                        align-items: flex-start;
                        gap: 12px;
                        background: var(--vscode-inputValidation-infoBackground);
                        border: 1px solid var(--vscode-inputValidation-infoBorder);
                        border-radius: 6px;
                        padding: 16px;
                        margin-top: 24px;
                    }
                    
                    .info-icon {
                        font-size: 20px;
                        flex-shrink: 0;
                    }
                    
                    .info-text {
                        color: var(--vscode-inputValidation-infoForeground);
                        font-size: 14px;
                        line-height: 1.5;
                    }
                    
                    .info-text code {
                        background: rgba(255, 255, 255, 0.1);
                        padding: 2px 4px;
                        border-radius: 2px;
                        font-family: var(--vscode-editor-font-family);
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
                                setupToolsSelectionHandlers();
                                break;
                            case 4:
                                content.innerHTML = getResourcesHTML();
                                setupResourcesHandlers();
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
                    
                    function setupToolsSelectionHandlers() {
                        // Add keyboard navigation for tool cards
                        document.querySelectorAll('.tool-card').forEach(card => {
                            card.setAttribute('tabindex', '0');
                            card.setAttribute('role', 'checkbox');
                            card.setAttribute('aria-checked', card.classList.contains('selected'));
                            
                            card.addEventListener('keydown', (e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    const toolId = card.getAttribute('data-tool-id');
                                    const toolType = card.getAttribute('data-tool-type');
                                    toggleTool(toolId, toolType);
                                }
                            });
                        });
                        
                        // Add keyboard navigation for tabs
                        document.querySelectorAll('.tab-button').forEach(tab => {
                            tab.addEventListener('keydown', (e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    const tabName = tab.getAttribute('data-tab');
                                    switchTab(tabName);
                                }
                            });
                        });
                    }
                    
                    function setupResourcesHandlers() {
                        const dropZone = document.getElementById('dropZone');
                        const fileInput = document.getElementById('fileInput');
                        
                        // Click to browse files
                        dropZone.addEventListener('click', () => {
                            fileInput.click();
                        });
                        
                        // File input change handler
                        fileInput.addEventListener('change', (e) => {
                            const files = Array.from(e.target.files);
                            files.forEach(file => {
                                const path = \`file://\${file.webkitRelativePath || file.name}\`;
                                if (validateResourcePath(path)) {
                                    addResource(path);
                                }
                            });
                            fileInput.value = ''; // Reset input
                        });
                        
                        // Drag and drop handlers
                        dropZone.addEventListener('dragover', (e) => {
                            e.preventDefault();
                            dropZone.classList.add('drag-over');
                        });
                        
                        dropZone.addEventListener('dragleave', (e) => {
                            e.preventDefault();
                            dropZone.classList.remove('drag-over');
                        });
                        
                        dropZone.addEventListener('drop', (e) => {
                            e.preventDefault();
                            dropZone.classList.remove('drag-over');
                            
                            const files = Array.from(e.dataTransfer.files);
                            files.forEach(file => {
                                const path = \`file://\${file.webkitRelativePath || file.name}\`;
                                if (validateResourcePath(path)) {
                                    addResource(path);
                                }
                            });
                        });
                        
                        // Keyboard support for manual input
                        const manualInput = document.getElementById('manualPath');
                        manualInput.addEventListener('keydown', (e) => {
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                addManualPath();
                            }
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
                        const data = wizardState?.stepData?.toolsSelection || { standardTools: [], experimentalTools: [] };
                        return \`
                            <h2>Tools Selection</h2>
                            <p>Choose the tools your agent will have access to.</p>
                            
                            <div class="tools-tabs">
                                <button class="tab-button active" onclick="switchTab('standard')" data-tab="standard">
                                    Standard Tools
                                </button>
                                <button class="tab-button" onclick="switchTab('experimental')" data-tab="experimental">
                                    Experimental Tools
                                    <span class="experimental-badge">BETA</span>
                                </button>
                            </div>
                            
                            <div class="tab-content">
                                <div class="tab-panel active" id="standardTab">
                                    <div class="tools-grid">
                                        \${getStandardToolsHTML(data.standardTools)}
                                    </div>
                                </div>
                                
                                <div class="tab-panel" id="experimentalTab">
                                    <div class="experimental-warning">
                                        <div class="warning-icon">⚠️</div>
                                        <div class="warning-text">
                                            <strong>Experimental Features</strong><br>
                                            These tools are in active development and may change or be removed at any time.
                                        </div>
                                    </div>
                                    <div class="tools-grid">
                                        \${getExperimentalToolsHTML(data.experimentalTools)}
                                    </div>
                                </div>
                            </div>
                        \`;
                    }
                    
                    function getStandardToolsHTML(selectedTools) {
                        const standardTools = [
                            {
                                id: 'fs_read',
                                name: 'File System Read',
                                description: 'Read files, directories, and images',
                                details: 'Allows the agent to read file contents, list directory structures, and process images for analysis.'
                            },
                            {
                                id: 'fs_write', 
                                name: 'File System Write',
                                description: 'Create and edit files',
                                details: 'Enables the agent to create new files, modify existing files, and manage file operations.'
                            },
                            {
                                id: 'execute_bash',
                                name: 'Execute Bash',
                                description: 'Execute shell commands',
                                details: 'Run bash commands and scripts. Use with caution as this provides system access.'
                            },
                            {
                                id: 'use_aws',
                                name: 'AWS CLI',
                                description: 'Make AWS CLI API calls',
                                details: 'Interact with AWS services through CLI commands. Requires proper AWS credentials.'
                            },
                            {
                                id: 'introspect',
                                name: 'Introspect',
                                description: 'Q CLI capabilities information',
                                details: 'Provides information about Q CLI features, commands, and documentation.'
                            }
                        ];
                        
                        return standardTools.map(tool => \`
                            <div class="tool-card \${selectedTools.includes(tool.id) ? 'selected' : ''}" 
                                 data-tool-id="\${tool.id}" 
                                 data-tool-type="standard"
                                 onclick="toggleTool('\${tool.id}', 'standard')">
                                <div class="tool-header">
                                    <div class="tool-checkbox">
                                        <input type="checkbox" \${selectedTools.includes(tool.id) ? 'checked' : ''} 
                                               onchange="event.stopPropagation(); toggleTool('\${tool.id}', 'standard')">
                                    </div>
                                    <div class="tool-info">
                                        <div class="tool-name">\${tool.name}</div>
                                        <div class="tool-description">\${tool.description}</div>
                                    </div>
                                </div>
                                <div class="tool-details \${selectedTools.includes(tool.id) ? 'expanded' : ''}">
                                    \${tool.details}
                                </div>
                            </div>
                        \`).join('');
                    }
                    
                    function getExperimentalToolsHTML(selectedTools) {
                        const experimentalTools = [
                            {
                                id: 'knowledge',
                                name: 'Knowledge Base',
                                description: 'Store and retrieve information across sessions',
                                details: 'Persistent context storage with semantic search capabilities. Maintains information between chat sessions.'
                            },
                            {
                                id: 'thinking',
                                name: 'Thinking Process',
                                description: 'Complex reasoning with step-by-step processes',
                                details: 'Shows AI reasoning process for complex problems. Helps understand how conclusions are reached.'
                            },
                            {
                                id: 'todo_list',
                                name: 'TODO List',
                                description: 'Task management and tracking',
                                details: 'Create and manage TODO lists for tracking multi-step tasks. Lists are stored locally.'
                            }
                        ];
                        
                        return experimentalTools.map(tool => \`
                            <div class="tool-card experimental \${selectedTools.includes(tool.id) ? 'selected' : ''}" 
                                 data-tool-id="\${tool.id}" 
                                 data-tool-type="experimental"
                                 onclick="toggleTool('\${tool.id}', 'experimental')">
                                <div class="tool-header">
                                    <div class="tool-checkbox">
                                        <input type="checkbox" \${selectedTools.includes(tool.id) ? 'checked' : ''} 
                                               onchange="event.stopPropagation(); toggleTool('\${tool.id}', 'experimental')">
                                    </div>
                                    <div class="tool-info">
                                        <div class="tool-name">
                                            \${tool.name}
                                            <span class="experimental-tag">BETA</span>
                                        </div>
                                        <div class="tool-description">\${tool.description}</div>
                                    </div>
                                </div>
                                <div class="tool-details \${selectedTools.includes(tool.id) ? 'expanded' : ''}">
                                    \${tool.details}
                                </div>
                            </div>
                        \`).join('');
                    }
                    
                    function switchTab(tabName) {
                        // Update tab buttons
                        document.querySelectorAll('.tab-button').forEach(btn => {
                            btn.classList.remove('active');
                        });
                        document.querySelector(\`[data-tab="\${tabName}"]\`).classList.add('active');
                        
                        // Update tab panels
                        document.querySelectorAll('.tab-panel').forEach(panel => {
                            panel.classList.remove('active');
                        });
                        document.getElementById(\`\${tabName}Tab\`).classList.add('active');
                    }
                    
                    function toggleTool(toolId, toolType) {
                        const card = document.querySelector(\`[data-tool-id="\${toolId}"]\`);
                        const checkbox = card.querySelector('input[type="checkbox"]');
                        const details = card.querySelector('.tool-details');
                        
                        // Toggle selection
                        checkbox.checked = !checkbox.checked;
                        card.classList.toggle('selected');
                        details.classList.toggle('expanded');
                        
                        // Update wizard state
                        updateToolsSelection();
                    }
                    
                    function updateToolsSelection() {
                        const standardTools = Array.from(document.querySelectorAll('[data-tool-type="standard"] input:checked'))
                            .map(input => input.closest('[data-tool-id]').dataset.toolId);
                        
                        const experimentalTools = Array.from(document.querySelectorAll('[data-tool-type="experimental"] input:checked'))
                            .map(input => input.closest('[data-tool-id]').dataset.toolId);
                        
                        vscode.postMessage({
                            type: 'dataUpdated',
                            data: {
                                toolsSelection: { standardTools, experimentalTools }
                            }
                        });
                    }
                    
                    function getResourcesHTML() {
                        const data = wizardState?.stepData?.resources || { resources: [] };
                        return \`
                            <h2>Resources</h2>
                            <p>Add files and directories that your agent can access.</p>
                            
                            <div class="resources-section">
                                <div class="drop-zone" id="dropZone">
                                    <div class="drop-zone-content">
                                        <div class="drop-icon">📁</div>
                                        <div class="drop-text">
                                            <strong>Drag & drop files here</strong><br>
                                            or click to browse files
                                        </div>
                                        <input type="file" id="fileInput" multiple style="display: none;">
                                    </div>
                                </div>
                                
                                <div class="manual-input-section">
                                    <div class="input-group">
                                        <input type="text" 
                                               id="manualPath" 
                                               class="form-input" 
                                               placeholder="file://path/to/file or file://path/to/directory/**"
                                               onkeypress="handleManualPathKeypress(event)">
                                        <button onclick="addManualPath()" class="add-btn">Add</button>
                                    </div>
                                    <div class="form-help">
                                        Use <code>file://</code> prefix. Add <code>/**</code> for directories.
                                    </div>
                                </div>
                                
                                <div class="resources-list" id="resourcesList">
                                    \${getResourcesListHTML(data.resources)}
                                </div>
                            </div>
                        \`;
                    }
                    
                    function getResourcesListHTML(resources) {
                        if (resources.length === 0) {
                            return \`
                                <div class="empty-resources">
                                    <div class="empty-icon">📄</div>
                                    <div class="empty-text">No resources added yet</div>
                                </div>
                            \`;
                        }
                        
                        return \`
                            <div class="resources-header">
                                <h3>Added Resources (\${resources.length})</h3>
                            </div>
                            <div class="resources-grid">
                                \${resources.map((resource, index) => \`
                                    <div class="resource-item" data-index="\${index}">
                                        <div class="resource-icon">
                                            \${resource.includes('/**') ? '📁' : '📄'}
                                        </div>
                                        <div class="resource-info">
                                            <div class="resource-path">\${resource}</div>
                                            <div class="resource-type">
                                                \${resource.includes('/**') ? 'Directory pattern' : 'File'}
                                            </div>
                                        </div>
                                        <button class="remove-btn" onclick="removeResource(\${index})" 
                                                aria-label="Remove resource">
                                            ✕
                                        </button>
                                    </div>
                                \`).join('')}
                            </div>
                        \`;
                    }
                    
                    function addManualPath() {
                        const input = document.getElementById('manualPath');
                        const path = input.value.trim();
                        
                        if (path) {
                            if (validateResourcePath(path)) {
                                addResource(path);
                                input.value = '';
                            }
                        }
                    }
                    
                    function handleManualPathKeypress(event) {
                        if (event.key === 'Enter') {
                            event.preventDefault();
                            addManualPath();
                        }
                    }
                    
                    function validateResourcePath(path) {
                        if (!path.startsWith('file://')) {
                            showResourceError('Resource path must start with "file://"');
                            return false;
                        }
                        
                        if (/[<>"|?*]/.test(path)) {
                            showResourceError('Resource path contains invalid characters');
                            return false;
                        }
                        
                        // Check for duplicates
                        const currentResources = wizardState?.stepData?.resources?.resources || [];
                        if (currentResources.includes(path)) {
                            showResourceError('This resource has already been added');
                            return false;
                        }
                        
                        return true;
                    }
                    
                    function showResourceError(message) {
                        // Create or update error message
                        let errorEl = document.getElementById('resourceError');
                        if (!errorEl) {
                            errorEl = document.createElement('div');
                            errorEl.id = 'resourceError';
                            errorEl.className = 'resource-error';
                            document.querySelector('.manual-input-section').appendChild(errorEl);
                        }
                        
                        errorEl.textContent = message;
                        errorEl.classList.add('show');
                        
                        setTimeout(() => {
                            errorEl.classList.remove('show');
                        }, 3000);
                    }
                    
                    function addResource(path) {
                        const currentResources = wizardState?.stepData?.resources?.resources || [];
                        const newResources = [...currentResources, path];
                        
                        vscode.postMessage({
                            type: 'dataUpdated',
                            data: {
                                resources: { resources: newResources }
                            }
                        });
                    }
                    
                    function removeResource(index) {
                        const currentResources = wizardState?.stepData?.resources?.resources || [];
                        const newResources = currentResources.filter((_, i) => i !== index);
                        
                        vscode.postMessage({
                            type: 'dataUpdated',
                            data: {
                                resources: { resources: newResources }
                            }
                        });
                    }
                    
                    function getSummaryHTML() {
                        const data = wizardState?.stepData || {};
                        const { basicProperties, agentLocation, toolsSelection, resources } = data;
                        
                        return \`
                            <h2>Summary</h2>
                            <p>Review your agent configuration before creating.</p>
                            
                            <div class="summary-sections">
                                <div class="summary-section">
                                    <div class="summary-header">
                                        <h3>Basic Properties</h3>
                                        <button class="edit-btn" onclick="goToStep(1)">Edit</button>
                                    </div>
                                    <div class="summary-content">
                                        <div class="summary-item">
                                            <span class="summary-label">Name:</span>
                                            <span class="summary-value">\${basicProperties?.name || 'Not set'}</span>
                                        </div>
                                        <div class="summary-item">
                                            <span class="summary-label">Description:</span>
                                            <span class="summary-value">\${basicProperties?.description || 'None'}</span>
                                        </div>
                                        <div class="summary-item">
                                            <span class="summary-label">Prompt:</span>
                                            <div class="summary-prompt">\${basicProperties?.prompt || 'Not set'}</div>
                                        </div>
                                    </div>
                                </div>
                                
                                <div class="summary-section">
                                    <div class="summary-header">
                                        <h3>Agent Location</h3>
                                        <button class="edit-btn" onclick="goToStep(2)">Edit</button>
                                    </div>
                                    <div class="summary-content">
                                        <div class="location-summary">
                                            <div class="location-icon">
                                                \${agentLocation?.location === 'global' ? '🌍' : '💻'}
                                            </div>
                                            <div class="location-info">
                                                <div class="location-name">
                                                    \${agentLocation?.location === 'global' ? 'Global Agent' : 'Local Agent'}
                                                </div>
                                                <div class="location-desc">
                                                    \${agentLocation?.location === 'global' 
                                                        ? 'Available in all workspaces' 
                                                        : 'Available only in this workspace'}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                
                                <div class="summary-section">
                                    <div class="summary-header">
                                        <h3>Tools</h3>
                                        <button class="edit-btn" onclick="goToStep(3)">Edit</button>
                                    </div>
                                    <div class="summary-content">
                                        \${getToolsSummaryHTML(toolsSelection)}
                                    </div>
                                </div>
                                
                                <div class="summary-section">
                                    <div class="summary-header">
                                        <h3>Resources</h3>
                                        <button class="edit-btn" onclick="goToStep(4)">Edit</button>
                                    </div>
                                    <div class="summary-content">
                                        \${getResourcesSummaryHTML(resources)}
                                    </div>
                                </div>
                            </div>
                            
                            <div class="creation-info">
                                <div class="info-icon">ℹ️</div>
                                <div class="info-text">
                                    Your agent will be created as <code>\${basicProperties?.name || 'agent'}.json</code> 
                                    in the \${agentLocation?.location === 'global' ? 'global' : 'local'} agents directory.
                                </div>
                            </div>
                        \`;
                    }
                    
                    function getToolsSummaryHTML(toolsSelection) {
                        const standardTools = toolsSelection?.standardTools || [];
                        const experimentalTools = toolsSelection?.experimentalTools || [];
                        const totalTools = standardTools.length + experimentalTools.length;
                        
                        if (totalTools === 0) {
                            return \`
                                <div class="empty-summary">
                                    <span class="empty-icon">🔧</span>
                                    <span>No tools selected</span>
                                </div>
                            \`;
                        }
                        
                        return \`
                            <div class="tools-summary">
                                \${standardTools.length > 0 ? \`
                                    <div class="tools-group">
                                        <div class="tools-group-title">Standard Tools (\${standardTools.length})</div>
                                        <div class="tools-list">
                                            \${standardTools.map(tool => \`<span class="tool-tag">\${tool}</span>\`).join('')}
                                        </div>
                                    </div>
                                \` : ''}
                                \${experimentalTools.length > 0 ? \`
                                    <div class="tools-group">
                                        <div class="tools-group-title">
                                            Experimental Tools (\${experimentalTools.length})
                                            <span class="experimental-badge">BETA</span>
                                        </div>
                                        <div class="tools-list">
                                            \${experimentalTools.map(tool => \`<span class="tool-tag experimental">\${tool}</span>\`).join('')}
                                        </div>
                                    </div>
                                \` : ''}
                            </div>
                        \`;
                    }
                    
                    function getResourcesSummaryHTML(resources) {
                        const resourceList = resources?.resources || [];
                        
                        if (resourceList.length === 0) {
                            return \`
                                <div class="empty-summary">
                                    <span class="empty-icon">📄</span>
                                    <span>No resources added</span>
                                </div>
                            \`;
                        }
                        
                        return \`
                            <div class="resources-summary">
                                <div class="resources-count">\${resourceList.length} resource(s) added</div>
                                <div class="resources-preview">
                                    \${resourceList.slice(0, 3).map(resource => \`
                                        <div class="resource-preview-item">
                                            <span class="resource-preview-icon">
                                                \${resource.includes('/**') ? '📁' : '📄'}
                                            </span>
                                            <span class="resource-preview-path">\${resource}</span>
                                        </div>
                                    \`).join('')}
                                    \${resourceList.length > 3 ? \`
                                        <div class="resource-preview-more">
                                            ... and \${resourceList.length - 3} more
                                        </div>
                                    \` : ''}
                                </div>
                            </div>
                        \`;
                    }
                    
                    function goToStep(stepNumber) {
                        vscode.postMessage({
                            type: 'stepChanged',
                            step: stepNumber
                        });
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
