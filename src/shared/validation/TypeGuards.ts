import { AgentConfig } from '../../core/agent/Agent';
import { ContextItem, ContextType } from '../../core/context/ContextItem';

export class TypeGuards {
    static isString(value: unknown): value is string {
        return typeof value === 'string';
    }

    static isNumber(value: unknown): value is number {
        return typeof value === 'number' && !isNaN(value);
    }

    static isBoolean(value: unknown): value is boolean {
        return typeof value === 'boolean';
    }

    static isObject(value: unknown): value is Record<string, unknown> {
        return typeof value === 'object' && value !== null && !Array.isArray(value);
    }

    static isArray(value: unknown): value is unknown[] {
        return Array.isArray(value);
    }

    static isStringArray(value: unknown): value is string[] {
        return this.isArray(value) && value.every(item => this.isString(item));
    }

    static isAgentConfig(value: unknown): value is AgentConfig {
        if (!this.isObject(value)) return false;

        const config = value as Record<string, unknown>;
        
        return (
            this.isString(config.$schema) &&
            this.isString(config.name) &&
            this.isString(config.description) &&
            (config.prompt === null || this.isString(config.prompt)) &&
            this.isObject(config.mcpServers) &&
            this.isStringArray(config.tools) &&
            this.isObject(config.toolAliases) &&
            this.isStringArray(config.allowedTools) &&
            this.isStringArray(config.resources) &&
            this.isObject(config.hooks) &&
            this.isObject(config.toolsSettings) &&
            this.isBoolean(config.useLegacyMcpJson)
        );
    }

    static isContextType(value: unknown): value is ContextType {
        return this.isString(value) && 
               Object.values(ContextType).includes(value as ContextType);
    }

    static isContextItem(value: unknown): value is ContextItem {
        if (!this.isObject(value)) return false;

        const item = value as Record<string, unknown>;
        
        return (
            this.isString(item.path) &&
            this.isContextType(item.type) &&
            (item.metadata === undefined || this.isObject(item.metadata))
        );
    }

    static isValidPath(value: unknown): value is string {
        if (!this.isString(value)) return false;
        
        // Basic path validation
        const pathRegex = /^[^\0<>:"|?*]+$/;
        return pathRegex.test(value) && value.length > 0;
    }

    static isValidAgentName(value: unknown): value is string {
        if (!this.isString(value)) return false;
        
        // Agent name validation: alphanumeric, hyphens, underscores
        const nameRegex = /^[a-zA-Z0-9_-]+$/;
        return nameRegex.test(value) && value.length >= 1 && value.length <= 50;
    }

    static isValidUrl(value: unknown): value is string {
        if (!this.isString(value)) return false;
        
        try {
            new URL(value);
            return true;
        } catch {
            return false;
        }
    }

    static isValidEmail(value: unknown): value is string {
        if (!this.isString(value)) return false;
        
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(value);
    }

    static isNonEmptyString(value: unknown): value is string {
        return this.isString(value) && value.trim().length > 0;
    }

    static isPositiveNumber(value: unknown): value is number {
        return this.isNumber(value) && value > 0;
    }

    static isNonNegativeNumber(value: unknown): value is number {
        return this.isNumber(value) && value >= 0;
    }

    static isValidJsonString(value: unknown): value is string {
        if (!this.isString(value)) return false;
        
        try {
            JSON.parse(value);
            return true;
        } catch {
            return false;
        }
    }

    static hasProperty<T extends Record<string, unknown>, K extends string>(
        obj: T,
        key: K
    ): obj is T & Record<K, unknown> {
        return key in obj;
    }

    static hasStringProperty<T extends Record<string, unknown>, K extends string>(
        obj: T,
        key: K
    ): obj is T & Record<K, string> {
        return this.hasProperty(obj, key) && this.isString(obj[key]);
    }

    static hasNumberProperty<T extends Record<string, unknown>, K extends string>(
        obj: T,
        key: K
    ): obj is T & Record<K, number> {
        return this.hasProperty(obj, key) && this.isNumber(obj[key]);
    }
}
