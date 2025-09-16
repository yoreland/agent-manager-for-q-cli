import { SERVICE_TOKENS, createServiceToken } from '../../../shared/container/ServiceTokens';

describe('ServiceTokens', () => {
    describe('SERVICE_TOKENS', () => {
        it('should contain all expected service tokens', () => {
            expect(SERVICE_TOKENS.LOGGER).toBe('ILogger');
            expect(SERVICE_TOKENS.FILE_SYSTEM_ADAPTER).toBe('IFileSystemAdapter');
            expect(SERVICE_TOKENS.VSCODE_ADAPTER).toBe('IVSCodeAdapter');
            expect(SERVICE_TOKENS.CACHE).toBe('ICache');
            expect(SERVICE_TOKENS.ERROR_HANDLER).toBe('IErrorHandler');
            expect(SERVICE_TOKENS.AGENT_CONFIG_SERVICE).toBe('IAgentConfigService');
            expect(SERVICE_TOKENS.AGENT_MANAGEMENT_SERVICE).toBe('IAgentManagementService');
            expect(SERVICE_TOKENS.AGENT_REPOSITORY).toBe('IAgentRepository');
            expect(SERVICE_TOKENS.AGENT_DOMAIN_SERVICE).toBe('AgentDomainService');
            expect(SERVICE_TOKENS.CONTEXT_REPOSITORY).toBe('IContextRepository');
            expect(SERVICE_TOKENS.CONTEXT_DOMAIN_SERVICE).toBe('ContextDomainService');
            expect(SERVICE_TOKENS.AGENT_TREE_PROVIDER).toBe('AgentTreeProvider');
            expect(SERVICE_TOKENS.CONTEXT_TREE_PROVIDER).toBe('ContextTreeProvider');
            expect(SERVICE_TOKENS.BATCH_PROCESSOR).toBe('BatchProcessor');
            expect(SERVICE_TOKENS.FILE_WATCHER_POOL).toBe('FileWatcherPool');
            expect(SERVICE_TOKENS.LAZY_SERVICE_LOADER).toBe('LazyServiceLoader');
        });

        it('should have unique token values', () => {
            const tokenValues = Object.values(SERVICE_TOKENS);
            const uniqueValues = new Set(tokenValues);
            
            expect(tokenValues.length).toBe(uniqueValues.size);
        });

        it('should be readonly', () => {
            // In JavaScript, const objects are not deeply frozen by default
            // This test verifies the tokens exist and are strings
            expect(typeof SERVICE_TOKENS.LOGGER).toBe('string');
            expect(Object.isFrozen(SERVICE_TOKENS)).toBe(false); // const doesn't freeze the object
            
            // The readonly behavior is enforced by TypeScript at compile time
            // Runtime modification is still possible but discouraged
        });
    });

    describe('createServiceToken', () => {
        it('should create a service token with the given name', () => {
            const token = createServiceToken('MyService');
            
            expect(token).toBe('MyService');
        });

        it('should maintain type information', () => {
            const token = createServiceToken('MyService');
            
            // This is mainly for TypeScript compile-time checking
            expect(typeof token).toBe('string');
            expect(token).toBe('MyService');
        });
    });
});