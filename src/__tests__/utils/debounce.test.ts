import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import {
    debounce,
    Debounce,
    throttle,
    Throttle,
    DebouncedFunction,
    ThrottledFunction,
} from '../../utils/debounce';

describe('Debounce Utility', () => {
    describe('debounce function', () => {
        let fn: jest.Mock<(value: number) => number>;
        let debounced: DebouncedFunction<(value: number) => number>;

        beforeEach(() => {
            jest.useFakeTimers();
            fn = jest.fn((value: number) => value * 2);
            debounced = debounce(fn, 1000);
        });

        afterEach(() => {
            jest.useRealTimers();
        });

        it('should delay function execution', () => {
            debounced.execute(5);

            expect(fn).not.toHaveBeenCalled();

            jest.advanceTimersByTime(1000);

            expect(fn).toHaveBeenCalledWith(5);
            expect(fn).toHaveBeenCalledTimes(1);
        });

        it('should reset timer on subsequent calls', () => {
            debounced.execute(1);
            jest.advanceTimersByTime(500);

            debounced.execute(2);
            jest.advanceTimersByTime(500);

            // First call should not have executed yet
            expect(fn).not.toHaveBeenCalled();

            // Complete the delay
            jest.advanceTimersByTime(500);

            // Only the second call should execute
            expect(fn).toHaveBeenCalledWith(2);
            expect(fn).toHaveBeenCalledTimes(1);
        });

        it('should execute immediately with immediate option', () => {
            const immediateFn = jest.fn((value: number) => value * 2);
            const immediateDebounced = debounce(immediateFn, 1000, { immediate: true });

            immediateDebounced.execute(5);

            expect(immediateFn).toHaveBeenCalledWith(5);
            expect(immediateFn).toHaveBeenCalledTimes(1);
        });

        it('should respect maxWait option', () => {
            const maxWaitDebounced = debounce(fn, 1000, { maxWait: 1500 });

            maxWaitDebounced.execute(1);
            jest.advanceTimersByTime(500);

            maxWaitDebounced.execute(2);
            jest.advanceTimersByTime(500);

            maxWaitDebounced.execute(3);
            jest.advanceTimersByTime(600);

            // Should execute due to maxWait
            expect(fn).toHaveBeenCalled();
        });

        it('should cancel pending execution', () => {
            debounced.execute(5);
            debounced.cancel();

            jest.advanceTimersByTime(1000);

            expect(fn).not.toHaveBeenCalled();
        });

        it('should flush pending execution', () => {
            debounced.execute(5);

            const result = debounced.flush();

            expect(fn).toHaveBeenCalledWith(5);
            expect(result).toBe(10);
        });

        it('should report pending status correctly', () => {
            expect(debounced.pending()).toBe(false);

            debounced.execute(5);
            expect(debounced.pending()).toBe(true);

            jest.advanceTimersByTime(1000);
            expect(debounced.pending()).toBe(false);
        });

        it('should return time until execution', () => {
            debounced.execute(5);

            const timeUntil = debounced.getTimeUntilExecution();
            expect(timeUntil).toBeGreaterThan(0);
            expect(timeUntil).toBeLessThanOrEqual(1000);
        });
    });

    describe('throttle function', () => {
        let fn: jest.Mock<(value: number) => number>;
        let throttled: ThrottledFunction<(value: number) => number>;

        beforeEach(() => {
            jest.useFakeTimers();
            fn = jest.fn((value: number) => value * 2);
            throttled = throttle(fn, 1000);
        });

        afterEach(() => {
            jest.useRealTimers();
        });

        it('should execute immediately on first call', () => {
            throttled.execute(5);

            expect(fn).toHaveBeenCalledWith(5);
            expect(fn).toHaveBeenCalledTimes(1);
        });

        it('should throttle subsequent calls', () => {
            throttled.execute(1);
            throttled.execute(2);
            throttled.execute(3);

            // Only first call should have executed
            expect(fn).toHaveBeenCalledTimes(1);
            expect(fn).toHaveBeenCalledWith(1);
        });

        it('should allow calls after delay period', () => {
            throttled.execute(1);
            expect(fn).toHaveBeenCalledTimes(1);

            jest.advanceTimersByTime(1000);

            throttled.execute(2);
            expect(fn).toHaveBeenCalledTimes(2);
            expect(fn).toHaveBeenLastCalledWith(2);
        });

        it('should return cached result during throttle period', () => {
            fn.mockReturnValue(10);

            throttled.execute(1);
            const result1 = throttled.execute(2);
            const result2 = throttled.execute(3);

            expect(result1).toBe(10);
            expect(result2).toBe(10);
            expect(fn).toHaveBeenCalledTimes(1);
        });

        it('should cancel pending executions', () => {
            throttled.execute(1);
            throttled.cancel();

            jest.advanceTimersByTime(1000);

            expect(fn).toHaveBeenCalledTimes(1);
        });
    });
});
