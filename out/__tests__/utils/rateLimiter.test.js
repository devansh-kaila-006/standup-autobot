"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const rateLimiter_1 = require("../../utils/rateLimiter");
(0, globals_1.describe)('RateLimiter', () => {
    (0, globals_1.describe)('TokenBucketRateLimiter', () => {
        let limiter;
        (0, globals_1.beforeEach)(() => {
            limiter = new rateLimiter_1.TokenBucketRateLimiter({
                maxCalls: 5,
                timeframe: 1000,
                queue: false,
            });
        });
        (0, globals_1.it)('should allow calls within the limit', async () => {
            const fn = globals_1.jest.fn(async () => 'result');
            for (let i = 0; i < 5; i++) {
                const result = await limiter.execute(fn);
                (0, globals_1.expect)(result).toBe('result');
            }
            (0, globals_1.expect)(fn).toHaveBeenCalledTimes(5);
        });
        (0, globals_1.it)('should reject calls exceeding the limit', async () => {
            const fn = globals_1.jest.fn(async () => 'result');
            // Use all tokens
            for (let i = 0; i < 5; i++) {
                await limiter.execute(fn);
            }
            // Next call should fail
            await (0, globals_1.expect)(limiter.execute(fn)).rejects.toThrow('Rate limit exceeded');
            (0, globals_1.expect)(fn).toHaveBeenCalledTimes(5);
        });
        (0, globals_1.it)('should refill tokens over time', async () => {
            const fn = globals_1.jest.fn(async () => 'result');
            // Use all tokens
            for (let i = 0; i < 5; i++) {
                await limiter.execute(fn);
            }
            // Wait for refill
            await new Promise(resolve => setTimeout(resolve, 1100));
            // Should have new tokens
            const result = await limiter.execute(fn);
            (0, globals_1.expect)(result).toBe('result');
        });
        (0, globals_1.it)('should track available tokens', () => {
            (0, globals_1.expect)(limiter.getAvailableTokens()).toBe(5);
            limiter['tokens'] = 3;
            (0, globals_1.expect)(limiter.getAvailableTokens()).toBe(3);
        });
        (0, globals_1.it)('should reset the limiter', async () => {
            const fn = globals_1.jest.fn(async () => 'result');
            // Use some tokens
            for (let i = 0; i < 3; i++) {
                await limiter.execute(fn);
            }
            // Reset
            limiter.reset();
            // Should have all tokens available
            (0, globals_1.expect)(limiter.getAvailableTokens()).toBe(5);
        });
    });
    (0, globals_1.describe)('SlidingWindowRateLimiter', () => {
        let limiter;
        (0, globals_1.beforeEach)(() => {
            limiter = new rateLimiter_1.SlidingWindowRateLimiter({
                maxCalls: 3,
                timeframe: 1000,
                queue: false,
            });
        });
        (0, globals_1.it)('should allow calls within the limit', async () => {
            const fn = globals_1.jest.fn(async () => 'result');
            for (let i = 0; i < 3; i++) {
                const result = await limiter.execute(fn);
                (0, globals_1.expect)(result).toBe('result');
            }
            (0, globals_1.expect)(fn).toHaveBeenCalledTimes(3);
        });
        (0, globals_1.it)('should reject calls exceeding the limit', async () => {
            const fn = globals_1.jest.fn(async () => 'result');
            // Use all slots
            for (let i = 0; i < 3; i++) {
                await limiter.execute(fn);
            }
            // Next call should fail
            await (0, globals_1.expect)(limiter.execute(fn)).rejects.toThrow('Rate limit exceeded');
            (0, globals_1.expect)(fn).toHaveBeenCalledTimes(3);
        });
        (0, globals_1.it)('should allow calls after window expires', async () => {
            const fn = globals_1.jest.fn(async () => 'result');
            // Use all slots
            for (let i = 0; i < 3; i++) {
                await limiter.execute(fn);
            }
            // Wait for window to expire
            await new Promise(resolve => setTimeout(resolve, 1100));
            // Should allow new calls
            const result = await limiter.execute(fn);
            (0, globals_1.expect)(result).toBe('result');
        });
        (0, globals_1.it)('should track call count correctly', () => {
            (0, globals_1.expect)(limiter.getCallCount()).toBe(0);
            limiter['calls'].push(Date.now(), Date.now(), Date.now());
            (0, globals_1.expect)(limiter.getCallCount()).toBe(3);
        });
        (0, globals_1.it)('should calculate time until next slot', () => {
            limiter['calls'] = [Date.now() - 500, Date.now() - 500, Date.now() - 500];
            limiter['calls'].push(Date.now()); // 4th call exceeds limit
            const timeUntilNext = limiter.getTimeUntilNextSlot();
            (0, globals_1.expect)(timeUntilNext).toBeGreaterThan(0);
            (0, globals_1.expect)(timeUntilNext).toBeLessThanOrEqual(1000);
        });
        (0, globals_1.it)('should reset the limiter', () => {
            limiter['calls'].push(Date.now(), Date.now(), Date.now());
            (0, globals_1.expect)(limiter.getCallCount()).toBe(3);
            limiter.reset();
            (0, globals_1.expect)(limiter.getCallCount()).toBe(0);
        });
    });
    (0, globals_1.describe)('createRateLimiter', () => {
        (0, globals_1.it)('should create SlidingWindowRateLimiter for small limits', () => {
            const limiter = (0, rateLimiter_1.createRateLimiter)({
                maxCalls: 50,
                timeframe: 1000,
            });
            (0, globals_1.expect)(limiter).toBeInstanceOf(rateLimiter_1.SlidingWindowRateLimiter);
        });
        (0, globals_1.it)('should create TokenBucketRateLimiter for large limits', () => {
            const limiter = (0, rateLimiter_1.createRateLimiter)({
                maxCalls: 150,
                timeframe: 1000,
            });
            (0, globals_1.expect)(limiter).toBeInstanceOf(rateLimiter_1.TokenBucketRateLimiter);
        });
    });
});
//# sourceMappingURL=rateLimiter.test.js.map