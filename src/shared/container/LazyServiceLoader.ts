import { DependencyContainer } from './DependencyContainer';
import { ILogger } from '../infrastructure/ILogger';

export class LazyServiceLoader {
    private loadingPromises = new Map<string, Promise<any>>();
    private loadedServices = new Set<string>();

    constructor(
        private container: DependencyContainer,
        private logger: ILogger
    ) {}

    async loadService<T>(token: string): Promise<T> {
        // Return immediately if already loaded
        if (this.loadedServices.has(token)) {
            return this.container.resolve<T>(token);
        }

        // Return existing loading promise if in progress
        if (this.loadingPromises.has(token)) {
            return this.loadingPromises.get(token)!;
        }

        // Start loading
        const loadingPromise = this.doLoadService<T>(token);
        this.loadingPromises.set(token, loadingPromise);

        try {
            const service = await loadingPromise;
            this.loadedServices.add(token);
            this.loadingPromises.delete(token);
            return service;
        } catch (error) {
            this.loadingPromises.delete(token);
            throw error;
        }
    }

    private async doLoadService<T>(token: string): Promise<T> {
        this.logger.debug('Loading service', { token });
        
        const startTime = Date.now();
        
        try {
            const service = this.container.resolve<T>(token);
            
            // If service has an async initialization method, call it
            if (service && typeof (service as any).initialize === 'function') {
                await (service as any).initialize();
            }
            
            const loadTime = Date.now() - startTime;
            this.logger.debug('Service loaded', { token, loadTime });
            
            return service;
        } catch (error) {
            this.logger.error('Failed to load service', error as Error, { token });
            throw error;
        }
    }

    isLoaded(token: string): boolean {
        return this.loadedServices.has(token);
    }

    isLoading(token: string): boolean {
        return this.loadingPromises.has(token);
    }

    dispose(): void {
        this.loadingPromises.clear();
        this.loadedServices.clear();
    }
}
