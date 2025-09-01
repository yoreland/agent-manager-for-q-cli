/**
 * Service tokens for type-safe dependency injection
 * These tokens are used to register and resolve services from the container
 */

// Core services
export const SERVICE_TOKENS = {
    // Logging
    LOGGER: 'ILogger',
    
    // File System
    FILE_SYSTEM_ADAPTER: 'IFileSystemAdapter',
    
    // VS Code Integration
    VSCODE_ADAPTER: 'IVSCodeAdapter',
    
    // Caching
    CACHE: 'ICache',
    
    // Error Handling
    ERROR_HANDLER: 'IErrorHandler',
    
    // Agent Management
    AGENT_CONFIG_SERVICE: 'IAgentConfigService',
    AGENT_MANAGEMENT_SERVICE: 'IAgentManagementService',
    AGENT_REPOSITORY: 'IAgentRepository',
    AGENT_DOMAIN_SERVICE: 'AgentDomainService',
    
    // Context Management
    CONTEXT_REPOSITORY: 'IContextRepository',
    CONTEXT_DOMAIN_SERVICE: 'ContextDomainService',
    
    // Tree Providers
    AGENT_TREE_PROVIDER: 'AgentTreeProvider',
    CONTEXT_TREE_PROVIDER: 'ContextTreeProvider',
    
    // Performance
    BATCH_PROCESSOR: 'BatchProcessor',
    FILE_WATCHER_POOL: 'FileWatcherPool',
    LAZY_SERVICE_LOADER: 'LazyServiceLoader'
} as const;

/**
 * Type-safe service token type
 */
export type ServiceToken = typeof SERVICE_TOKENS[keyof typeof SERVICE_TOKENS];

/**
 * Helper function to create typed service tokens
 */
export function createServiceToken(name: string): string {
    return name;
}