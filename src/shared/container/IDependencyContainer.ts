/**
 * Interface for dependency injection container
 * Provides service registration, resolution, and lifecycle management
 */
export interface IDependencyContainer {
    /**
     * Register a service with the container
     * @param token - Unique identifier for the service
     * @param factory - Factory function to create the service instance
     * @param singleton - Whether to create a single instance (default: true)
     */
    register<T>(token: string, factory: () => T, singleton?: boolean): void;

    /**
     * Register a service instance directly
     * @param token - Unique identifier for the service
     * @param instance - Service instance to register
     */
    registerInstance<T>(token: string, instance: T): void;

    /**
     * Resolve a service from the container
     * @param token - Unique identifier for the service
     * @returns The service instance
     * @throws Error if service is not registered
     */
    resolve<T>(token: string): T;

    /**
     * Check if a service is registered
     * @param token - Unique identifier for the service
     * @returns True if service is registered
     */
    isRegistered(token: string): boolean;

    /**
     * Dispose all services and clean up resources
     * Calls dispose() method on services that implement it
     */
    dispose(): void;

    /**
     * Clear all registrations (for testing purposes)
     */
    clear(): void;
}

/**
 * Interface for disposable services
 */
export interface IDisposable {
    dispose(): void | Promise<void>;
}

/**
 * Service registration information
 */
export interface ServiceRegistration<T = any> {
    factory: () => T;
    singleton: boolean;
    instance?: T;
}