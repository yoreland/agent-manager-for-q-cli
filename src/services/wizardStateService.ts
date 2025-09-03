import { WizardState, WizardStep, ValidationResult, BasicPropertiesData, AgentLocationData, ToolsSelectionData, ResourcesData } from '../types/wizard';
import { ExtensionLogger } from './logger';

export interface IWizardStateService {
    getState(): WizardState;
    updateStepData<T extends keyof WizardState['stepData']>(step: T, data: Partial<WizardState['stepData'][T]>): void;
    setCurrentStep(step: WizardStep): void;
    setValidation(step: WizardStep, validation: ValidationResult): void;
    canProceedToStep(targetStep: WizardStep): boolean;
    isStepCompleted(step: WizardStep): boolean;
    reset(): void;
}

export class WizardStateService implements IWizardStateService {
    private state: WizardState;

    constructor(private readonly logger: ExtensionLogger) {
        this.state = this.createInitialState();
    }

    getState(): WizardState {
        return { ...this.state };
    }

    updateStepData<T extends keyof WizardState['stepData']>(
        step: T, 
        data: Partial<WizardState['stepData'][T]>
    ): void {
        this.state.stepData[step] = { ...this.state.stepData[step], ...data };
        this.logger.debug('Wizard step data updated', { step, data });
    }

    setCurrentStep(step: WizardStep): void {
        if (this.canProceedToStep(step)) {
            this.state.currentStep = step;
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
        this.logger.debug('Wizard state reset');
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
}
