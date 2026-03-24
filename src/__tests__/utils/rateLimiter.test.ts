import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import {
    TokenBucketRateLimiter,
    SlidingWindowRateLimiter,
    createRateLimiter,
    rateLimit,
} from '../../utils/rateLimiter';

describe('RateLimiter', () => {
    describe('TokenBucketRateLimiter', () => {
        let limiter: TokenBucketRateLimiter;

        beforeEach(() => {
            limiter = new TokenBucketRateLimiter({
                maxCalls: 5,
                timeframe: 1000,
                queue: false,
            });
        });

        it('should allow calls within the limit', async () => {
            const fn = jest.fn(async () => 'result');

            for (let i = 0; i < 5; i++) {
                const result = await limiter.execute(fn);
                expect(result).toBe('result');
            }

            expect(fn).toHaveBeenCalledTimes(5);
        });

        it('should reject calls exceeding the limit', async () => {
            const fn = jest.fn(async () => 'result');

            // Use all tokens
            for (let i = 0; i < 5; i++) {
                await limiter.execute(fn);
            }

            // Next call should fail
            await expect(limiter.execute(fn)).rejects.toThrow('Rate limit exceeded');
            expect(fn).toHaveBeenCalledTimes(5);
        });

        it('should refill tokens over time', async () => {
            const fn = jest.fn(async () => 'result');

            // Use all tokens
            for (let i = 0; i < 5; i++) {
                await limiter.execute(fn);
            }

            // Wait for refill
            await new Promise(resolve => setTimeout(resolve, 1100));

            // Should have new tokens
            const result = await limiter.execute(fn);
            expect(result).toBe('result');
        });

        it('should track available tokens', () => {
            expect(limiter.getAvailableTokens()).toBe(5);

            limiter['tokens'] = 3;
            expect(limiter.getAvailableTokens()).toBe(3);
        });

        it('should reset the limiter', async () => {
            const fn = jest.fn(async () => 'result');

            // Use some tokens
            for (let i = 0; i < 3; i++) {
                await limiter.execute(fn);
            }

            // Reset
            limiter.reset();

            // Should have all tokens available
            expect(limiter.getAvailableTokens()).toBe(5);
        });
    });

    describe('SlidingWindowRateLimiter', () => {
        let limiter: SlidingWindowRateLimiter;

        beforeEach(() => {
            limiter = new SlidingWindowRateLimiter({
                maxCalls: 3,
                timeframe: 1000,
                queue: false,
            });
        });

        it('should allow calls within the limit', async () => {
            const fn = jest.fn(async () => 'result');

            for (let i = 0; i < 3; i++) {
                const result = await limiter.execute(fn);
                expect(result).toBe('result');
            }

            expect(fn).toHaveBeenCalledTimes(3);
        });

        it('should reject calls exceeding the limit', async () => {
            const fn = jest.fn(async () => 'result');

            // Use all slots
            for (let i = 0; i < 3; i++) {
                await limiter.execute(fn);
            }

            // Next call should fail
            await expect(limiter.execute(fn)).rejects.toThrow('Rate limit exceeded');
            expect(fn).toHaveBeenCalledTimes(3);
        });

        it('should allow calls after window expires', async () => {
            const fn = jest.fn(async () => 'result');

            // Use all slots
            for (let i = 0; i < 3; i++) {
                await limiter.execute(fn);
            }

            // Wait for window to expire
            await new Promise(resolve => setTimeout(resolve, 1100));

            // Should allow new calls
            const result = await limiter.execute(fn);
            expect(result).toBe('result');
        });

        it('should track call count correctly', () => {
            expect(limiter.getCallCount()).toBe(0);

            limiter['calls'].push(Date.now(), Date.now(), Date.now());

            expect(limiter.getCallCount()).toBe(3);
        });

        it('should calculate time until next slot', () => {
            limiter['calls'] = [Date.now() - 500, Date.now() - 500, Date.now() - 500];
            limiter['calls'].push(Date.now()); // 4th call exceeds limit

            const timeUntilNext = limiter.getTimeUntilNextSlot();
            expect(timeUntilNext).toBeGreaterThan(0);
            expect(timeUntilNext).toBeLessThanOrEqual(1000);
        });

        it('should reset the limiter', () => {
            limiter['calls'].push(Date.now(), Date.now(), Date.now());
            expect(limiter.getCallCount()).toBe(3);

            limiter.reset();
            expect(limiter.getCallCount()).toBe(0);
        });
    });

    describe('createRateLimiter', () => {
        it('should create SlidingWindowRateLimiter for small limits', () => {
            const limiter = createRateLimiter({
                maxCalls: 50,
                timeframe: 1000,
            });

            expect(limiter).toBeInstanceOf(SlidingWindowRateLimiter);
        });

        it('should create TokenBucketRateLimiter for large limits', () => {
            const limiter = createRateLimiter({
                maxCalls: 150,
                timeframe: 1000,
            });

            expect(limiter).toBeInstanceOf(TokenBucketRateLimiter);
        });
    });
});
