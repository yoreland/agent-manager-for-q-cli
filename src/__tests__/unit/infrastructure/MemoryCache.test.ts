import { MemoryCache } from '../../../shared/infrastructure/MemoryCache';

describe('MemoryCache', () => {
    let cache: MemoryCache;

    beforeEach(() => {
        cache = new MemoryCache({ defaultTtl: 1000, maxSize: 3 });
    });

    afterEach(() => {
        cache.dispose();
    });

    it('should store and retrieve values', async () => {
        await cache.set('key1', 'value1');
        const result = await cache.get('key1');
        
        expect(result).toBe('value1');
    });

    it('should return null for non-existent keys', async () => {
        const result = await cache.get('nonexistent');
        
        expect(result).toBeNull();
    });

    it('should expire entries after TTL', async () => {
        await cache.set('key1', 'value1', 50); // 50ms TTL
        
        // Should exist immediately
        expect(await cache.get('key1')).toBe('value1');
        
        // Wait for expiration
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Should be expired
        expect(await cache.get('key1')).toBeNull();
    });

    it('should handle max size limit', async () => {
        // Fill cache to max size
        await cache.set('key1', 'value1');
        await cache.set('key2', 'value2');
        await cache.set('key3', 'value3');
        
        expect(await cache.size()).toBe(3);
        
        // Adding one more should evict oldest
        await cache.set('key4', 'value4');
        
        // Size should still be 3 (max size)
        expect(await cache.size()).toBeLessThanOrEqual(3);
        
        // New key should exist
        expect(await cache.get('key4')).toBe('value4');
        
        // At least one old key should be evicted
        const key1Exists = await cache.has('key1');
        const key2Exists = await cache.has('key2');
        const key3Exists = await cache.has('key3');
        
        // At least one should be false (evicted)
        expect(key1Exists && key2Exists && key3Exists).toBe(false);
    });

    it('should delete entries', async () => {
        await cache.set('key1', 'value1');
        expect(await cache.has('key1')).toBe(true);
        
        await cache.delete('key1');
        expect(await cache.has('key1')).toBe(false);
    });

    it('should clear all entries', async () => {
        await cache.set('key1', 'value1');
        await cache.set('key2', 'value2');
        
        expect(await cache.size()).toBe(2);
        
        await cache.clear();
        
        expect(await cache.size()).toBe(0);
    });

    it('should not operate after disposal', async () => {
        cache.dispose();
        
        await cache.set('key1', 'value1');
        const result = await cache.get('key1');
        
        expect(result).toBeNull();
        expect(await cache.size()).toBe(0);
    });
});
