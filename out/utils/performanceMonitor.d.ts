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
export declare class PerformanceMonitor {
    private metrics;
    private enabled;
    private maxMetricsPerOperation;
    constructor(enabled?: boolean);
    /**
     * Start measuring an operation
     */
    start(name: string, metadata?: Record<string, any>): () => void;
    /**
     * Record a performance metric
     */
    private recordMetric;
    /**
     * Get statistics for a specific operation
     */
    getStats(name: string): PerformanceStats | null;
    /**
     * Get all statistics
     */
    getAllStats(): PerformanceStats[];
    /**
     * Generate a comprehensive performance report
     */
    generateReport(): PerformanceReport;
    /**
     * Generate performance recommendations
     */
    private generateRecommendations;
    /**
     * Clear all metrics
     */
    clear(): void;
    /**
     * Clear metrics for a specific operation
     */
    clearOperation(name: string): void;
    /**
     * Enable/disable monitoring
     */
    setEnabled(enabled: boolean): void;
    /**
     * Check if monitoring is enabled
     */
    isEnabled(): boolean;
    /**
     * Set maximum metrics to store per operation
     */
    setMaxMetricsPerOperation(max: number): void;
    /**
     * Export metrics as JSON
     */
    exportMetrics(): string;
    /**
     * Get metrics for visualization
     */
    getMetricsForVisualization(): Array<{
        name: string;
        count: number;
        avgDuration: number;
        totalDuration: number;
    }>;
}
/**
 * Global performance monitor instance
 */
export declare const globalPerformanceMonitor: PerformanceMonitor;
/**
 * Decorator for measuring method performance
 */
export declare function MeasurePerformance(name?: string): <T extends (...args: any[]) => any>(target: any, propertyKey: string, descriptor?: PropertyDescriptor) => any;
/**
 * Measure an async function's performance
 */
export declare function measureAsyncPerformance<T>(name: string, fn: () => Promise<T>): Promise<T>;
/**
 * Measure a sync function's performance
 */
export declare function measurePerformance<T>(name: string, fn: () => T): T;
//# sourceMappingURL=performanceMonitor.d.ts.map