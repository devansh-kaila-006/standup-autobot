/**
 * Rate Limiter Utility
 *
 * Prevents excessive operations by limiting the rate at which functions can be called.
 * Useful for file system events, API calls, and other resource-intensive operations.
 */
export interface RateLimiterOptions {
    /**
     * Maximum number of calls allowed within the timeframe
     */
    maxCalls: number;
    /**
     * Timeframe in milliseconds
     */
    timeframe: number;
    /**
     * Whether to queue calls that exceed the limit (default: false)
     * If true, calls are queued and executed when the limit resets
     * If false, calls exceeding the limit are dropped
     */
    queue?: boolean;
}
/**
 * Token Bucket Rate Limiter
 *
 * Allows bursts up to maxCalls, then refills at a steady rate.
 */
export declare class TokenBucketRateLimiter {
    private options;
    private tokens;
    private lastRefill;
    private queue;
    constructor(options: RateLimiterOptions);
    /**
     * Refill tokens based on elapsed time
     */
    private refill;
    /**
     * Try to execute a function with rate limiting
     */
    execute<T>(fn: (...args: any[]) => T, ...args: any[]): Promise<T>;
    /**
     * Process queued calls when tokens become available
     */
    private scheduleQueueProcessing;
    /**
     * Get current number of available tokens
     */
    getAvailableTokens(): number;
    /**
     * Get number of queued calls
     */
    getQueueLength(): number;
    /**
     * Clear all queued calls
     */
    clearQueue(): void;
    /**
     * Reset the rate limiter
     */
    reset(): void;
}
/**
 * Sliding Window Rate Limiter
 *
 * Tracks exact timestamps of calls within a sliding window.
 */
export declare class SlidingWindowRateLimiter {
    private options;
    private calls;
    constructor(options: RateLimiterOptions);
    /**
     * Try to execute a function with rate limiting
     */
    execute<T>(fn: (...args: any[]) => T, ...args: any[]): Promise<T>;
    /**
     * Get number of calls within current window
     */
    getCallCount(): number;
    /**
     * Get time until next available slot (in milliseconds)
     */
    getTimeUntilNextSlot(): number;
    /**
     * Reset the rate limiter
     */
    reset(): void;
}
/**
 * Simple Rate Limiter Factory
 *
 * Creates the appropriate rate limiter based on options.
 */
export declare function createRateLimiter(options: RateLimiterOptions): TokenBucketRateLimiter | SlidingWindowRateLimiter;
/**
 * Rate Limiter Decorator
 *
 * Decorates a function with rate limiting capabilities.
 */
export declare function rateLimit(options: RateLimiterOptions): <T extends (...args: any[]) => any>(target: any, propertyKey: string, descriptor?: PropertyDescriptor) => any;
//# sourceMappingURL=rateLimiter.d.ts.map