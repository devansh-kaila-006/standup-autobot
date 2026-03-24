import * as vscode from 'vscode';
/**
 * Memory management service for handling data cleanup and optimization
 */
export declare class MemoryManager {
    private readonly MAX_CACHE_SIZE;
    private cache;
    private memoryStats;
    /**
     * Clean up old activity data based on retention policy
     */
    cleanupOldData(context: vscode.ExtensionContext): Promise<{
        removedEntries: number;
        freedMemory: number;
        retentionDays: number;
    }>;
    /**
     * Preview cleanup without actually deleting data
     */
    previewCleanup(context: vscode.ExtensionContext): {
        entriesToRemove: any[];
        totalEntries: number;
        retentionDays: number;
        estimatedMemoryToFree: number;
    };
    /**
     * Get memory statistics
     */
    getMemoryStats(): {
        cacheSize: number;
        totalCacheEntries: number;
        totalMemoryUsed: number;
        cleanupRuns: number;
        lastCleanupTime: number;
        memoryEfficiency: number;
    };
    /**
     * LRU Cache implementation for frequently accessed data
     */
    setCache(key: string, data: any): void;
    /**
     * Get data from cache (updates access time for LRU)
     */
    getCache(key: string): any | undefined;
    /**
     * Clear specific cache entry
     */
    clearCache(key: string): boolean;
    /**
     * Clear all cache
     */
    clearAllCache(): void;
    /**
     * Evict least recently used cache entry
     */
    private evictLRU;
    /**
     * Get cache statistics
     */
    getCacheStats(): {
        size: number;
        maxSize: number;
        utilizationPercent: number;
        mostAccessed: Array<{
            key: string;
            accessCount: number;
        }>;
    };
    /**
     * Lazy loading for history data
     */
    loadHistoryLazy(context: vscode.ExtensionContext, options?: {
        limit?: number;
        offset?: number;
        dateRange?: {
            start: Date;
            end: Date;
        };
    }): Promise<any[]>;
    /**
     * Batch data aggregation for efficient processing
     */
    aggregateDataByDateRange(context: vscode.ExtensionContext, startDate: Date, endDate: Date): {
        date: string;
        activityCount: number;
        fileCount: number;
        commitCount: number;
    }[];
    /**
     * Memory profiling - detect potential memory leaks
     */
    detectMemoryLeaks(): {
        hasLeaks: boolean;
        leakIndicators: string[];
        recommendations: string[];
    };
    /**
     * Estimate memory usage (rough approximation)
     */
    private estimateMemoryUsage;
    /**
     * Optimize webview memory usage
     */
    optimizeWebviewMemory(webview: vscode.Webview): void;
    /**
     * Run automatic cleanup if needed
     */
    runAutomaticCleanup(context: vscode.ExtensionContext): Promise<boolean>;
    /**
     * Reset memory statistics
     */
    resetStats(): void;
    /**
     * Get diagnostic report
     */
    getDiagnosticReport(): {
        memoryStats: any;
        cacheStats: any;
        leakDetection: any;
        recommendations: string[];
        healthScore: number;
    };
    /**
     * Dispose of resources
     */
    dispose(): void;
}
//# sourceMappingURL=MemoryManager.d.ts.map