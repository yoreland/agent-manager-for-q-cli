import { WizardStep, ValidationResult, WizardState, HookConfigurationData } from '../../shared/types/wizard';
import { ExtensionLogger } from './logger';
import { IAgentConfigService } from './agentConfigService';
import { HookValidationService } from '../context/hookValidationService';

export interface IWizardValidationService {
    validateStep(step: WizardStep, stepData: WizardState['stepData']): Promise<ValidationResult>;
    validateField(step: WizardStep, field: string, value: any): ValidationResult;
    setAgentConfigService(service: IAgentConfigService): void;
}

export class WizardValidationService implements IWizardValidationService {
    private agentConfigService?: IAgentConfigService;
    private hookValidationService: HookValidationService;

    constructor(private readonly logger: ExtensionLogger) {
        this.hookValidationService = new HookValidationService();
    }

    setAgentConfigService(service: IAgentConfigService): void {
        this.agentConfigService = service;
    }

    async validateStep(step: WizardStep, stepData: WizardState['stepData']): Promise<ValidationResult> {
        const errors: string[] = [];
        const warnings: string[] = [];

        switch (step) {
            case WizardStep.BasicProperties:
                const basicValidation = await this.validateBasicProperties(stepData.basicProperties);
                errors.push(...basicValidation.errors);
                warnings.push(...(basicValidation.warnings || []));
                break;

            case WizardStep.AgentLocation:
                const locationValidation = this.validateAgentLocation(stepData.agentLocation);
                errors.push(...locationValidation.errors);
                break;

            case WizardStep.ToolsSelection:
                const toolsValidation = this.validateToolsSelection(stepData.toolsSelection);
                errors.push(...toolsValidation.errors);
                warnings.push(...(toolsValidation.warnings || []));
                break;

            case WizardStep.Resources:
                const resourcesValidation = await this.validateResources(stepData.resources);
                errors.push(...resourcesValidation.errors);
                warnings.push(...(resourcesValidation.warnings || []));
                break;

            case WizardStep.HookConfiguration:
                const hookValidation = this.validateHookConfiguration(stepData.hookConfiguration);
                errors.push(...hookValidation.errors);
                warnings.push(...(hookValidation.warnings || []));
                break;

            case WizardStep.Summary:
                // Summary step validation is aggregate of all previous steps
                break;
        }

        const result = {
            isValid: errors.length === 0,
            errors,
            warnings: warnings.length > 0 ? warnings : undefined
        };

        this.logger.debug('Step validation completed', { step, result });
        return result;
    }

    validateField(step: WizardStep, field: string, value: any): ValidationResult {
        const errors: string[] = [];

        switch (step) {
            case WizardStep.BasicProperties:
                if (field === 'name') {
                    if (!value || !value.trim()) {
                        errors.push('Agent name is required');
                    } else if (value.length < 2) {
                        errors.push('Agent name must be at least 2 characters');
                    } else if (!/^[a-zA-Z0-9_-]+$/.test(value)) {
                        errors.push('Agent name can only contain letters, numbers, hyphens, and underscores');
                    }
                }
                // Prompt is now optional - no validation needed
                break;
        }

        return { isValid: errors.length === 0, errors };
    }

    private async validateBasicProperties(data: WizardState['stepData']['basicProperties']): Promise<ValidationResult> {
        const errors: string[] = [];
        const warnings: string[] = [];

        // Name validation (still required)
        const nameValidation = this.validateField(WizardStep.BasicProperties, 'name', data.name);
        errors.push(...nameValidation.errors);

        // Check for duplicate agent names if service is available
        if (this.agentConfigService && data.name.trim()) {
            try {
                const exists = await this.agentConfigService.isAgentNameExists(data.name.trim());
                if (exists) {
                    errors.push(`Agent name '${data.name}' already exists. Please choose a different name.`);
                }
            } catch (error) {
                this.logger.warn('Failed to check agent name uniqueness', error as Error);
                warnings.push('Could not verify agent name uniqueness');
            }
        }

        // Prompt is now optional - no validation needed
        // Description is now unlimited - no validation needed

        return { isValid: errors.length === 0, errors, warnings };
    }

    private validateAgentLocation(data: WizardState['stepData']['agentLocation']): ValidationResult {
        const errors: string[] = [];

        if (!data.location || !['local', 'global'].includes(data.location)) {
            errors.push('Please select a valid agent location');
        }

        return { isValid: errors.length === 0, errors };
    }

    private validateToolsSelection(data: WizardState['stepData']['toolsSelection']): ValidationResult {
        const errors: string[] = [];
        const warnings: string[] = [];

        // Tools selection is optional, but provide warnings for better UX
        const totalTools = data.standardTools.length + data.experimentalTools.length;
        
        if (totalTools === 0) {
            warnings.push('No tools selected. Agent will have limited functionality.');
        }

        if (data.experimentalTools.length > 0) {
            warnings.push('Experimental tools may change or be removed in future versions.');
        }

        return { isValid: errors.length === 0, errors, warnings };
    }

    private async validateResources(data: WizardState['stepData']['resources']): Promise<ValidationResult> {
        const errors: string[] = [];
        const warnings: string[] = [];

        // Validate each resource path
        for (const resource of data.resources) {
            if (!resource.trim()) {
                errors.push('Empty resource path is not allowed');
                continue;
            }

            // Basic path validation
            if (!resource.startsWith('file://')) {
                errors.push(`Resource path must start with 'file://': ${resource}`);
            }

            // Check for invalid characters (excluding * for glob patterns)
            if (/[<>"|?]/.test(resource)) {
                errors.push(`Resource path contains invalid characters: ${resource}`);
            }
        }

        // Check for duplicates
        const uniqueResources = new Set(data.resources);
        if (uniqueResources.size !== data.resources.length) {
            warnings.push('Duplicate resource paths detected');
        }

        return { isValid: errors.length === 0, errors, warnings };
    }

    private validateHookConfiguration(data: HookConfigurationData): ValidationResult {
        // Hook을 건너뛰는 경우 항상 유효
        if (data.skipHooks) {
            return { isValid: true, errors: [] };
        }
        
        // Hook이 없어도 유효 (선택사항)
        if (data.hooks.length === 0) {
            return { isValid: true, errors: [] };
        }
        
        // Hook 목록 유효성 검사
        const hookResult = this.hookValidationService.validateHookList(data.hooks);
        
        return {
            isValid: hookResult.isValid,
            errors: hookResult.errors,
            warnings: hookResult.warnings
        };
    }
}
