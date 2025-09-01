import { IAgentRepository } from '../core/agent/IAgentRepository';
import { AgentDomainService } from '../core/agent/AgentDomainService';
import { Agent, AgentConfig } from '../core/agent/Agent';
import { AgentConfigBuilder } from '../core/agent/AgentConfigBuilder';
import { BUILT_IN_TEMPLATES } from '../core/agent/AgentTemplate';
import { Result } from '../shared/errors/result';
import { ILogger } from '../shared/infrastructure/ILogger';

export class RefactoredAgentConfigService {
    constructor(
        private agentRepository: IAgentRepository,
        private agentDomainService: AgentDomainService,
        private logger: ILogger
    ) {}

    async getAllAgents(): Promise<Result<Agent[]>> {
        this.logger.debug('Getting all agents');
        return this.agentRepository.findAll();
    }

    async getAgent(name: string): Promise<Result<Agent | null>> {
        this.logger.debug('Getting agent', { name });
        return this.agentRepository.findByName(name);
    }

    async createAgent(name: string, templateName?: string): Promise<Result<Agent>> {
        this.logger.info('Creating agent', { name, templateName });
        
        const template = templateName ? BUILT_IN_TEMPLATES.find(t => t.name === templateName) : undefined;
        const result = await this.agentDomainService.createAgent(name, template);
        
        if (result.success) {
            this.logger.info('Agent created successfully', { name });
        } else {
            this.logger.error('Failed to create agent', result.error, { name });
        }
        
        return result;
    }

    async updateAgent(name: string, updates: Partial<AgentConfig>): Promise<Result<Agent>> {
        this.logger.info('Updating agent', { name, updates: Object.keys(updates) });
        
        const result = await this.agentDomainService.updateAgent(name, updates);
        
        if (result.success) {
            this.logger.info('Agent updated successfully', { name });
        } else {
            this.logger.error('Failed to update agent', result.error, { name });
        }
        
        return result;
    }

    async deleteAgent(name: string): Promise<Result<void>> {
        this.logger.info('Deleting agent', { name });
        
        const result = await this.agentDomainService.deleteAgent(name);
        
        if (result.success) {
            this.logger.info('Agent deleted successfully', { name });
        } else {
            this.logger.error('Failed to delete agent', result.error, { name });
        }
        
        return result;
    }

    async agentExists(name: string): Promise<Result<boolean>> {
        return this.agentRepository.exists(name);
    }

    validateAgentName(name: string): Result<void> {
        return this.agentDomainService.validateAgentName(name);
    }

    createAgentConfig(name: string): AgentConfig {
        return AgentConfigBuilder.create(name)
            .withDescription(`${name} agent`)
            .build();
    }

    getAvailableTemplates() {
        return BUILT_IN_TEMPLATES;
    }
}
