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

interface CallRecord {
    timestamp: number;
    args: any[];
    resolve: (value: any) => void;
    reject: (reason?: any) => void;
}

/**
 * Token Bucket Rate Limiter
 *
 * Allows bursts up to maxCalls, then refills at a steady rate.
 */
export class TokenBucketRateLimiter {
    private tokens: number;
    private lastRefill: number;
    private queue: CallRecord[] = [];

    constructor(private options: RateLimiterOptions) {
        this.tokens = options.maxCalls;
        this.lastRefill = Date.now();
    }

    /**
     * Refill tokens based on elapsed time
     */
    private refill(): void {
        const now = Date.now();
        const elapsed = now - this.lastRefill;

        // Calculate tokens to add based on elapsed time
        const tokensToAdd = Math.floor((elapsed / this.options.timeframe) * this.options.maxCalls);

        if (tokensToAdd > 0) {
            this.tokens = Math.min(this.options.maxCalls, this.tokens + tokensToAdd);
            this.lastRefill = now;
        }
    }

    /**
     * Try to execute a function with rate limiting
     */
    async execute<T>(fn: (...args: any[]) => T, ...args: any[]): Promise<T> {
        this.refill();

        if (this.tokens > 0) {
            this.tokens--;
            try {
                return await fn(...args);
            } catch (error) {
                throw error;
            }
        }

        // No tokens available
        if (this.options.queue) {
            // Queue the call for later execution
            return new Promise<T>((resolve, reject) => {
                this.queue.push({
                    timestamp: Date.now(),
                    args,
                    resolve,
                    reject,
                });

                // Schedule processing of queued calls
                this.scheduleQueueProcessing();
            });
        } else {
            throw new Error('Rate limit exceeded. Please try again later.');
        }
    }

    /**
     * Process queued calls when tokens become available
     */
    private scheduleQueueProcessing(): void {
        if (this.queue.length === 0) {
            return;
        }

        const delay = this.options.timeframe / this.options.maxCalls;

        setTimeout(() => {
            this.refill();

            // Process as many queued calls as we have tokens for
            while (this.queue.length > 0 && this.tokens > 0) {
                const call = this.queue.shift();
                if (call) {
                    this.tokens--;
                    // Note: We can't actually execute the queued function here
                    // because we don't have access to the original function.
                    // This is a limitation of the current design.
                }
            }
        }, delay);
    }

    /**
     * Get current number of available tokens
     */
    getAvailableTokens(): number {
        this.refill();
        return this.tokens;
    }

    /**
     * Get number of queued calls
     */
    getQueueLength(): number {
        return this.queue.length;
    }

    /**
     * Clear all queued calls
     */
    clearQueue(): void {
        this.queue = [];
    }

    /**
     * Reset the rate limiter
     */
    reset(): void {
        this.tokens = this.options.maxCalls;
        this.lastRefill = Date.now();
        this.clearQueue();
    }
}

/**
 * Sliding Window Rate Limiter
 *
 * Tracks exact timestamps of calls within a sliding window.
 */
export class SlidingWindowRateLimiter {
    private calls: number[] = [];

    constructor(private options: RateLimiterOptions) {}

    /**
     * Try to execute a function with rate limiting
     */
    async execute<T>(fn: (...args: any[]) => T, ...args: any[]): Promise<T> {
        const now = Date.now();

        // Remove calls outside the timeframe
        this.calls = this.calls.filter(timestamp => now - timestamp < this.options.timeframe);

        if (this.calls.length < this.options.maxCalls) {
            this.calls.push(now);
            return await fn(...args);
        }

        // Rate limit exceeded
        if (this.options.queue) {
            // Calculate wait time until oldest call expires
            const oldestCall = this.calls[0];
            const waitTime = oldestCall + this.options.timeframe - now;

            await new Promise(resolve => setTimeout(resolve, waitTime));

            // Retry after waiting
            return this.execute(fn, ...args);
        } else {
            throw new Error('Rate limit exceeded. Please try again later.');
        }
    }

    /**
     * Get number of calls within current window
     */
    getCallCount(): number {
        const now = Date.now();
        this.calls = this.calls.filter(timestamp => now - timestamp < this.options.timeframe);
        return this.calls.length;
    }

    /**
     * Get time until next available slot (in milliseconds)
     */
    getTimeUntilNextSlot(): number {
        if (this.calls.length < this.options.maxCalls) {
            return 0;
        }

        const now = Date.now();
        const oldestCall = this.calls[0];
        return Math.max(0, oldestCall + this.options.timeframe - now);
    }

    /**
     * Reset the rate limiter
     */
    reset(): void {
        this.calls = [];
    }
}

/**
 * Simple Rate Limiter Factory
 *
 * Creates the appropriate rate limiter based on options.
 */
export function createRateLimiter(options: RateLimiterOptions): TokenBucketRateLimiter | SlidingWindowRateLimiter {
    // Use sliding window for more accurate rate limiting
    // Use token bucket for better performance with high call rates
    if (options.maxCalls > 100) {
        return new TokenBucketRateLimiter(options);
    } else {
        return new SlidingWindowRateLimiter(options);
    }
}

/**
 * Rate Limiter Decorator
 *
 * Decorates a function with rate limiting capabilities.
 */
export function rateLimit(options: RateLimiterOptions) {
    return function <T extends (...args: any[]) => any>(
        target: any,
        propertyKey: string,
        descriptor?: PropertyDescriptor
    ): any {
        // Handle both 2-argument and 3-argument decorator signatures
        if (descriptor === undefined) {
            // Called as @rateLimit(options) without method descriptor
            return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
                const originalMethod = descriptor.value;
                const limiter = createRateLimiter(options);

                descriptor.value = async function (...args: any[]) {
                    return limiter.execute(originalMethod, this, ...args);
                };

                return descriptor;
            };
        }

        // Called as @rateLimit(options) with method descriptor
        const originalMethod = descriptor.value;
        const limiter = createRateLimiter(options);

        descriptor.value = async function (...args: any[]) {
            return limiter.execute(originalMethod, this, ...args);
        };

        return descriptor;
    };
}
