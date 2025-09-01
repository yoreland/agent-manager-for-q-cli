import { AgentConfig } from '../../core/agent/Agent';
import { TypeGuards } from './TypeGuards';
import { InputValidator } from './InputValidator';
import { Result, success, failure } from '../errors/result';

export class ConfigurationValidator {
    static validateAgentConfig(config: unknown): Result<AgentConfig> {
        if (!TypeGuards.isObject(config)) {
            return failure(new Error('Agent configuration must be an object'));
        }

        const errors: string[] = [];
        const validatedConfig = {} as AgentConfig;

        // Validate $schema
        if (!TypeGuards.hasStringProperty(config, '$schema')) {
            errors.push('$schema is required and must be a string');
        } else {
            validatedConfig.$schema = config.$schema;
        }

        // Validate name
        const nameResult = InputValidator.validateRequired(config.name, 'name');
        if (!nameResult.success) {
            errors.push(nameResult.error.message);
        } else {
            const nameValidation = InputValidator.validateAgentName(nameResult.data);
            if (!nameValidation.success) {
                errors.push(nameValidation.error.message);
            } else {
                validatedConfig.name = nameValidation.data;
            }
        }

        // Validate description
        const descResult = InputValidator.validateRequired(config.description, 'description');
        if (!descResult.success) {
            errors.push(descResult.error.message);
        } else {
            const descValidation = InputValidator.validateAgentDescription(descResult.data);
            if (!descValidation.success) {
                errors.push(descValidation.error.message);
            } else {
                validatedConfig.description = descValidation.data;
            }
        }

        // Validate prompt (optional)
        if (config.prompt !== null && config.prompt !== undefined) {
            if (!TypeGuards.isString(config.prompt)) {
                errors.push('prompt must be a string or null');
            } else {
                validatedConfig.prompt = config.prompt;
            }
        } else {
            validatedConfig.prompt = null;
        }

        // Validate tools
        const toolsValidation = InputValidator.validateToolsList(config.tools || []);
        if (!toolsValidation.success) {
            errors.push(toolsValidation.error.message);
        } else {
            validatedConfig.tools = toolsValidation.data;
        }

        // Validate allowedTools
        const allowedToolsValidation = InputValidator.validateToolsList(config.allowedTools || []);
        if (!allowedToolsValidation.success) {
            errors.push(allowedToolsValidation.error.message);
        } else {
            validatedConfig.allowedTools = allowedToolsValidation.data;
        }

        // Validate resources
        const resourcesValidation = InputValidator.validateResourcesList(config.resources || []);
        if (!resourcesValidation.success) {
            errors.push(resourcesValidation.error.message);
        } else {
            validatedConfig.resources = resourcesValidation.data;
        }

        // Validate mcpServers
        const mcpValidation = InputValidator.validateMcpServers(config.mcpServers || {});
        if (!mcpValidation.success) {
            errors.push(mcpValidation.error.message);
        } else {
            validatedConfig.mcpServers = mcpValidation.data;
        }

        // Validate toolAliases
        const aliasesValidation = InputValidator.validateToolAliases(config.toolAliases || {});
        if (!aliasesValidation.success) {
            errors.push(aliasesValidation.error.message);
        } else {
            validatedConfig.toolAliases = aliasesValidation.data;
        }

        // Validate hooks
        if (!TypeGuards.isObject(config.hooks)) {
            validatedConfig.hooks = {};
        } else {
            validatedConfig.hooks = config.hooks as Record<string, any>;
        }

        // Validate toolsSettings
        if (!TypeGuards.isObject(config.toolsSettings)) {
            validatedConfig.toolsSettings = {};
        } else {
            validatedConfig.toolsSettings = config.toolsSettings as Record<string, any>;
        }

        // Validate useLegacyMcpJson
        if (!TypeGuards.isBoolean(config.useLegacyMcpJson)) {
            validatedConfig.useLegacyMcpJson = false;
        } else {
            validatedConfig.useLegacyMcpJson = config.useLegacyMcpJson;
        }

        if (errors.length > 0) {
            return failure(new Error(`Configuration validation failed: ${errors.join(', ')}`));
        }

        return success(validatedConfig);
    }

    static validatePartialAgentConfig(config: unknown): Result<Partial<AgentConfig>> {
        if (!TypeGuards.isObject(config)) {
            return failure(new Error('Configuration must be an object'));
        }

        const errors: string[] = [];
        const validatedConfig: Partial<AgentConfig> = {};

        // Validate name if present
        if (config.name !== undefined) {
            const nameValidation = InputValidator.validateAgentName(config.name);
            if (!nameValidation.success) {
                errors.push(nameValidation.error.message);
            } else {
                validatedConfig.name = nameValidation.data;
            }
        }

        // Validate description if present
        if (config.description !== undefined) {
            const descValidation = InputValidator.validateAgentDescription(config.description);
            if (!descValidation.success) {
                errors.push(descValidation.error.message);
            } else {
                validatedConfig.description = descValidation.data;
            }
        }

        // Validate prompt if present
        if (config.prompt !== undefined) {
            if (config.prompt !== null && !TypeGuards.isString(config.prompt)) {
                errors.push('prompt must be a string or null');
            } else {
                validatedConfig.prompt = config.prompt as string | null;
            }
        }

        // Validate tools if present
        if (config.tools !== undefined) {
            const toolsValidation = InputValidator.validateToolsList(config.tools);
            if (!toolsValidation.success) {
                errors.push(toolsValidation.error.message);
            } else {
                validatedConfig.tools = toolsValidation.data;
            }
        }

        // Validate other fields similarly...
        if (config.allowedTools !== undefined) {
            const allowedToolsValidation = InputValidator.validateToolsList(config.allowedTools);
            if (!allowedToolsValidation.success) {
                errors.push(allowedToolsValidation.error.message);
            } else {
                validatedConfig.allowedTools = allowedToolsValidation.data;
            }
        }

        if (config.resources !== undefined) {
            const resourcesValidation = InputValidator.validateResourcesList(config.resources);
            if (!resourcesValidation.success) {
                errors.push(resourcesValidation.error.message);
            } else {
                validatedConfig.resources = resourcesValidation.data;
            }
        }

        if (errors.length > 0) {
            return failure(new Error(`Partial configuration validation failed: ${errors.join(', ')}`));
        }

        return success(validatedConfig);
    }

    static validateConfigurationFile(content: string): Result<AgentConfig> {
        // First validate JSON
        const jsonResult = InputValidator.validateJsonString(content, 'configuration file');
        if (!jsonResult.success) {
            return failure(jsonResult.error);
        }

        // Then validate the configuration structure
        return this.validateAgentConfig(jsonResult.data);
    }

    static getValidationSummary(config: unknown): ValidationSummary {
        const result = this.validateAgentConfig(config);
        
        return {
            isValid: result.success,
            errors: result.success ? [] : [result.error.message],
            warnings: this.getValidationWarnings(config)
        };
    }

    private static getValidationWarnings(config: unknown): string[] {
        const warnings: string[] = [];

        if (!TypeGuards.isObject(config)) {
            return warnings;
        }

        // Check for empty arrays
        if (TypeGuards.isArray(config.tools) && config.tools.length === 0) {
            warnings.push('No tools specified - agent may have limited functionality');
        }

        if (TypeGuards.isArray(config.resources) && config.resources.length === 0) {
            warnings.push('No resources specified - agent will have no context');
        }

        // Check for missing description
        if (!config.description || (TypeGuards.isString(config.description) && config.description.trim().length === 0)) {
            warnings.push('Missing or empty description');
        }

        return warnings;
    }
}

export interface ValidationSummary {
    isValid: boolean;
    errors: string[];
    warnings: string[];
}
