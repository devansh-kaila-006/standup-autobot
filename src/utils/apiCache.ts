/**
 * API Response Cache Utility
 *
 * Provides caching for API responses to reduce redundant calls and improve performance.
 * Supports TTL-based cache invalidation and cache size limits.
 */

export interface CacheEntry<T> {
    data: T;
    timestamp: number;
    ttl: number; // Time to live in milliseconds
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

export class APICache<T> {
    private cache: Map<string, CacheEntry<T>> = new Map();
    private readonly maxSize: number;
    private stats = {
        totalRequests: 0,
        cacheHits: 0,
        cacheMisses: 0,
    };

    constructor(maxSize: number = 100) {
        this.maxSize = maxSize;
    }

    /**
     * Generate a cache key from parameters
     */
    private generateKey(...args: any[]): string {
        return JSON.stringify(args);
    }

    /**
     * Get a value from the cache
     */
    get(key: string): T | undefined {
        this.stats.totalRequests++;

        const entry = this.cache.get(key);

        if (!entry) {
            this.stats.cacheMisses++;
            return undefined;
        }

        // Check if entry has expired
        const now = Date.now();
        if (now - entry.timestamp > entry.ttl) {
            this.cache.delete(key);
            this.stats.cacheMisses++;
            return undefined;
        }

        this.stats.cacheHits++;
        return entry.data;
    }

    /**
     * Set a value in the cache
     */
    set(key: string, data: T, ttl: number = 300000): void {
        // Default TTL: 5 minutes (300000 ms)

        // Check if we need to evict entries
        if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
            this.evictLRU();
        }

        this.cache.set(key, {
            data,
            timestamp: Date.now(),
            ttl,
            key,
        });
    }

    /**
     * Get or set a value using a factory function
     */
    async getOrSet(
        key: string,
        factory: () => Promise<T>,
        ttl: number = 300000
    ): Promise<T> {
        const cached = this.get(key);
        if (cached !== undefined) {
            return cached;
        }

        const data = await factory();
        this.set(key, data, ttl);
        return data;
    }

    /**
     * Convenience method to get/set using function arguments as key
     */
    async getOrSetByArgs(
        factoryArgs: any[],
        factory: () => Promise<T>,
        ttl: number = 300000
    ): Promise<T> {
        const key = this.generateKey(...factoryArgs);
        return this.getOrSet(key, factory, ttl);
    }

    /**
     * Evict least recently used entry
     */
    private evictLRU(): void {
        let oldestKey: string | undefined;
        let oldestTime = Infinity;

        for (const [key, entry] of this.cache.entries()) {
            if (entry.timestamp < oldestTime) {
                oldestTime = entry.timestamp;
                oldestKey = key;
            }
        }

        if (oldestKey) {
            this.cache.delete(oldestKey);
        }
    }

    /**
     * Clear a specific entry
     */
    delete(key: string): boolean {
        return this.cache.delete(key);
    }

    /**
     * Clear all entries
     */
    clear(): void {
        this.cache.clear();
        this.resetStats();
    }

    /**
     * Clear expired entries
     */
    clearExpired(): number {
        const now = Date.now();
        let cleared = 0;

        for (const [key, entry] of this.cache.entries()) {
            if (now - entry.timestamp > entry.ttl) {
                this.cache.delete(key);
                cleared++;
            }
        }

        return cleared;
    }

    /**
     * Get cache statistics
     */
    getStats(): CacheStats {
        const hitRate = this.stats.totalRequests > 0
            ? (this.stats.cacheHits / this.stats.totalRequests) * 100
            : 0;

        return {
            size: this.cache.size,
            maxSize: this.maxSize,
            hitRate,
            totalRequests: this.stats.totalRequests,
            cacheHits: this.stats.cacheHits,
            cacheMisses: this.stats.cacheMisses,
        };
    }

    /**
     * Reset statistics
     */
    resetStats(): void {
        this.stats = {
            totalRequests: 0,
            cacheHits: 0,
            cacheMisses: 0,
        };
    }

    /**
     * Get all keys in the cache
     */
    keys(): string[] {
        return Array.from(this.cache.keys());
    }

    /**
     * Get cache size
     */
    size(): number {
        return this.cache.size;
    }

    /**
     * Check if key exists and is not expired
     */
    has(key: string): boolean {
        const entry = this.cache.get(key);
        if (!entry) {
            return false;
        }

        const now = Date.now();
        if (now - entry.timestamp > entry.ttl) {
            this.cache.delete(key);
            return false;
        }

        return true;
    }
}

/**
 * Global API cache instance for Gemini responses
 */
export const geminiAPICache = new APICache<string>(50);

/**
 * Cache key generator for standup generation requests
 */
export function generateStandupCacheKey(
    dataHash: string,
    tone: string,
    language: string,
    customPrompt?: string
): string {
    return JSON.stringify({
        dataHash,
        tone,
        language,
        customPrompt: customPrompt || '',
    });
}

/**
 * Simple hash function for activity data
 */
export function hashActivityData(data: any): string {
    const str = JSON.stringify(data);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString(36);
}
