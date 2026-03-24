"use strict";
/**
 * Debounce Utility
 *
 * Delays function execution until after a specified delay has passed
 * since the last invocation. Useful for preventing excessive operations.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ThrottledFunction = exports.DebouncedFunction = void 0;
exports.debounce = debounce;
exports.Debounce = Debounce;
exports.throttle = throttle;
exports.Throttle = Throttle;
/**
 * Debounced function wrapper
 */
class DebouncedFunction {
    constructor(func, options) {
        this.func = func;
        this.options = options;
        this.timeoutId = null;
        this.lastCallTime = 0;
        this.maxTimeoutId = null;
        this.isInvoking = false;
    }
    /**
     * Execute the debounced function
     */
    execute(...args) {
        const now = Date.now();
        const shouldImmediate = this.options.immediate && !this.timeoutId;
        // Clear existing timeouts
        if (this.timeoutId) {
            clearTimeout(this.timeoutId);
        }
        if (this.maxTimeoutId) {
            clearTimeout(this.maxTimeoutId);
        }
        // Set max wait timeout if specified
        if (this.options.maxWait !== undefined) {
            const maxWait = this.options.maxWait - (now - this.lastCallTime);
            if (maxWait <= 0) {
                // Max wait exceeded, execute immediately
                return this.invokeFunction(args);
            }
            this.maxTimeoutId = setTimeout(() => {
                if (this.timeoutId) {
                    this.invokeFunction(args);
                }
            }, maxWait);
        }
        // Set regular debounce timeout
        if (shouldImmediate) {
            this.isInvoking = true;
            const result = this.invokeFunction(args);
            this.isInvoking = false;
            return result;
        }
        this.timeoutId = setTimeout(() => {
            this.invokeFunction(args);
            this.timeoutId = null;
        }, this.options.delay);
        this.lastCallTime = now;
        // Return undefined for delayed execution
        return undefined;
    }
    /**
     * Invoke the actual function
     */
    invokeFunction(args) {
        try {
            this.result = this.func(...args);
            return this.result;
        }
        catch (error) {
            throw error;
        }
    }
    /**
     * Cancel pending execution
     */
    cancel() {
        if (this.timeoutId) {
            clearTimeout(this.timeoutId);
            this.timeoutId = null;
        }
        if (this.maxTimeoutId) {
            clearTimeout(this.maxTimeoutId);
            this.maxTimeoutId = null;
        }
    }
    /**
     * Execute immediately (flush)
     */
    flush() {
        if (this.timeoutId) {
            this.cancel();
            return this.invokeFunction([]);
        }
        return undefined;
    }
    /**
     * Check if there's a pending execution
     */
    pending() {
        return this.timeoutId !== null || this.maxTimeoutId !== null;
    }
    /**
     * Get time until next execution (in milliseconds)
     */
    getTimeUntilExecution() {
        if (!this.timeoutId) {
            return 0;
        }
        return this.options.delay - (Date.now() - this.lastCallTime);
    }
}
exports.DebouncedFunction = DebouncedFunction;
/**
 * Create a debounced function
 */
function debounce(func, delay, options = {}) {
    const fullOptions = {
        delay,
        immediate: options.immediate || false,
        maxWait: options.maxWait,
    };
    return new DebouncedFunction(func, fullOptions);
}
/**
 * Decorator for debouncing methods
 */
function Debounce(delay, options = {}) {
    return function (target, propertyKey, descriptor) {
        // Handle both 2-argument and 3-argument decorator signatures
        if (descriptor === undefined) {
            // Called as @Debounce(delay, options) without method descriptor
            return function (target, propertyKey, descriptor) {
                const originalMethod = descriptor.value;
                const debounced = debounce(originalMethod, delay, options);
                descriptor.value = function (...args) {
                    return debounced.execute(...args);
                };
                // Add cancel and flush methods to the decorated method
                descriptor.value.cancel = () => debounced.cancel();
                descriptor.value.flush = () => debounced.flush();
                descriptor.value.pending = () => debounced.pending();
                return descriptor;
            };
        }
        // Called as @Debounce(delay, options) with method descriptor
        const originalMethod = descriptor.value;
        const debounced = debounce(originalMethod, delay, options);
        descriptor.value = function (...args) {
            return debounced.execute(...args);
        };
        // Add cancel and flush methods to the decorated method
        descriptor.value.cancel = () => debounced.cancel();
        descriptor.value.flush = () => debounced.flush();
        descriptor.value.pending = () => debounced.pending();
        return descriptor;
    };
}
/**
 * Throttle utility (similar to debounce but ensures regular execution)
 */
class ThrottledFunction {
    constructor(func, delay) {
        this.func = func;
        this.delay = delay;
        this.timeoutId = null;
        this.lastArgs = null;
    }
    execute(...args) {
        this.lastArgs = args;
        if (!this.timeoutId) {
            // Execute immediately
            this.lastResult = this.func(...args);
            // Set up timeout for next execution
            this.timeoutId = setTimeout(() => {
                this.timeoutId = null;
                if (this.lastArgs) {
                    this.lastResult = this.func(...this.lastArgs);
                }
            }, this.delay);
        }
        return this.lastResult;
    }
    cancel() {
        if (this.timeoutId) {
            clearTimeout(this.timeoutId);
            this.timeoutId = null;
        }
        this.lastArgs = null;
    }
}
exports.ThrottledFunction = ThrottledFunction;
/**
 * Create a throttled function
 */
function throttle(func, delay) {
    return new ThrottledFunction(func, delay);
}
/**
 * Decorator for throttling methods
 */
function Throttle(delay) {
    return function (target, propertyKey, descriptor) {
        // Handle both 2-argument and 3-argument decorator signatures
        if (descriptor === undefined) {
            // Called as @Throttle(delay) without method descriptor
            return function (target, propertyKey, descriptor) {
                const originalMethod = descriptor.value;
                const throttled = throttle(originalMethod, delay);
                descriptor.value = function (...args) {
                    return throttled.execute(...args);
                };
                // Add cancel method to the decorated method
                descriptor.value.cancel = () => throttled.cancel();
                return descriptor;
            };
        }
        // Called as @Throttle(delay) with method descriptor
        const originalMethod = descriptor.value;
        const throttled = throttle(originalMethod, delay);
        descriptor.value = function (...args) {
            return throttled.execute(...args);
        };
        // Add cancel method to the decorated method
        descriptor.value.cancel = () => throttled.cancel();
        return descriptor;
    };
}
//# sourceMappingURL=debounce.js.map