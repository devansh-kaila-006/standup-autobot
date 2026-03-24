/**
 * Performance Monitoring Utility
 *
 * Tracks performance metrics for operations and provides insights.
 */

export interface PerformanceMetric {
    name: string;
    duration: number;
    timestamp: number;
    metadata?: Record<string, any>;
}

export interface PerformanceStats {
    name: string;
    count: number;
    totalDuration: number;
    averageDuration: number;
    minDuration: number;
    maxDuration: number;
    lastExecution: number;
}

export interface PerformanceReport {
    metrics: PerformanceStats[];
    summary: {
        totalOperations: number;
        totalDuration: number;
        averageDuration: number;
        slowestOperation: string;
        fastestOperation: string;
        mostFrequentOperation: string;
    };
    recommendations: string[];
}

/**
 * Performance Monitor Class
 */
export class PerformanceMonitor {
    private metrics: Map<string, PerformanceMetric[]> = new Map();
    private enabled: boolean = true;
    private maxMetricsPerOperation: number = 1000;

    constructor(enabled: boolean = true) {
        this.enabled = enabled;
    }

    /**
     * Start measuring an operation
     */
    start(name: string, metadata?: Record<string, any>): () => void {
        if (!this.enabled) {
            return () => {};
        }

        const startTime = performance.now();

        return () => {
            const endTime = performance.now();
            const duration = endTime - startTime;

            this.recordMetric({
                name,
                duration,
                timestamp: Date.now(),
                metadata,
            });
        };
    }

    /**
     * Record a performance metric
     */
    private recordMetric(metric: PerformanceMetric): void {
        if (!this.enabled) {
            return;
        }

        if (!this.metrics.has(metric.name)) {
            this.metrics.set(metric.name, []);
        }

        const operationMetrics = this.metrics.get(metric.name)!;
        operationMetrics.push(metric);

        // Keep only the most recent metrics
        if (operationMetrics.length > this.maxMetricsPerOperation) {
            operationMetrics.shift();
        }
    }

    /**
     * Get statistics for a specific operation
     */
    getStats(name: string): PerformanceStats | null {
        const metrics = this.metrics.get(name);
        if (!metrics || metrics.length === 0) {
            return null;
        }

        const durations = metrics.map(m => m.duration);

        return {
            name,
            count: metrics.length,
            totalDuration: durations.reduce((a, b) => a + b, 0),
            averageDuration: durations.reduce((a, b) => a + b, 0) / durations.length,
            minDuration: Math.min(...durations),
            maxDuration: Math.max(...durations),
            lastExecution: metrics[metrics.length - 1].timestamp,
        };
    }

    /**
     * Get all statistics
     */
    getAllStats(): PerformanceStats[] {
        const stats: PerformanceStats[] = [];

        for (const [name] of this.metrics) {
            const stat = this.getStats(name);
            if (stat) {
                stats.push(stat);
            }
        }

        return stats.sort((a, b) => b.totalDuration - a.totalDuration);
    }

    /**
     * Generate a comprehensive performance report
     */
    generateReport(): PerformanceReport {
        const stats = this.getAllStats();

        if (stats.length === 0) {
            return {
                metrics: [],
                summary: {
                    totalOperations: 0,
                    totalDuration: 0,
                    averageDuration: 0,
                    slowestOperation: 'N/A',
                    fastestOperation: 'N/A',
                    mostFrequentOperation: 'N/A',
                },
                recommendations: [],
            };
        }

        const totalOperations = stats.reduce((sum, s) => sum + s.count, 0);
        const totalDuration = stats.reduce((sum, s) => sum + s.totalDuration, 0);
        const averageDuration = totalDuration / totalOperations;

        const slowestOperation = stats.reduce((max, s) =>
            s.maxDuration > max.maxDuration ? s : max
        );
        const fastestOperation = stats.reduce((min, s) =>
            s.minDuration < min.minDuration ? s : min
        );
        const mostFrequentOperation = stats.reduce((max, s) =>
            s.count > max.count ? s : max
        );

        return {
            metrics: stats,
            summary: {
                totalOperations,
                totalDuration,
                averageDuration,
                slowestOperation: slowestOperation.name,
                fastestOperation: fastestOperation.name,
                mostFrequentOperation: mostFrequentOperation.name,
            },
            recommendations: this.generateRecommendations(stats),
        };
    }

    /**
     * Generate performance recommendations
     */
    private generateRecommendations(stats: PerformanceStats[]): string[] {
        const recommendations: string[] = [];

        for (const stat of stats) {
            // Check for slow operations
            if (stat.averageDuration > 1000) {
                recommendations.push(
                    `${stat.name} is slow (avg: ${stat.averageDuration.toFixed(2)}ms). Consider caching or optimization.`
                );
            }

            // Check for inconsistent performance
            const variance = stat.maxDuration - stat.minDuration;
            if (variance > stat.averageDuration * 2) {
                recommendations.push(
                    `${stat.name} has inconsistent performance (min: ${stat.minDuration.toFixed(2)}ms, max: ${stat.maxDuration.toFixed(2)}ms). Investigate variability.`
                );
            }

            // Check for high frequency operations
            if (stat.count > 1000 && stat.averageDuration > 100) {
                recommendations.push(
                    `${stat.name} is called frequently (${stat.count} times) with moderate duration. Consider debouncing or batching.`
                );
            }
        }

        return recommendations;
    }

    /**
     * Clear all metrics
     */
    clear(): void {
        this.metrics.clear();
    }

    /**
     * Clear metrics for a specific operation
     */
    clearOperation(name: string): void {
        this.metrics.delete(name);
    }

    /**
     * Enable/disable monitoring
     */
    setEnabled(enabled: boolean): void {
        this.enabled = enabled;
    }

    /**
     * Check if monitoring is enabled
     */
    isEnabled(): boolean {
        return this.enabled;
    }

    /**
     * Set maximum metrics to store per operation
     */
    setMaxMetricsPerOperation(max: number): void {
        this.maxMetricsPerOperation = max;
    }

    /**
     * Export metrics as JSON
     */
    exportMetrics(): string {
        const data: Record<string, PerformanceMetric[]> = {};

        for (const [name, metrics] of this.metrics) {
            data[name] = metrics;
        }

        return JSON.stringify(data, null, 2);
    }

    /**
     * Get metrics for visualization
     */
    getMetricsForVisualization(): Array<{
        name: string;
        count: number;
        avgDuration: number;
        totalDuration: number;
    }> {
        return this.getAllStats().map(stat => ({
            name: stat.name,
            count: stat.count,
            avgDuration: stat.averageDuration,
            totalDuration: stat.totalDuration,
        }));
    }
}

/**
 * Global performance monitor instance
 */
export const globalPerformanceMonitor = new PerformanceMonitor();

/**
 * Decorator for measuring method performance
 */
export function MeasurePerformance(name?: string) {
    return function <T extends (...args: any[]) => any>(
        target: any,
        propertyKey: string,
        descriptor?: PropertyDescriptor
    ): any {
        // Handle both 2-argument and 3-argument decorator signatures
        if (descriptor === undefined) {
            // Called as @MeasurePerformance(name) without method descriptor
            return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
                const originalMethod = descriptor.value;
                const operationName = name || `${target.constructor.name}.${propertyKey}`;

                descriptor.value = function (...args: any[]) {
                    const stop = globalPerformanceMonitor.start(operationName);
                    try {
                        const result = originalMethod.apply(this, args);
                        stop();
                        return result;
                    } catch (error) {
                        stop();
                        throw error;
                    }
                };

                return descriptor;
            };
        }

        // Called as @MeasurePerformance(name) with method descriptor
        const originalMethod = descriptor.value;
        const operationName = name || `${target.constructor.name}.${propertyKey}`;

        descriptor.value = function (...args: any[]) {
            const stop = globalPerformanceMonitor.start(operationName);
            try {
                const result = originalMethod.apply(this, args);
                stop();
                return result;
            } catch (error) {
                stop();
                throw error;
            }
        };

        return descriptor;
    };
}

/**
 * Measure an async function's performance
 */
export async function measureAsyncPerformance<T>(
    name: string,
    fn: () => Promise<T>
): Promise<T> {
    const stop = globalPerformanceMonitor.start(name);
    try {
        return await fn();
    } finally {
        stop();
    }
}

/**
 * Measure a sync function's performance
 */
export function measurePerformance<T>(
    name: string,
    fn: () => T
): T {
    const stop = globalPerformanceMonitor.start(name);
    try {
        return fn();
    } finally {
        stop();
    }
}
