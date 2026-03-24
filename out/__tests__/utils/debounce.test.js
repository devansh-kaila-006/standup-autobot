"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const debounce_1 = require("../../utils/debounce");
(0, globals_1.describe)('Debounce Utility', () => {
    (0, globals_1.describe)('debounce function', () => {
        let fn;
        let debounced;
        (0, globals_1.beforeEach)(() => {
            globals_1.jest.useFakeTimers();
            fn = globals_1.jest.fn((value) => value * 2);
            debounced = (0, debounce_1.debounce)(fn, 1000);
        });
        afterEach(() => {
            globals_1.jest.useRealTimers();
        });
        (0, globals_1.it)('should delay function execution', () => {
            debounced.execute(5);
            (0, globals_1.expect)(fn).not.toHaveBeenCalled();
            globals_1.jest.advanceTimersByTime(1000);
            (0, globals_1.expect)(fn).toHaveBeenCalledWith(5);
            (0, globals_1.expect)(fn).toHaveBeenCalledTimes(1);
        });
        (0, globals_1.it)('should reset timer on subsequent calls', () => {
            debounced.execute(1);
            globals_1.jest.advanceTimersByTime(500);
            debounced.execute(2);
            globals_1.jest.advanceTimersByTime(500);
            // First call should not have executed yet
            (0, globals_1.expect)(fn).not.toHaveBeenCalled();
            // Complete the delay
            globals_1.jest.advanceTimersByTime(500);
            // Only the second call should execute
            (0, globals_1.expect)(fn).toHaveBeenCalledWith(2);
            (0, globals_1.expect)(fn).toHaveBeenCalledTimes(1);
        });
        (0, globals_1.it)('should execute immediately with immediate option', () => {
            const immediateFn = globals_1.jest.fn((value) => value * 2);
            const immediateDebounced = (0, debounce_1.debounce)(immediateFn, 1000, { immediate: true });
            immediateDebounced.execute(5);
            (0, globals_1.expect)(immediateFn).toHaveBeenCalledWith(5);
            (0, globals_1.expect)(immediateFn).toHaveBeenCalledTimes(1);
        });
        (0, globals_1.it)('should respect maxWait option', () => {
            const maxWaitDebounced = (0, debounce_1.debounce)(fn, 1000, { maxWait: 1500 });
            maxWaitDebounced.execute(1);
            globals_1.jest.advanceTimersByTime(500);
            maxWaitDebounced.execute(2);
            globals_1.jest.advanceTimersByTime(500);
            maxWaitDebounced.execute(3);
            globals_1.jest.advanceTimersByTime(600);
            // Should execute due to maxWait
            (0, globals_1.expect)(fn).toHaveBeenCalled();
        });
        (0, globals_1.it)('should cancel pending execution', () => {
            debounced.execute(5);
            debounced.cancel();
            globals_1.jest.advanceTimersByTime(1000);
            (0, globals_1.expect)(fn).not.toHaveBeenCalled();
        });
        (0, globals_1.it)('should flush pending execution', () => {
            debounced.execute(5);
            const result = debounced.flush();
            (0, globals_1.expect)(fn).toHaveBeenCalledWith(5);
            (0, globals_1.expect)(result).toBe(10);
        });
        (0, globals_1.it)('should report pending status correctly', () => {
            (0, globals_1.expect)(debounced.pending()).toBe(false);
            debounced.execute(5);
            (0, globals_1.expect)(debounced.pending()).toBe(true);
            globals_1.jest.advanceTimersByTime(1000);
            (0, globals_1.expect)(debounced.pending()).toBe(false);
        });
        (0, globals_1.it)('should return time until execution', () => {
            debounced.execute(5);
            const timeUntil = debounced.getTimeUntilExecution();
            (0, globals_1.expect)(timeUntil).toBeGreaterThan(0);
            (0, globals_1.expect)(timeUntil).toBeLessThanOrEqual(1000);
        });
    });
    (0, globals_1.describe)('throttle function', () => {
        let fn;
        let throttled;
        (0, globals_1.beforeEach)(() => {
            globals_1.jest.useFakeTimers();
            fn = globals_1.jest.fn((value) => value * 2);
            throttled = (0, debounce_1.throttle)(fn, 1000);
        });
        afterEach(() => {
            globals_1.jest.useRealTimers();
        });
        (0, globals_1.it)('should execute immediately on first call', () => {
            throttled.execute(5);
            (0, globals_1.expect)(fn).toHaveBeenCalledWith(5);
            (0, globals_1.expect)(fn).toHaveBeenCalledTimes(1);
        });
        (0, globals_1.it)('should throttle subsequent calls', () => {
            throttled.execute(1);
            throttled.execute(2);
            throttled.execute(3);
            // Only first call should have executed
            (0, globals_1.expect)(fn).toHaveBeenCalledTimes(1);
            (0, globals_1.expect)(fn).toHaveBeenCalledWith(1);
        });
        (0, globals_1.it)('should allow calls after delay period', () => {
            throttled.execute(1);
            (0, globals_1.expect)(fn).toHaveBeenCalledTimes(1);
            globals_1.jest.advanceTimersByTime(1000);
            throttled.execute(2);
            (0, globals_1.expect)(fn).toHaveBeenCalledTimes(2);
            (0, globals_1.expect)(fn).toHaveBeenLastCalledWith(2);
        });
        (0, globals_1.it)('should return cached result during throttle period', () => {
            fn.mockReturnValue(10);
            throttled.execute(1);
            const result1 = throttled.execute(2);
            const result2 = throttled.execute(3);
            (0, globals_1.expect)(result1).toBe(10);
            (0, globals_1.expect)(result2).toBe(10);
            (0, globals_1.expect)(fn).toHaveBeenCalledTimes(1);
        });
        (0, globals_1.it)('should cancel pending executions', () => {
            throttled.execute(1);
            throttled.cancel();
            globals_1.jest.advanceTimersByTime(1000);
            (0, globals_1.expect)(fn).toHaveBeenCalledTimes(1);
        });
    });
});
//# sourceMappingURL=debounce.test.js.map