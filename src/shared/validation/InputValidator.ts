import { TypeGuards } from './TypeGuards';
import { Result, success, failure } from '../errors/result';

export class InputValidator {
    static validateAgentName(name: unknown): Result<string> {
        if (!TypeGuards.isString(name)) {
            return failure(new Error('Agent name must be a string'));
        }

        if (!TypeGuards.isNonEmptyString(name)) {
            return failure(new Error('Agent name cannot be empty'));
        }

        if (!TypeGuards.isValidAgentName(name)) {
            return failure(new Error('Agent name can only contain letters, numbers, hyphens, and underscores'));
        }

        if (name.length > 50) {
            return failure(new Error('Agent name cannot exceed 50 characters'));
        }

        return success(name);
    }

    static validateFilePath(path: unknown): Result<string> {
        if (!TypeGuards.isString(path)) {
            return failure(new Error('File path must be a string'));
        }

        if (!TypeGuards.isNonEmptyString(path)) {
            return failure(new Error('File path cannot be empty'));
        }

        if (!TypeGuards.isValidPath(path)) {
            return failure(new Error('File path contains invalid characters'));
        }

        return success(path);
    }

    static validateAgentDescription(description: unknown): Result<string> {
        if (!TypeGuards.isString(description)) {
            return failure(new Error('Description must be a string'));
        }

        if (description.length > 500) {
            return failure(new Error('Description cannot exceed 500 characters'));
        }

        return success(description);
    }

    static validateToolsList(tools: unknown): Result<string[]> {
        if (!TypeGuards.isArray(tools)) {
            return failure(new Error('Tools must be an array'));
        }

        if (!TypeGuards.isStringArray(tools)) {
            return failure(new Error('All tools must be strings'));
        }

        // Validate each tool name
        for (const tool of tools) {
            if (!TypeGuards.isNonEmptyString(tool)) {
                return failure(new Error('Tool names cannot be empty'));
            }

            if (!/^[a-zA-Z0-9_-]+$/.test(tool)) {
                return failure(new Error(`Invalid tool name: ${tool}`));
            }
        }

        // Check for duplicates
        const uniqueTools = new Set(tools);
        if (uniqueTools.size !== tools.length) {
            return failure(new Error('Duplicate tools are not allowed'));
        }

        return success(tools);
    }

    static validateResourcesList(resources: unknown): Result<string[]> {
        if (!TypeGuards.isArray(resources)) {
            return failure(new Error('Resources must be an array'));
        }

        if (!TypeGuards.isStringArray(resources)) {
            return failure(new Error('All resources must be strings'));
        }

        // Validate each resource path
        for (const resource of resources) {
            const pathResult = this.validateFilePath(resource);
            if (!pathResult.success) {
                return failure(new Error(`Invalid resource path: ${resource} - ${pathResult.error.message}`));
            }
        }

        return success(resources);
    }

    static validateMcpServers(mcpServers: unknown): Result<Record<string, any>> {
        if (!TypeGuards.isObject(mcpServers)) {
            return failure(new Error('MCP servers must be an object'));
        }

        // Validate server names and configurations
        for (const [serverName, config] of Object.entries(mcpServers)) {
            if (!TypeGuards.isValidAgentName(serverName)) {
                return failure(new Error(`Invalid MCP server name: ${serverName}`));
            }

            if (!TypeGuards.isObject(config)) {
                return failure(new Error(`MCP server configuration must be an object: ${serverName}`));
            }
        }

        return success(mcpServers as Record<string, any>);
    }

    static validateToolAliases(aliases: unknown): Result<Record<string, string>> {
        if (!TypeGuards.isObject(aliases)) {
            return failure(new Error('Tool aliases must be an object'));
        }

        for (const [alias, target] of Object.entries(aliases)) {
            if (!TypeGuards.isString(target)) {
                return failure(new Error(`Tool alias target must be a string: ${alias}`));
            }

            if (!TypeGuards.isNonEmptyString(target)) {
                return failure(new Error(`Tool alias target cannot be empty: ${alias}`));
            }
        }

        return success(aliases as Record<string, string>);
    }

    static validateJsonString(json: unknown, fieldName: string): Result<any> {
        if (!TypeGuards.isString(json)) {
            return failure(new Error(`${fieldName} must be a string`));
        }

        if (!TypeGuards.isValidJsonString(json)) {
            return failure(new Error(`${fieldName} must be valid JSON`));
        }

        try {
            const parsed = JSON.parse(json);
            return success(parsed);
        } catch (error) {
            return failure(new Error(`Failed to parse ${fieldName}: ${(error as Error).message}`));
        }
    }

    static validateRequired<T>(value: T | null | undefined, fieldName: string): Result<T> {
        if (value === null || value === undefined) {
            return failure(new Error(`${fieldName} is required`));
        }

        return success(value);
    }

    static validateStringLength(
        value: unknown, 
        fieldName: string, 
        minLength = 0, 
        maxLength = Infinity
    ): Result<string> {
        if (!TypeGuards.isString(value)) {
            return failure(new Error(`${fieldName} must be a string`));
        }

        if (value.length < minLength) {
            return failure(new Error(`${fieldName} must be at least ${minLength} characters long`));
        }

        if (value.length > maxLength) {
            return failure(new Error(`${fieldName} cannot exceed ${maxLength} characters`));
        }

        return success(value);
    }

    static validateArrayLength<T>(
        value: unknown,
        fieldName: string,
        minLength = 0,
        maxLength = Infinity
    ): Result<T[]> {
        if (!TypeGuards.isArray(value)) {
            return failure(new Error(`${fieldName} must be an array`));
        }

        if (value.length < minLength) {
            return failure(new Error(`${fieldName} must have at least ${minLength} items`));
        }

        if (value.length > maxLength) {
            return failure(new Error(`${fieldName} cannot have more than ${maxLength} items`));
        }

        return success(value as T[]);
    }
}
