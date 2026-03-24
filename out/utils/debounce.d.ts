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
export declare class DebouncedFunction<T extends (...args: any[]) => any> {
    private func;
    private options;
    private timeoutId;
    private lastCallTime;
    private maxTimeoutId;
    private result;
    private isInvoking;
    constructor(func: T, options: DebounceOptions);
    /**
     * Execute the debounced function
     */
    execute(...args: Parameters<T>): ReturnType<T> | Promise<ReturnType<T>>;
    /**
     * Invoke the actual function
     */
    private invokeFunction;
    /**
     * Cancel pending execution
     */
    cancel(): void;
    /**
     * Execute immediately (flush)
     */
    flush(): ReturnType<T> | undefined;
    /**
     * Check if there's a pending execution
     */
    pending(): boolean;
    /**
     * Get time until next execution (in milliseconds)
     */
    getTimeUntilExecution(): number;
}
/**
 * Create a debounced function
 */
export declare function debounce<T extends (...args: any[]) => any>(func: T, delay: number, options?: Partial<DebounceOptions>): DebouncedFunction<T>;
/**
 * Decorator for debouncing methods
 */
export declare function Debounce(delay: number, options?: Partial<DebounceOptions>): <T extends (...args: any[]) => any>(target: any, propertyKey: string, descriptor?: PropertyDescriptor) => any;
/**
 * Throttle utility (similar to debounce but ensures regular execution)
 */
export declare class ThrottledFunction<T extends (...args: any[]) => any> {
    private func;
    private delay;
    private timeoutId;
    private lastResult;
    private lastArgs;
    constructor(func: T, delay: number);
    execute(...args: Parameters<T>): ReturnType<T>;
    cancel(): void;
}
/**
 * Create a throttled function
 */
export declare function throttle<T extends (...args: any[]) => any>(func: T, delay: number): ThrottledFunction<T>;
/**
 * Decorator for throttling methods
 */
export declare function Throttle(delay: number): <T extends (...args: any[]) => any>(target: any, propertyKey: string, descriptor?: PropertyDescriptor) => any;
//# sourceMappingURL=debounce.d.ts.map