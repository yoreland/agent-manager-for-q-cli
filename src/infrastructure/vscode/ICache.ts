export interface ICache {
    get<T>(key: string): Promise<T | null>;
    set<T>(key: string, value: T, ttl?: number): Promise<void>;
    delete(key: string): Promise<void>;
    clear(): Promise<void>;
    has(key: string): Promise<boolean>;
    size(): Promise<number>;
}

export interface CacheEntry<T = any> {
    value: T;
    expiresAt: number;
    createdAt: number;
}

export interface CacheOptions {
    defaultTtl?: number;
    maxSize?: number;
    cleanupInterval?: number;
}
