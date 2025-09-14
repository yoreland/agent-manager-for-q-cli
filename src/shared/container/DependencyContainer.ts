/**
 * @fileoverview Dependency Injection Container implementation.
 * 
 * This module provides a lightweight dependency injection container
 * for managing service instances, factories, and singleton lifecycles
 * throughout the Agent Manager extension.
 * 
 * @author Agent Manager for Q CLI Extension
 * @since 0.1.0
 */

/**
 * Lightweight dependency injection container.
 * 
 * Manages service registration, resolution, and lifecycle with support
 * for singleton and transient instances. Provides type-safe service
 * resolution and automatic disposal of resources.
 * 
 * @example
 * ```typescript
 * const container = new DependencyContainer();
 * container.register('logger', () => new Logger(), true);
 * const logger = container.resolve<Logger>('logger');
 * ```
 */
export class DependencyContainer {
    /** Map of service instances */
    private services = new Map<string, any>();
    /** Map of service factory functions */
    private factories = new Map<string, () => any>();
    /** Set of singleton service tokens */
    private singletons = new Set<string>();
    /** Whether the container has been disposed */
    private disposed = false;

    /**
     * Registers a service factory with the container.
     * 
     * @param token - Unique service identifier
     * @param factory - Factory function to create service instances
     * @param singleton - Whether to create as singleton (default: true)
     * @throws {Error} When container is disposed
     */
    register<T>(token: string, factory: () => T, singleton = true): void {
        if (this.disposed) {
            throw new Error('Container is disposed');
        }

        this.factories.set(token, factory);
        if (singleton) {
            this.singletons.add(token);
        }
    }

    /**
     * Resolves a service instance from the container.
     * 
     * @param token - Service identifier to resolve
     * @returns The resolved service instance
     * @throws {Error} When container is disposed or service not found
     */
    resolve<T>(token: string): T {
        if (this.disposed) {
            throw new Error('Container is disposed');
        }

        // Return existing singleton instance
        if (this.singletons.has(token) && this.services.has(token)) {
            return this.services.get(token);
        }

        // Create new instance
        const factory = this.factories.get(token);
        if (!factory) {
            throw new Error(`Service not registered: ${token}`);
        }

        const instance = factory();

        // Store singleton instance
        if (this.singletons.has(token)) {
            this.services.set(token, instance);
        }

        return instance;
    }

    has(token: string): boolean {
        return this.factories.has(token);
    }

    dispose(): void {
        if (this.disposed) {return;}

        this.disposed = true;

        // Dispose all services that have a dispose method
        for (const [token, service] of this.services.entries()) {
            if (service && typeof service.dispose === 'function') {
                try {
                    service.dispose();
                } catch (error) {
                    console.error(`Error disposing service ${token}:`, error);
                }
            }
        }

        this.services.clear();
        this.factories.clear();
        this.singletons.clear();
    }
}
