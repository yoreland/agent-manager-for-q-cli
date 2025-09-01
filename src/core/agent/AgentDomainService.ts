import { Result, success, failure } from '../../shared/errors/result';
import { IAgentRepository } from './IAgentRepository';
import { Agent, AgentConfig } from './Agent';
import { AgentTemplate } from './AgentTemplate';

export class AgentDomainService {
    constructor(private repository: IAgentRepository) {}

    async createAgent(name: string, template?: AgentTemplate): Promise<Result<Agent>> {
        // Validate agent name
        const nameValidation = this.validateAgentName(name);
        if (!nameValidation.success) {
            return nameValidation;
        }

        // Check if agent already exists
        const existsResult = await this.repository.exists(name);
        if (!existsResult.success) {
            return failure(existsResult.error);
        }
        if (existsResult.data) {
            return failure(new Error(`Agent '${name}' already exists`));
        }

        // Create agent with template
        const filePath = this.getAgentFilePath(name);
        const config = template ? this.applyTemplate(name, template) : undefined;
        
        const agentResult = Agent.create(name, filePath, config);
        if (!agentResult.success) {
            return agentResult;
        }

        // Save agent
        const saveResult = await this.repository.save(agentResult.data);
        if (!saveResult.success) {
            return failure(saveResult.error);
        }

        return success(agentResult.data);
    }

    validateAgentName(name: string): Result<void> {
        if (!name || name.trim().length === 0) {
            return failure(new Error('Agent name is required'));
        }

        if (name.length > 50) {
            return failure(new Error('Agent name must be 50 characters or less'));
        }

        if (!/^[a-zA-Z0-9_-]+$/.test(name)) {
            return failure(new Error('Agent name can only contain letters, numbers, hyphens, and underscores'));
        }

        if (name.startsWith('-') || name.endsWith('-')) {
            return failure(new Error('Agent name cannot start or end with a hyphen'));
        }

        return success(undefined);
    }

    async updateAgent(name: string, updates: Partial<AgentConfig>): Promise<Result<Agent>> {
        const findResult = await this.repository.findByName(name);
        if (!findResult.success) {
            return failure(findResult.error);
        }
        if (!findResult.data) {
            return failure(new Error(`Agent '${name}' not found`));
        }

        const updatedAgent = findResult.data.updateConfig(updates);
        const validation = updatedAgent.validate();
        if (!validation.isValid) {
            return failure(new Error(`Invalid agent: ${validation.errors.join(', ')}`));
        }

        const saveResult = await this.repository.save(updatedAgent);
        if (!saveResult.success) {
            return failure(saveResult.error);
        }

        return success(updatedAgent);
    }

    async deleteAgent(name: string): Promise<Result<void>> {
        const existsResult = await this.repository.exists(name);
        if (!existsResult.success) {
            return failure(existsResult.error);
        }
        if (!existsResult.data) {
            return failure(new Error(`Agent '${name}' not found`));
        }

        return this.repository.delete(name);
    }

    private applyTemplate(name: string, template: AgentTemplate): Partial<AgentConfig> {
        return {
            description: template.description || `${name} agent`,
            tools: template.tools || [],
            allowedTools: template.allowedTools || [],
            resources: template.resources || [],
            prompt: template.prompt || null
        };
    }

    private getAgentFilePath(name: string): string {
        return `.amazonq/cli-agents/${name}.json`;
    }
}
