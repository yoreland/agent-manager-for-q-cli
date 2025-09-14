import { IAgentRepository } from '../../domain/agent/IAgentRepository';
import { IContextRepository } from '../../domain/context/IContextRepository';
import { ICache } from '../vscode/ICache';
import { ILogger } from '../vscode/ILogger';
import { BatchProcessor } from '../../infrastructure/BatchProcessor';

export class CacheWarmer {
    private batchProcessor: BatchProcessor<string, void>;

    constructor(
        private agentRepository: IAgentRepository,
        private contextRepository: IContextRepository,
        private agentCache: ICache,
        private logger: ILogger
    ) {
        this.batchProcessor = new BatchProcessor(
            this.warmAgentsBatch.bind(this),
            this.logger,
            5, // batch size
            100 // delay ms
        );
    }

    async warmFrequentlyAccessedData(): Promise<void> {
        this.logger.info('Starting cache warming');

        try {
            // Warm agent configurations
            await this.warmAgentConfigurations();

            // Warm frequently accessed context data
            await this.warmContextData();

            this.logger.info('Cache warming completed');
        } catch (error) {
            this.logger.error('Cache warming failed', error as Error);
        }
    }

    private async warmAgentConfigurations(): Promise<void> {
        const agentsResult = await this.agentRepository.findAll();
        if (!agentsResult.success) {
            this.logger.warn('Failed to load agents for cache warming', { error: agentsResult.error.message });
            return;
        }

        const agentNames = agentsResult.data.map(agent => agent.name);
        
        // Use batch processor to warm caches
        const promises = agentNames.map(name => this.batchProcessor.add(name));
        await Promise.all(promises);

        this.logger.debug('Agent configurations warmed', { count: agentNames.length });
    }

    private async warmContextData(): Promise<void> {
        // Get list of agents to warm their context
        const agentsResult = await this.agentRepository.findAll();
        if (!agentsResult.success) {return;}

        for (const agent of agentsResult.data) {
            try {
                const contextResult = await this.contextRepository.getContextItems(agent.name);
                if (contextResult.success) {
                    // Context is now cached
                    this.logger.debug('Context warmed for agent', { agentName: agent.name });
                }
            } catch (error) {
                this.logger.warn('Failed to warm context for agent', { agentName: agent.name, error });
            }
        }
    }

    private async warmAgentsBatch(agentNames: string[]): Promise<void[]> {
        const results: void[] = [];

        for (const agentName of agentNames) {
            try {
                // Load agent to cache it
                const agentResult = await this.agentRepository.findByName(agentName);
                if (agentResult.success && agentResult.data) {
                    // Store in cache with longer TTL for frequently accessed data
                    await this.agentCache.set(agentName, agentResult.data, 600000); // 10 minutes
                }
                results.push();
            } catch (error) {
                this.logger.warn('Failed to warm agent cache', { agentName, error });
                results.push();
            }
        }

        return results;
    }

    dispose(): void {
        this.batchProcessor.dispose();
    }
}
