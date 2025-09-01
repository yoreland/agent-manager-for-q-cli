export class DependencyContainer {
    private services = new Map<string, any>();
    private factories = new Map<string, () => any>();
    private singletons = new Set<string>();
    private disposed = false;

    register<T>(token: string, factory: () => T, singleton = true): void {
        if (this.disposed) {
            throw new Error('Container is disposed');
        }

        this.factories.set(token, factory);
        if (singleton) {
            this.singletons.add(token);
        }
    }

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
        if (this.disposed) return;

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
