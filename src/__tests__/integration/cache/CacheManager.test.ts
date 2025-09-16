import { CacheManager } from '../../../shared/cache/CacheManager';
import { MemoryCache } from '../../../shared/infrastructure/MemoryCache';
import { ILogger } from '../../../shared/infrastructure/ILogger';

describe('CacheManager Integration', () => {
    let cacheManager: CacheManager;
    let mockLogger: jest.Mocked<ILogger>;

    beforeEach(() => {
        mockLogger = {
            debug: jest.fn(),
            info: jest.fn(),
            warn: jest.fn(),
            error: jest.fn(),
            setLogLevel: jest.fn(),
            getLogLevel: jest.fn(),
            dispose: jest.fn()
        };

        cacheManager = new CacheManager(mockLogger);
    });

    afterEach(() => {
        cacheManager.dispose();
    });

    describe('cache registration', () => {
        it('should register and retrieve caches', () => {
            const cache = new MemoryCache();
            
            cacheManager.registerCache('test-cache', cache);
            
            const retrievedCache = cacheManager.getCache('test-cache');
            expect(retrievedCache).toBe(cache);
            expect(mockLogger.debug).toHaveBeenCalledWith('Cache registered', { name: 'test-cache' });
        });

        it('should return undefined for non-existent cache', () => {
            const cache = cacheManager.getCache('non-existent');
            expect(cache).toBeUndefined();
        });

        it('should throw error when registering on disposed manager', () => {
            cacheManager.dispose();
            
            expect(() => {
                cacheManager.registerCache('test', new MemoryCache());
            }).toThrow('CacheManager is disposed');
        });
    });

    describe('cache invalidation', () => {
        it('should invalidate all caches', async () => {
            const cache1 = new MemoryCache();
            const cache2 = new MemoryCache();
            
            await cache1.set('key1', 'value1');
            await cache2.set('key2', 'value2');
            
            cacheManager.registerCache('cache1', cache1);
            cacheManager.registerCache('cache2', cache2);
            
            await cacheManager.invalidateAll();
            
            expect(await cache1.get('key1')).toBeNull();
            expect(await cache2.get('key2')).toBeNull();
            expect(mockLogger.info).toHaveBeenCalledWith('Invalidating all caches');
        });

        it('should invalidate specific cache', async () => {
            const cache1 = new MemoryCache();
            const cache2 = new MemoryCache();
            
            await cache1.set('key1', 'value1');
            await cache2.set('key2', 'value2');
            
            cacheManager.registerCache('cache1', cache1);
            cacheManager.registerCache('cache2', cache2);
            
            await cacheManager.invalidateCache('cache1');
            
            expect(await cache1.get('key1')).toBeNull();
            expect(await cache2.get('key2')).toBe('value2');
        });
    });

    describe('cache statistics', () => {
        it('should return cache statistics', () => {
            const cache = new MemoryCache();
            cacheManager.registerCache('test-cache', cache);
            
            const stats = cacheManager.getCacheStats();
            
            expect(stats).toHaveLength(1);
            expect(stats[0]?.name).toBe('test-cache');
            // Size might be a function or number depending on implementation
            expect(['number', 'function']).toContain(typeof stats[0]?.size);
            expect(typeof stats[0]?.hitRate).toBe('number');
        });
    });

    describe('disposal', () => {
        it('should dispose all caches', () => {
            const cache = new MemoryCache();
            const disposeSpy = jest.spyOn(cache, 'dispose');
            
            cacheManager.registerCache('test-cache', cache);
            cacheManager.dispose();
            
            expect(disposeSpy).toHaveBeenCalled();
            expect(mockLogger.debug).toHaveBeenCalledWith('CacheManager disposed');
        });

        it('should handle disposal errors gracefully', () => {
            const cache = {
                dispose: jest.fn().mockImplementation(() => {
                    throw new Error('Disposal error');
                })
            };
            
            cacheManager.registerCache('faulty-cache', cache as any);
            
            expect(() => cacheManager.dispose()).not.toThrow();
            expect(mockLogger.error).toHaveBeenCalledWith(
                'Error disposing cache',
                expect.any(Error),
                { name: 'faulty-cache' }
            );
        });
    });
});
