import { IDependencyContainer } from './IDependencyContainer';
import { SERVICE_TOKENS } from './ServiceTokens';

/**
 * Container configuration for registering all application services
 */
export class ContainerConfiguration {
    /**
     * Configure the dependency injection container with all services
     */
    static configure(container: IDependencyContainer): void {
        // Register core infrastructure services
        this.registerInfrastructureServices(container);
        
        // Register domain services
        this.registerDomainServices(container);
        
        // Register presentation layer services
        this.registerPresentationServices(container);
    }

    /**
     * Register infrastructure layer services
     */
    private static registerInfrastructureServices(container: IDependencyContainer): void {
        // Logger - will be implemented in future tasks
        container.register(SERVICE_TOKENS.LOGGER, () => {
            // Placeholder - will be replaced with actual implementation
            return {
                info: (message: string) => console.log(`[INFO] ${message}`),
                warn: (message: string) => console.warn(`[WARN] ${message}`),
                error: (message: string) => console.error(`[ERROR] ${message}`),
                debug: (message: string) => console.debug(`[DEBUG] ${message}`)
            };
        });

        // File System Adapter - will be implemented in future tasks
        container.register(SERVICE_TOKENS.FILE_SYSTEM_ADAPTER, () => {
            // Placeholder - will be replaced with actual implementation
            return {};
        });

        // VS Code Adapter - will be implemented in future tasks
        container.register(SERVICE_TOKENS.VSCODE_ADAPTER, () => {
            // Placeholder - will be replaced with actual implementation
            return {};
        });

        // Cache - will be implemented in future tasks
        container.register(SERVICE_TOKENS.CACHE, () => {
            // Placeholder - will be replaced with actual implementation
            return {};
        });

        // Error Handler - will be implemented in future tasks
        container.register(SERVICE_TOKENS.ERROR_HANDLER, () => {
            // Placeholder - will be replaced with actual implementation
            return {};
        });
    }

    /**
     * Register domain layer services
     */
    private static registerDomainServices(container: IDependencyContainer): void {
        // Agent Domain Services - will be implemented in future tasks
        container.register(SERVICE_TOKENS.AGENT_REPOSITORY, () => {
            // Placeholder - will be replaced with actual implementation
            return {};
        });

        container.register(SERVICE_TOKENS.AGENT_DOMAIN_SERVICE, () => {
            const repository = container.resolve(SERVICE_TOKENS.AGENT_REPOSITORY);
            // Placeholder - will be replaced with actual implementation
            return { repository };
        });

        // Context Domain Services - will be implemented in future tasks
        container.register(SERVICE_TOKENS.CONTEXT_REPOSITORY, () => {
            // Placeholder - will be replaced with actual implementation
            return {};
        });

        container.register(SERVICE_TOKENS.CONTEXT_DOMAIN_SERVICE, () => {
            const repository = container.resolve(SERVICE_TOKENS.CONTEXT_REPOSITORY);
            // Placeholder - will be replaced with actual implementation
            return { repository };
        });
    }

    /**
     * Register presentation layer services
     */
    private static registerPresentationServices(container: IDependencyContainer): void {
        // Existing services - will be migrated to use DI in future tasks
        container.register(SERVICE_TOKENS.AGENT_CONFIG_SERVICE, () => {
            // Import existing service when migrating
            // const { AgentConfigService } = require('../../services/agentConfigService');
            // return new AgentConfigService();
            return {};
        });

        container.register(SERVICE_TOKENS.AGENT_MANAGEMENT_SERVICE, () => {
            // Import existing service when migrating
            // const { AgentManagementService } = require('../../services/agentManagementService');
            // return new AgentManagementService();
            return {};
        });

        // Tree Providers - will be migrated in future tasks
        container.register(SERVICE_TOKENS.AGENT_TREE_PROVIDER, () => {
            // Import existing provider when migrating
            // const { AgentTreeProvider } = require('../../providers/agentTreeProvider');
            // return new AgentTreeProvider();
            return {};
        });

        container.register(SERVICE_TOKENS.CONTEXT_TREE_PROVIDER, () => {
            // Import existing provider when migrating
            // const { ContextTreeProvider } = require('../../providers/contextTreeProvider');
            // return new ContextTreeProvider();
            return {};
        });
    }


}