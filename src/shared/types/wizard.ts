/**
 * Wizard framework types for step-by-step agent creation
 */

import { HookConfigurationData } from './hook';

export enum WizardStep {
    BasicProperties = 1,
    AgentLocation = 2,
    ToolsSelection = 3,
    Resources = 4,
    HookConfiguration = 5,
    Summary = 6
}

export interface WizardState {
    currentStep: WizardStep;
    totalSteps: number;
    stepData: {
        basicProperties: BasicPropertiesData;
        agentLocation: AgentLocationData;
        toolsSelection: ToolsSelectionData;
        resources: ResourcesData;
        hookConfiguration: HookConfigurationData;
    };
    validation: {
        [key in WizardStep]?: ValidationResult;
    };
    isComplete: boolean;
}

export interface BasicPropertiesData {
    name: string;
    description?: string;
    prompt: string;
}

export interface AgentLocationData {
    location: 'local' | 'global';
}

export interface ToolsSelectionData {
    standardTools: string[];
    experimentalTools: string[];
}

export interface ResourcesData {
    resources: string[];
}

export interface ValidationResult {
    isValid: boolean;
    errors: string[];
    warnings?: string[];
}

export interface WizardMessage {
    type: 'stepChanged' | 'dataUpdated' | 'validationRequested' | 'wizardCompleted' | 'openAgentConfig' | 'createAnother' | 'requestInitialState';
    step?: WizardStep;
    data?: Partial<WizardState['stepData']>;
    validation?: ValidationResult;
    agentName?: string;
}

export interface WizardResponse {
    type: 'stateUpdate' | 'validationResult' | 'navigationUpdate' | 'agentCreated';
    state?: WizardState;
    validation?: ValidationResult;
    canProceed?: boolean;
    agentName?: string;
    location?: string;
}
