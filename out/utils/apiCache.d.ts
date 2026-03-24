/**
 * API Response Cache Utility
 *
 * Provides caching for API responses to reduce redundant calls and improve performance.
 * Supports TTL-based cache invalidation and cache size limits.
 */
export interface CacheEntry<T> {
    data: T;
    timestamp: number;
    ttl: number;
    key: string;
}
export interface CacheStats {
    size: number;
    maxSize: number;
    hitRate: number;
    totalRequests: number;
    cacheHits: number;
    cacheMisses: number;
}
export declare class APICache<T> {
    private cache;
    private readonly maxSize;
    private stats;
    constructor(maxSize?: number);
    /**
     * Generate a cache key from parameters
     */
    private generateKey;
    /**
     * Get a value from the cache
     */
    get(key: string): T | undefined;
    /**
     * Set a value in the cache
     */
    set(key: string, data: T, ttl?: number): void;
    /**
     * Get or set a value using a factory function
     */
    getOrSet(key: string, factory: () => Promise<T>, ttl?: number): Promise<T>;
    /**
     * Convenience method to get/set using function arguments as key
     */
    getOrSetByArgs(factoryArgs: any[], factory: () => Promise<T>, ttl?: number): Promise<T>;
    /**
     * Evict least recently used entry
     */
    private evictLRU;
    /**
     * Clear a specific entry
     */
    delete(key: string): boolean;
    /**
     * Clear all entries
     */
    clear(): void;
    /**
     * Clear expired entries
     */
    clearExpired(): number;
    /**
     * Get cache statistics
     */
    getStats(): CacheStats;
    /**
     * Reset statistics
     */
    resetStats(): void;
    /**
     * Get all keys in the cache
     */
    keys(): string[];
    /**
     * Get cache size
     */
    size(): number;
    /**
     * Check if key exists and is not expired
     */
    has(key: string): boolean;
}
/**
 * Global API cache instance for Gemini responses
 */
export declare const geminiAPICache: APICache<string>;
/**
 * Cache key generator for standup generation requests
 */
export declare function generateStandupCacheKey(dataHash: string, tone: string, language: string, customPrompt?: string): string;
/**
 * Simple hash function for activity data
 */
export declare function hashActivityData(data: any): string;
//# sourceMappingURL=apiCache.d.ts.map