import { ICache } from '../infrastructure/ICache';
import { ILogger } from '../infrastructure/ILogger';

export class CacheManager {
    private caches = new Map<string, ICache>();
    private disposed = false;

    constructor(private logger: ILogger) {}

    registerCache(name: string, cache: ICache): void {
        if (this.disposed) {
            throw new Error('CacheManager is disposed');
        }

        this.caches.set(name, cache);
        this.logger.debug('Cache registered', { name });
    }

    getCache(name: string): ICache | undefined {
        return this.caches.get(name);
    }

    async invalidateAll(): Promise<void> {
        this.logger.info('Invalidating all caches');
        
        const promises = Array.from(this.caches.values()).map(cache => 
            cache.clear().catch(error => 
                this.logger.error('Failed to clear cache', error)
            )
        );

        await Promise.all(promises);
    }

    async invalidateCache(name: string): Promise<void> {
        const cache = this.caches.get(name);
        if (cache) {
            await cache.clear();
            this.logger.debug('Cache invalidated', { name });
        }
    }

    getCacheStats(): CacheStats[] {
        return Array.from(this.caches.entries()).map(([name, cache]) => ({
            name,
            size: (cache as any).size || 0,
            hitRate: (cache as any).hitRate || 0
        }));
    }

    dispose(): void {
        if (this.disposed) return;

        this.disposed = true;
        
        for (const [name, cache] of this.caches.entries()) {
            try {
                if (typeof (cache as any).dispose === 'function') {
                    (cache as any).dispose();
                }
            } catch (error) {
                this.logger.error('Error disposing cache', error as Error, { name });
            }
        }

        this.caches.clear();
        this.logger.debug('CacheManager disposed');
    }
}

export interface CacheStats {
    name: string;
    size: number;
    hitRate: number;
}
