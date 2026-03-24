/**
 * Debounce Utility
 *
 * Delays function execution until after a specified delay has passed
 * since the last invocation. Useful for preventing excessive operations.
 */

export interface DebounceOptions {
    /**
     * Delay in milliseconds
     */
    delay: number;

    /**
     * Whether to execute immediately on the first call (default: false)
     */
    immediate?: boolean;

    /**
     * Maximum time to wait before executing (default: Infinity)
     * Ensures the function is called at least once within this period
     */
    maxWait?: number;
}

/**
 * Debounced function wrapper
 */
export class DebouncedFunction<T extends (...args: any[]) => any> {
    private timeoutId: NodeJS.Timeout | null = null;
    private lastCallTime: number = 0;
    private maxTimeoutId: NodeJS.Timeout | null = null;
    private result: any;
    private isInvoking: boolean = false;

    constructor(
        private func: T,
        private options: DebounceOptions
    ) {}

    /**
     * Execute the debounced function
     */
    execute(...args: Parameters<T>): ReturnType<T> | Promise<ReturnType<T>> {
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
        return undefined as any;
    }

    /**
     * Invoke the actual function
     */
    private invokeFunction(args: Parameters<T>): ReturnType<T> {
        try {
            this.result = this.func(...args);
            return this.result;
        } catch (error) {
            throw error;
        }
    }

    /**
     * Cancel pending execution
     */
    cancel(): void {
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
    flush(): ReturnType<T> | undefined {
        if (this.timeoutId) {
            this.cancel();
            return this.invokeFunction([] as any);
        }
        return undefined;
    }

    /**
     * Check if there's a pending execution
     */
    pending(): boolean {
        return this.timeoutId !== null || this.maxTimeoutId !== null;
    }

    /**
     * Get time until next execution (in milliseconds)
     */
    getTimeUntilExecution(): number {
        if (!this.timeoutId) {
            return 0;
        }
        return this.options.delay - (Date.now() - this.lastCallTime);
    }
}

/**
 * Create a debounced function
 */
export function debounce<T extends (...args: any[]) => any>(
    func: T,
    delay: number,
    options: Partial<DebounceOptions> = {}
): DebouncedFunction<T> {
    const fullOptions: DebounceOptions = {
        delay,
        immediate: options.immediate || false,
        maxWait: options.maxWait,
    };

    return new DebouncedFunction(func, fullOptions);
}

/**
 * Decorator for debouncing methods
 */
export function Debounce(delay: number, options: Partial<DebounceOptions> = {}) {
    return function <T extends (...args: any[]) => any>(
        target: any,
        propertyKey: string,
        descriptor?: PropertyDescriptor
    ): any {
        // Handle both 2-argument and 3-argument decorator signatures
        if (descriptor === undefined) {
            // Called as @Debounce(delay, options) without method descriptor
            return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
                const originalMethod = descriptor.value;
                const debounced = debounce(originalMethod, delay, options);

                descriptor.value = function (...args: any[]) {
                    return debounced.execute(...args);
                };

                // Add cancel and flush methods to the decorated method
                (descriptor.value as any).cancel = () => debounced.cancel();
                (descriptor.value as any).flush = () => debounced.flush();
                (descriptor.value as any).pending = () => debounced.pending();

                return descriptor;
            };
        }

        // Called as @Debounce(delay, options) with method descriptor
        const originalMethod = descriptor.value;
        const debounced = debounce(originalMethod, delay, options);

        descriptor.value = function (...args: any[]) {
            return debounced.execute(...args);
        };

        // Add cancel and flush methods to the decorated method
        (descriptor.value as any).cancel = () => debounced.cancel();
        (descriptor.value as any).flush = () => debounced.flush();
        (descriptor.value as any).pending = () => debounced.pending();

        return descriptor;
    };
}

/**
 * Throttle utility (similar to debounce but ensures regular execution)
 */
export class ThrottledFunction<T extends (...args: any[]) => any> {
    private timeoutId: NodeJS.Timeout | null = null;
    private lastResult: any;
    private lastArgs: Parameters<T> | null = null;

    constructor(
        private func: T,
        private delay: number
    ) {}

    execute(...args: Parameters<T>): ReturnType<T> {
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

    cancel(): void {
        if (this.timeoutId) {
            clearTimeout(this.timeoutId);
            this.timeoutId = null;
        }
        this.lastArgs = null;
    }
}

/**
 * Create a throttled function
 */
export function throttle<T extends (...args: any[]) => any>(
    func: T,
    delay: number
): ThrottledFunction<T> {
    return new ThrottledFunction(func, delay);
}

/**
 * Decorator for throttling methods
 */
export function Throttle(delay: number) {
    return function <T extends (...args: any[]) => any>(
        target: any,
        propertyKey: string,
        descriptor?: PropertyDescriptor
    ): any {
        // Handle both 2-argument and 3-argument decorator signatures
        if (descriptor === undefined) {
            // Called as @Throttle(delay) without method descriptor
            return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
                const originalMethod = descriptor.value;
                const throttled = throttle(originalMethod, delay);

                descriptor.value = function (...args: any[]) {
                    return throttled.execute(...args);
                };

                // Add cancel method to the decorated method
                (descriptor.value as any).cancel = () => throttled.cancel();

                return descriptor;
            };
        }

        // Called as @Throttle(delay) with method descriptor
        const originalMethod = descriptor.value;
        const throttled = throttle(originalMethod, delay);

        descriptor.value = function (...args: any[]) {
            return throttled.execute(...args);
        };

        // Add cancel method to the decorated method
        (descriptor.value as any).cancel = () => throttled.cancel();

        return descriptor;
    };
}
