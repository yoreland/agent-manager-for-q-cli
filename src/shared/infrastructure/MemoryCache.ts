import { ICache, CacheEntry, CacheOptions } from './ICache';

export class MemoryCache implements ICache {
    private cache = new Map<string, CacheEntry>();
    private timers = new Map<string, NodeJS.Timeout>();
    private cleanupTimer?: NodeJS.Timeout;
    private disposed = false;

    constructor(private options: CacheOptions = {}) {
        const cleanupInterval = options.cleanupInterval || 60000; // 1 minute
        this.cleanupTimer = setInterval(() => this.cleanup(), cleanupInterval);
    }

    async get<T>(key: string): Promise<T | null> {
        if (this.disposed) return null;
        
        const entry = this.cache.get(key);
        if (!entry) return null;
        
        if (Date.now() > entry.expiresAt) {
            await this.delete(key);
            return null;
        }
        
        return entry.value as T;
    }

    async set<T>(key: string, value: T, ttl?: number): Promise<void> {
        if (this.disposed) return;
        
        const defaultTtl = this.options.defaultTtl || 300000; // 5 minutes
        const timeToLive = ttl || defaultTtl;
        const expiresAt = Date.now() + timeToLive;
        
        // Clear existing timer if updating existing key
        const existingTimer = this.timers.get(key);
        if (existingTimer) {
            clearTimeout(existingTimer);
        }
        
        // Check max size - evict before adding if at capacity and key doesn't exist
        if (this.options.maxSize && this.cache.size >= this.options.maxSize && !this.cache.has(key)) {
            await this.evictOldest();
        }
        
        // Set new entry
        this.cache.set(key, {
            value,
            expiresAt,
            createdAt: Date.now()
        });
        
        // Set expiration timer
        const timer = setTimeout(() => {
            this.delete(key);
        }, timeToLive);
        
        this.timers.set(key, timer);
    }

    async delete(key: string): Promise<void> {
        if (this.disposed) return;
        
        this.cache.delete(key);
        
        const timer = this.timers.get(key);
        if (timer) {
            clearTimeout(timer);
            this.timers.delete(key);
        }
    }

    async clear(): Promise<void> {
        if (this.disposed) return;
        
        // Clear all timers
        for (const timer of this.timers.values()) {
            clearTimeout(timer);
        }
        
        this.cache.clear();
        this.timers.clear();
    }

    async has(key: string): Promise<boolean> {
        if (this.disposed) return false;
        
        const entry = this.cache.get(key);
        if (!entry) return false;
        
        if (Date.now() > entry.expiresAt) {
            await this.delete(key);
            return false;
        }
        
        return true;
    }

    async size(): Promise<number> {
        return this.disposed ? 0 : this.cache.size;
    }

    private async evictOldest(): Promise<void> {
        let oldestKey: string | null = null;
        let oldestTime = Infinity;
        
        for (const [key, entry] of this.cache.entries()) {
            if (entry.createdAt < oldestTime) {
                oldestTime = entry.createdAt;
                oldestKey = key;
            }
        }
        
        if (oldestKey) {
            await this.delete(oldestKey);
        }
    }

    private cleanup(): void {
        if (this.disposed) return;
        
        const now = Date.now();
        const expiredKeys: string[] = [];
        
        for (const [key, entry] of this.cache.entries()) {
            if (now > entry.expiresAt) {
                expiredKeys.push(key);
            }
        }
        
        for (const key of expiredKeys) {
            this.delete(key);
        }
    }

    dispose(): void {
        if (this.disposed) return;
        
        this.disposed = true;
        
        if (this.cleanupTimer) {
            clearInterval(this.cleanupTimer);
        }
        
        this.clear();
    }
}
