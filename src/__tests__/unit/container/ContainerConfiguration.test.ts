import { DependencyContainer } from '../../../shared/container/DependencyContainer';
import { ContainerConfiguration } from '../../../shared/container/ContainerConfiguration';
import { SERVICE_TOKENS } from '../../../shared/container/ServiceTokens';

describe('ContainerConfiguration', () => {
    let container: DependencyContainer;

    beforeEach(() => {
        container = new DependencyContainer();
    });

    afterEach(() => {
        container.dispose();
    });

    describe('configure', () => {
        it('should register all core services', () => {
            ContainerConfiguration.configure(container);

            // Verify infrastructure services are registered
            expect(container.isRegistered(SERVICE_TOKENS.LOGGER)).toBe(true);
            expect(container.isRegistered(SERVICE_TOKENS.FILE_SYSTEM_ADAPTER)).toBe(true);
            expect(container.isRegistered(SERVICE_TOKENS.VSCODE_ADAPTER)).toBe(true);
            expect(container.isRegistered(SERVICE_TOKENS.CACHE)).toBe(true);
            expect(container.isRegistered(SERVICE_TOKENS.ERROR_HANDLER)).toBe(true);

            // Verify domain services are registered
            expect(container.isRegistered(SERVICE_TOKENS.AGENT_REPOSITORY)).toBe(true);
            expect(container.isRegistered(SERVICE_TOKENS.AGENT_DOMAIN_SERVICE)).toBe(true);
            expect(container.isRegistered(SERVICE_TOKENS.CONTEXT_REPOSITORY)).toBe(true);
            expect(container.isRegistered(SERVICE_TOKENS.CONTEXT_DOMAIN_SERVICE)).toBe(true);

            // Verify presentation services are registered
            expect(container.isRegistered(SERVICE_TOKENS.AGENT_CONFIG_SERVICE)).toBe(true);
            expect(container.isRegistered(SERVICE_TOKENS.AGENT_MANAGEMENT_SERVICE)).toBe(true);
            expect(container.isRegistered(SERVICE_TOKENS.AGENT_TREE_PROVIDER)).toBe(true);
            expect(container.isRegistered(SERVICE_TOKENS.CONTEXT_TREE_PROVIDER)).toBe(true);
        });

        it('should resolve logger service with placeholder implementation', () => {
            ContainerConfiguration.configure(container);

            const logger = container.resolve(SERVICE_TOKENS.LOGGER) as any;

            expect(logger).toBeDefined();
            expect(typeof logger.info).toBe('function');
            expect(typeof logger.warn).toBe('function');
            expect(typeof logger.error).toBe('function');
            expect(typeof logger.debug).toBe('function');
        });

        it('should resolve agent domain service with repository dependency', () => {
            ContainerConfiguration.configure(container);

            const agentDomainService = container.resolve(SERVICE_TOKENS.AGENT_DOMAIN_SERVICE) as any;

            expect(agentDomainService).toBeDefined();
            expect(agentDomainService.repository).toBeDefined();
        });

        it('should resolve context domain service with repository dependency', () => {
            ContainerConfiguration.configure(container);

            const contextDomainService = container.resolve(SERVICE_TOKENS.CONTEXT_DOMAIN_SERVICE) as any;

            expect(contextDomainService).toBeDefined();
            expect(contextDomainService.repository).toBeDefined();
        });

        it('should create singleton instances by default', () => {
            ContainerConfiguration.configure(container);

            const logger1 = container.resolve(SERVICE_TOKENS.LOGGER);
            const logger2 = container.resolve(SERVICE_TOKENS.LOGGER);

            expect(logger1).toBe(logger2);
        });

        it('should handle service resolution without errors', () => {
            ContainerConfiguration.configure(container);

            expect(() => {
                container.resolve(SERVICE_TOKENS.LOGGER);
                container.resolve(SERVICE_TOKENS.FILE_SYSTEM_ADAPTER);
                container.resolve(SERVICE_TOKENS.VSCODE_ADAPTER);
                container.resolve(SERVICE_TOKENS.CACHE);
                container.resolve(SERVICE_TOKENS.ERROR_HANDLER);
                container.resolve(SERVICE_TOKENS.AGENT_REPOSITORY);
                container.resolve(SERVICE_TOKENS.AGENT_DOMAIN_SERVICE);
                container.resolve(SERVICE_TOKENS.CONTEXT_REPOSITORY);
                container.resolve(SERVICE_TOKENS.CONTEXT_DOMAIN_SERVICE);
                container.resolve(SERVICE_TOKENS.AGENT_CONFIG_SERVICE);
                container.resolve(SERVICE_TOKENS.AGENT_MANAGEMENT_SERVICE);
                container.resolve(SERVICE_TOKENS.AGENT_TREE_PROVIDER);
                container.resolve(SERVICE_TOKENS.CONTEXT_TREE_PROVIDER);
            }).not.toThrow();
        });
    });

    describe('placeholder implementations', () => {
        beforeEach(() => {
            ContainerConfiguration.configure(container);
        });

        it('should provide functional logger placeholder', () => {
            const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
            const logger = container.resolve(SERVICE_TOKENS.LOGGER) as any;

            logger.info('test message');

            expect(consoleSpy).toHaveBeenCalledWith('[INFO] test message');
            consoleSpy.mockRestore();
        });

        it('should provide empty object placeholders for other services', () => {
            const fileSystemAdapter = container.resolve(SERVICE_TOKENS.FILE_SYSTEM_ADAPTER);
            const vscodeAdapter = container.resolve(SERVICE_TOKENS.VSCODE_ADAPTER);
            const cache = container.resolve(SERVICE_TOKENS.CACHE);
            const errorHandler = container.resolve(SERVICE_TOKENS.ERROR_HANDLER);

            expect(fileSystemAdapter).toEqual({});
            expect(vscodeAdapter).toEqual({});
            expect(cache).toEqual({});
            expect(errorHandler).toEqual({});
        });
    });
});