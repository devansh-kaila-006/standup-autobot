"use strict";
/**
 * Performance Monitoring Utility
 *
 * Tracks performance metrics for operations and provides insights.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.globalPerformanceMonitor = exports.PerformanceMonitor = void 0;
exports.MeasurePerformance = MeasurePerformance;
exports.measureAsyncPerformance = measureAsyncPerformance;
exports.measurePerformance = measurePerformance;
/**
 * Performance Monitor Class
 */
class PerformanceMonitor {
    constructor(enabled = true) {
        this.metrics = new Map();
        this.enabled = true;
        this.maxMetricsPerOperation = 1000;
        this.enabled = enabled;
    }
    /**
     * Start measuring an operation
     */
    start(name, metadata) {
        if (!this.enabled) {
            return () => { };
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
    recordMetric(metric) {
        if (!this.enabled) {
            return;
        }
        if (!this.metrics.has(metric.name)) {
            this.metrics.set(metric.name, []);
        }
        const operationMetrics = this.metrics.get(metric.name);
        operationMetrics.push(metric);
        // Keep only the most recent metrics
        if (operationMetrics.length > this.maxMetricsPerOperation) {
            operationMetrics.shift();
        }
    }
    /**
     * Get statistics for a specific operation
     */
    getStats(name) {
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
    getAllStats() {
        const stats = [];
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
    generateReport() {
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
        const slowestOperation = stats.reduce((max, s) => s.maxDuration > max.maxDuration ? s : max);
        const fastestOperation = stats.reduce((min, s) => s.minDuration < min.minDuration ? s : min);
        const mostFrequentOperation = stats.reduce((max, s) => s.count > max.count ? s : max);
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
    generateRecommendations(stats) {
        const recommendations = [];
        for (const stat of stats) {
            // Check for slow operations
            if (stat.averageDuration > 1000) {
                recommendations.push(`${stat.name} is slow (avg: ${stat.averageDuration.toFixed(2)}ms). Consider caching or optimization.`);
            }
            // Check for inconsistent performance
            const variance = stat.maxDuration - stat.minDuration;
            if (variance > stat.averageDuration * 2) {
                recommendations.push(`${stat.name} has inconsistent performance (min: ${stat.minDuration.toFixed(2)}ms, max: ${stat.maxDuration.toFixed(2)}ms). Investigate variability.`);
            }
            // Check for high frequency operations
            if (stat.count > 1000 && stat.averageDuration > 100) {
                recommendations.push(`${stat.name} is called frequently (${stat.count} times) with moderate duration. Consider debouncing or batching.`);
            }
        }
        return recommendations;
    }
    /**
     * Clear all metrics
     */
    clear() {
        this.metrics.clear();
    }
    /**
     * Clear metrics for a specific operation
     */
    clearOperation(name) {
        this.metrics.delete(name);
    }
    /**
     * Enable/disable monitoring
     */
    setEnabled(enabled) {
        this.enabled = enabled;
    }
    /**
     * Check if monitoring is enabled
     */
    isEnabled() {
        return this.enabled;
    }
    /**
     * Set maximum metrics to store per operation
     */
    setMaxMetricsPerOperation(max) {
        this.maxMetricsPerOperation = max;
    }
    /**
     * Export metrics as JSON
     */
    exportMetrics() {
        const data = {};
        for (const [name, metrics] of this.metrics) {
            data[name] = metrics;
        }
        return JSON.stringify(data, null, 2);
    }
    /**
     * Get metrics for visualization
     */
    getMetricsForVisualization() {
        return this.getAllStats().map(stat => ({
            name: stat.name,
            count: stat.count,
            avgDuration: stat.averageDuration,
            totalDuration: stat.totalDuration,
        }));
    }
}
exports.PerformanceMonitor = PerformanceMonitor;
/**
 * Global performance monitor instance
 */
exports.globalPerformanceMonitor = new PerformanceMonitor();
/**
 * Decorator for measuring method performance
 */
function MeasurePerformance(name) {
    return function (target, propertyKey, descriptor) {
        // Handle both 2-argument and 3-argument decorator signatures
        if (descriptor === undefined) {
            // Called as @MeasurePerformance(name) without method descriptor
            return function (target, propertyKey, descriptor) {
                const originalMethod = descriptor.value;
                const operationName = name || `${target.constructor.name}.${propertyKey}`;
                descriptor.value = function (...args) {
                    const stop = exports.globalPerformanceMonitor.start(operationName);
                    try {
                        const result = originalMethod.apply(this, args);
                        stop();
                        return result;
                    }
                    catch (error) {
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
        descriptor.value = function (...args) {
            const stop = exports.globalPerformanceMonitor.start(operationName);
            try {
                const result = originalMethod.apply(this, args);
                stop();
                return result;
            }
            catch (error) {
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
async function measureAsyncPerformance(name, fn) {
    const stop = exports.globalPerformanceMonitor.start(name);
    try {
        return await fn();
    }
    finally {
        stop();
    }
}
/**
 * Measure a sync function's performance
 */
function measurePerformance(name, fn) {
    const stop = exports.globalPerformanceMonitor.start(name);
    try {
        return fn();
    }
    finally {
        stop();
    }
}
//# sourceMappingURL=performanceMonitor.js.map