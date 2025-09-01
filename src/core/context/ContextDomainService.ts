import { Result, success, failure } from '../../shared/errors/result';
import { IContextRepository } from './IContextRepository';
import { ContextItem, ContextType, ContextMetadata } from './ContextItem';
import { ContextValidationRule } from './ContextValidationRule';

export class ContextDomainService {
    private validationRules: ContextValidationRule[] = [];

    constructor(private repository: IContextRepository) {
        this.initializeDefaultRules();
    }

    async addContextItem(agentName: string, path: string, type: ContextType, metadata?: ContextMetadata): Promise<Result<ContextItem>> {
        // Validate agent name
        const agentValidation = this.validateAgentName(agentName);
        if (!agentValidation.success) {
            return agentValidation;
        }

        // Create context item
        const itemResult = ContextItem.create(path, type, metadata);
        if (!itemResult.success) {
            return itemResult;
        }

        // Apply validation rules
        const ruleValidation = this.applyValidationRules(itemResult.data);
        if (!ruleValidation.success) {
            return ruleValidation;
        }

        // Check if item already exists
        const existsResult = await this.repository.hasContextItem(agentName, path);
        if (!existsResult.success) {
            return failure(existsResult.error);
        }
        if (existsResult.data) {
            return failure(new Error(`Context item '${path}' already exists`));
        }

        // Add to repository
        const addResult = await this.repository.addContextItem(agentName, itemResult.data);
        if (!addResult.success) {
            return failure(addResult.error);
        }

        return success(itemResult.data);
    }

    async removeContextItem(agentName: string, path: string): Promise<Result<void>> {
        const agentValidation = this.validateAgentName(agentName);
        if (!agentValidation.success) {
            return agentValidation;
        }

        const existsResult = await this.repository.hasContextItem(agentName, path);
        if (!existsResult.success) {
            return failure(existsResult.error);
        }
        if (!existsResult.data) {
            return failure(new Error(`Context item '${path}' not found`));
        }

        return this.repository.removeContextItem(agentName, path);
    }

    async getContextItems(agentName: string): Promise<Result<ContextItem[]>> {
        const agentValidation = this.validateAgentName(agentName);
        if (!agentValidation.success) {
            return agentValidation;
        }

        return this.repository.getContextItems(agentName);
    }

    async clearContext(agentName: string): Promise<Result<void>> {
        const agentValidation = this.validateAgentName(agentName);
        if (!agentValidation.success) {
            return agentValidation;
        }

        return this.repository.clearContext(agentName);
    }

    validateContextPath(path: string, type: ContextType): Result<void> {
        if (!path || path.trim().length === 0) {
            return failure(new Error('Context path is required'));
        }

        if (path.length > 500) {
            return failure(new Error('Context path must be 500 characters or less'));
        }

        if (type === ContextType.FILE && path.includes('*')) {
            return failure(new Error('File paths cannot contain wildcards'));
        }

        if (type === ContextType.DIRECTORY && !path.endsWith('/')) {
            return failure(new Error('Directory paths should end with /'));
        }

        return success(undefined);
    }

    addValidationRule(rule: ContextValidationRule): void {
        this.validationRules.push(rule);
    }

    private validateAgentName(agentName: string): Result<void> {
        if (!agentName || agentName.trim().length === 0) {
            return failure(new Error('Agent name is required'));
        }
        return success(undefined);
    }

    private applyValidationRules(item: ContextItem): Result<ContextItem> {
        for (const rule of this.validationRules) {
            if (!rule.pattern.test(item.path)) {
                if (rule.severity === 'error') {
                    return failure(new Error(rule.message));
                }
                // For warnings, we could log but continue
            }
        }
        return success(item);
    }

    private initializeDefaultRules(): void {
        this.validationRules = [
            {
                pattern: /^[^<>:"|?*]+$/,
                message: 'Path contains invalid characters',
                severity: 'error'
            },
            {
                pattern: /^(?!.*\/\.\.\/)/,
                message: 'Path traversal not allowed',
                severity: 'error'
            }
        ];
    }
}
