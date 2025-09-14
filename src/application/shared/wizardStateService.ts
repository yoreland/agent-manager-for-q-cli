import { WizardState, WizardStep, ValidationResult, BasicPropertiesData, AgentLocationData, ToolsSelectionData, ResourcesData, HookConfigurationData, AgentHook } from '../../shared/types/wizard';
import { ExtensionLogger } from './logger';
import * as vscode from 'vscode';

const WIZARD_STATE_KEY = 'qcli.wizard.state';

export interface IWizardStateService {
    getState(): WizardState;
    updateStepData<T extends keyof WizardState['stepData']>(step: T, data: Partial<WizardState['stepData'][T]>): void;
    setCurrentStep(step: WizardStep): void;
    setValidation(step: WizardStep, validation: ValidationResult): void;
    canProceedToStep(targetStep: WizardStep): boolean;
    isStepCompleted(step: WizardStep): boolean;
    reset(): void;
    clearState(): void;
    updateHookConfiguration(data: Partial<HookConfigurationData>): void;
    addHook(hook: AgentHook): void;
    removeHook(hookId: string): void;
    updateHook(hookId: string, updates: Partial<AgentHook>): void;
}

export class WizardStateService implements IWizardStateService {
    private state: WizardState;

    constructor(private readonly logger: ExtensionLogger, private context?: vscode.ExtensionContext) {
        this.state = this.initializeState();
    }

    private initializeState(): WizardState {
        // Try to restore previous state from workspace if context is available
        if (this.context) {
            const savedState = this.context.workspaceState.get<WizardState>(WIZARD_STATE_KEY);
            if (savedState && this.isValidState(savedState)) {
                this.logger.debug('Restored wizard state from workspace');
                return savedState;
            }
        }
        
        return this.createInitialState();
    }

    private isValidState(state: any): state is WizardState {
        return state && 
               typeof state.currentStep === 'number' &&
               state.stepData &&
               state.stepData.basicProperties &&
               state.stepData.agentLocation &&
               state.stepData.toolsSelection &&
               state.stepData.resources &&
               state.stepData.hookConfiguration;
    }

    private persistState(): void {
        if (this.context) {
            this.context.workspaceState.update(WIZARD_STATE_KEY, this.state);
        }
    }

    getState(): WizardState {
        return { ...this.state };
    }

    updateStepData<T extends keyof WizardState['stepData']>(
        step: T, 
        data: Partial<WizardState['stepData'][T]>
    ): void {
        this.state.stepData[step] = { ...this.state.stepData[step], ...data };
        this.persistState();
        this.logger.debug('Wizard step data updated', { step, data });
    }

    setCurrentStep(step: WizardStep): void {
        if (this.canProceedToStep(step)) {
            this.state.currentStep = step;
            this.persistState();
            this.logger.debug('Wizard step changed', { step });
        } else {
            this.logger.warn('Cannot proceed to step due to validation', { step });
        }
    }

    setValidation(step: WizardStep, validation: ValidationResult): void {
        this.state.validation[step] = validation;
        this.logger.debug('Wizard validation updated', { step, isValid: validation.isValid });
    }

    canProceedToStep(targetStep: WizardStep): boolean {
        // Can always go backwards
        if (targetStep <= this.state.currentStep) {
            return true;
        }

        // Check if all previous steps are valid
        for (let step = WizardStep.BasicProperties; step < targetStep; step++) {
            if (!this.isStepCompleted(step)) {
                return false;
            }
        }

        return true;
    }

    isStepCompleted(step: WizardStep): boolean {
        const validation = this.state.validation[step];
        return validation ? validation.isValid : false;
    }

    reset(): void {
        this.state = this.createInitialState();
        this.persistState();
        this.logger.debug('Wizard state reset');
    }

    clearState(): void {
        this.state = this.createInitialState();
        if (this.context) {
            this.context.workspaceState.update(WIZARD_STATE_KEY, undefined);
        }
        this.logger.debug('Wizard state cleared');
    }

    private createInitialState(): WizardState {
        return {
            currentStep: WizardStep.BasicProperties,
            totalSteps: 6,
            stepData: {
                basicProperties: { name: '', description: '', prompt: '' },
                agentLocation: { location: 'local' },
                toolsSelection: { 
                    standardTools: ['fs_read', 'fs_write', 'execute_bash', 'use_aws', 'introspect'], 
                    experimentalTools: [] 
                },
                resources: { 
                    resources: [
                        'file://AmazonQ.md',
                        'file://README.md', 
                        'file://.amazonq/rules/**/*.md'
                    ] 
                },
                hookConfiguration: { hooks: [], skipHooks: false }
            },
            validation: {},
            isComplete: false
        };
    }

    updateHookConfiguration(data: Partial<HookConfigurationData>): void {
        this.state.stepData.hookConfiguration = {
            ...this.state.stepData.hookConfiguration,
            ...data
        };
        this.persistState();
        this.logger.debug('Hook configuration updated', { data });
    }
    
    addHook(hook: AgentHook): void {
        this.state.stepData.hookConfiguration.hooks.push(hook);
        this.persistState();
        this.logger.debug('Hook added', { hookId: hook.id });
    }
    
    removeHook(hookId: string): void {
        this.state.stepData.hookConfiguration.hooks = 
            this.state.stepData.hookConfiguration.hooks.filter(h => h.id !== hookId);
        this.persistState();
        this.logger.debug('Hook removed', { hookId });
    }
    
    updateHook(hookId: string, updates: Partial<AgentHook>): void {
        const hookIndex = this.state.stepData.hookConfiguration.hooks.findIndex(h => h.id === hookId);
        if (hookIndex !== -1) {
            this.state.stepData.hookConfiguration.hooks[hookIndex] = {
                ...this.state.stepData.hookConfiguration.hooks[hookIndex],
                ...updates
            };
            this.persistState();
            this.logger.debug('Hook updated', { hookId, updates });
        }
    }
}
