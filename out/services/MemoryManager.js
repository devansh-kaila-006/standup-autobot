"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.MemoryManager = void 0;
const vscode = __importStar(require("vscode"));
/**
 * Memory management service for handling data cleanup and optimization
 */
class MemoryManager {
    constructor() {
        this.MAX_CACHE_SIZE = 100;
        this.cache = new Map();
        this.memoryStats = {
            totalCacheEntries: 0,
            totalMemoryUsed: 0,
            cleanupRuns: 0,
            lastCleanupTime: 0,
        };
    }
    /**
     * Clean up old activity data based on retention policy
     */
    async cleanupOldData(context) {
        const config = vscode.workspace.getConfiguration('standup');
        const retentionDays = config.get('dataRetentionDays', 30);
        const activityLog = context.globalState.get('standup.activityLog');
        if (!activityLog || !activityLog.dailyLogs) {
            return { removedEntries: 0, freedMemory: 0, retentionDays };
        }
        const cutoffTime = Date.now() - (retentionDays * 24 * 60 * 60 * 1000);
        let removedEntries = 0;
        const initialSize = JSON.stringify(activityLog).length;
        // Clean up daily logs
        activityLog.dailyLogs = activityLog.dailyLogs.filter((log) => {
            if (log.timestamp && log.timestamp < cutoffTime) {
                removedEntries++;
                return false;
            }
            return true;
        });
        // Clean up history entries
        if (activityLog.history) {
            activityLog.history = activityLog.history.filter((entry) => {
                if (entry.timestamp && entry.timestamp < cutoffTime) {
                    removedEntries++;
                    return false;
                }
                return true;
            });
        }
        // Update last updated time if needed
        if (activityLog.dailyLogs.length > 0) {
            const latestLog = activityLog.dailyLogs[activityLog.dailyLogs.length - 1];
            if (latestLog.timestamp) {
                activityLog.lastUpdated = latestLog.timestamp;
            }
        }
        // Save cleaned data
        await context.globalState.update('standup.activityLog', activityLog);
        const finalSize = JSON.stringify(activityLog).length;
        const freedMemory = initialSize - finalSize;
        // Update stats
        this.memoryStats.cleanupRuns++;
        this.memoryStats.lastCleanupTime = Date.now();
        return {
            removedEntries,
            freedMemory,
            retentionDays,
        };
    }
    /**
     * Preview cleanup without actually deleting data
     */
    previewCleanup(context) {
        const config = vscode.workspace.getConfiguration('standup');
        const retentionDays = config.get('dataRetentionDays', 30);
        const activityLog = context.globalState.get('standup.activityLog');
        if (!activityLog) {
            return {
                entriesToRemove: [],
                totalEntries: 0,
                retentionDays,
                estimatedMemoryToFree: 0,
            };
        }
        const cutoffTime = Date.now() - (retentionDays * 24 * 60 * 60 * 1000);
        const entriesToRemove = [];
        let totalEntries = 0;
        // Check daily logs
        if (activityLog.dailyLogs) {
            totalEntries += activityLog.dailyLogs.length;
            activityLog.dailyLogs.forEach((log) => {
                if (log.timestamp && log.timestamp < cutoffTime) {
                    entriesToRemove.push({
                        type: 'dailyLog',
                        date: new Date(log.timestamp).toLocaleDateString(),
                        timestamp: log.timestamp,
                    });
                }
            });
        }
        // Check history entries
        if (activityLog.history) {
            totalEntries += activityLog.history.length;
            activityLog.history.forEach((entry) => {
                if (entry.timestamp && entry.timestamp < cutoffTime) {
                    entriesToRemove.push({
                        type: 'historyEntry',
                        id: entry.id,
                        date: new Date(entry.timestamp).toLocaleDateString(),
                        timestamp: entry.timestamp,
                    });
                }
            });
        }
        // Estimate memory to free (rough estimate: 500 bytes per entry)
        const estimatedMemoryToFree = entriesToRemove.length * 500;
        return {
            entriesToRemove,
            totalEntries,
            retentionDays,
            estimatedMemoryToFree,
        };
    }
    /**
     * Get memory statistics
     */
    getMemoryStats() {
        const currentMemoryUsed = this.estimateMemoryUsage();
        const memoryEfficiency = this.cache.size > 0
            ? ((this.cache.size / this.MAX_CACHE_SIZE) * 100)
            : 0;
        return {
            cacheSize: this.cache.size,
            totalCacheEntries: this.memoryStats.totalCacheEntries,
            totalMemoryUsed: this.memoryStats.totalMemoryUsed + currentMemoryUsed,
            cleanupRuns: this.memoryStats.cleanupRuns,
            lastCleanupTime: this.memoryStats.lastCleanupTime,
            memoryEfficiency,
        };
    }
    /**
     * LRU Cache implementation for frequently accessed data
     */
    setCache(key, data) {
        // Check if we need to evict (LRU policy)
        if (this.cache.size >= this.MAX_CACHE_SIZE && !this.cache.has(key)) {
            this.evictLRU();
        }
        const timestamp = Date.now();
        const existingEntry = this.cache.get(key);
        this.cache.set(key, {
            data,
            timestamp,
            accessCount: existingEntry ? existingEntry.accessCount + 1 : 1,
        });
        this.memoryStats.totalCacheEntries = this.cache.size;
    }
    /**
     * Get data from cache (updates access time for LRU)
     */
    getCache(key) {
        const entry = this.cache.get(key);
        if (entry) {
            entry.timestamp = Date.now();
            entry.accessCount++;
            return entry.data;
        }
        return undefined;
    }
    /**
     * Clear specific cache entry
     */
    clearCache(key) {
        const result = this.cache.delete(key);
        this.memoryStats.totalCacheEntries = this.cache.size;
        return result;
    }
    /**
     * Clear all cache
     */
    clearAllCache() {
        const previousSize = this.cache.size;
        this.cache.clear();
        this.memoryStats.totalCacheEntries = 0;
        this.memoryStats.totalMemoryUsed -= this.estimateMemoryUsage();
    }
    /**
     * Evict least recently used cache entry
     */
    evictLRU() {
        let oldestKey;
        let oldestTime = Infinity;
        for (const [key, value] of this.cache.entries()) {
            if (value.timestamp < oldestTime) {
                oldestTime = value.timestamp;
                oldestKey = key;
            }
        }
        if (oldestKey) {
            this.cache.delete(oldestKey);
        }
    }
    /**
     * Get cache statistics
     */
    getCacheStats() {
        const entries = Array.from(this.cache.entries()).map(([key, value]) => ({
            key,
            accessCount: value.accessCount,
        }));
        const mostAccessed = entries
            .sort((a, b) => b.accessCount - a.accessCount)
            .slice(0, 5);
        return {
            size: this.cache.size,
            maxSize: this.MAX_CACHE_SIZE,
            utilizationPercent: (this.cache.size / this.MAX_CACHE_SIZE) * 100,
            mostAccessed,
        };
    }
    /**
     * Lazy loading for history data
     */
    async loadHistoryLazy(context, options = {}) {
        const activityLog = context.globalState.get('standup.activityLog');
        if (!activityLog || !activityLog.history) {
            return [];
        }
        let history = activityLog.history;
        // Apply date range filter if specified
        if (options.dateRange) {
            const { start, end } = options.dateRange;
            history = history.filter((entry) => {
                const entryDate = new Date(entry.timestamp);
                return entryDate >= start && entryDate <= end;
            });
        }
        // Apply offset
        if (options.offset && options.offset > 0) {
            history = history.slice(options.offset);
        }
        // Apply limit
        if (options.limit && options.limit > 0) {
            history = history.slice(0, options.limit);
        }
        return history;
    }
    /**
     * Batch data aggregation for efficient processing
     */
    aggregateDataByDateRange(context, startDate, endDate) {
        const activityLog = context.globalState.get('standup.activityLog');
        if (!activityLog || !activityLog.dailyLogs) {
            return [];
        }
        const aggregated = new Map();
        activityLog.dailyLogs.forEach((log) => {
            const logDate = new Date(log.timestamp);
            if (logDate >= startDate && logDate <= endDate) {
                const dateKey = logDate.toISOString().split('T')[0];
                if (!aggregated.has(dateKey)) {
                    aggregated.set(dateKey, {
                        activityCount: 0,
                        fileCount: 0,
                        commitCount: 0,
                    });
                }
                const stats = aggregated.get(dateKey);
                stats.activityCount++;
                if (log.activities) {
                    stats.fileCount += log.activities.filter((a) => a.type === 'file').length || 0;
                    stats.commitCount += log.activities.filter((a) => a.type === 'git').length || 0;
                }
            }
        });
        return Array.from(aggregated.entries()).map(([date, stats]) => ({
            date,
            ...stats,
        }));
    }
    /**
     * Memory profiling - detect potential memory leaks
     */
    detectMemoryLeaks() {
        const leakIndicators = [];
        const recommendations = [];
        const stats = this.getMemoryStats();
        // Check cache utilization
        if (stats.cacheSize >= this.MAX_CACHE_SIZE * 0.9) {
            leakIndicators.push('Cache is near maximum capacity');
            recommendations.push('Consider reducing cache retention time or increasing cache size');
        }
        // Check memory efficiency
        if (stats.memoryEfficiency > 90) {
            leakIndicators.push('High memory efficiency indicates potential memory growth');
            recommendations.push('Review cache eviction policy and data retention settings');
        }
        // Check cleanup frequency
        if (stats.cleanupRuns === 0) {
            leakIndicators.push('No cleanup runs detected');
            recommendations.push('Run manual cleanup or configure automatic cleanup schedule');
        }
        // Check last cleanup time
        const daysSinceLastCleanup = (Date.now() - stats.lastCleanupTime) / (1000 * 60 * 60 * 24);
        if (daysSinceLastCleanup > 7) {
            leakIndicators.push(`Last cleanup was ${Math.floor(daysSinceLastCleanup)} days ago`);
            recommendations.push('Consider scheduling regular cleanup (recommended: weekly)');
        }
        const hasLeaks = leakIndicators.length > 0;
        return {
            hasLeaks,
            leakIndicators,
            recommendations,
        };
    }
    /**
     * Estimate memory usage (rough approximation)
     */
    estimateMemoryUsage() {
        let size = 0;
        for (const [key, value] of this.cache.entries()) {
            // Rough estimate: key size + JSON stringified data size
            size += key.length + JSON.stringify(value.data).length * 2; // 2 bytes per character
        }
        return size;
    }
    /**
     * Optimize webview memory usage
     */
    optimizeWebviewMemory(webview) {
        // Clear any large data that might be held in webview
        try {
            // Send message to webview to clear caches
            webview.postMessage({
                command: 'clearCache',
            });
        }
        catch (error) {
            // Webview might not be active
            console.debug('Could not send clear cache command to webview:', error);
        }
    }
    /**
     * Run automatic cleanup if needed
     */
    async runAutomaticCleanup(context) {
        const config = vscode.workspace.getConfiguration('standup');
        const autoCleanupEnabled = config.get('autoCleanupEnabled', false);
        if (!autoCleanupEnabled) {
            return false;
        }
        const stats = this.getMemoryStats();
        const daysSinceLastCleanup = (Date.now() - stats.lastCleanupTime) / (1000 * 60 * 60 * 24);
        const cleanupIntervalDays = config.get('cleanupIntervalDays', 7);
        if (daysSinceLastCleanup >= cleanupIntervalDays) {
            await this.cleanupOldData(context);
            return true;
        }
        return false;
    }
    /**
     * Reset memory statistics
     */
    resetStats() {
        this.memoryStats = {
            totalCacheEntries: 0,
            totalMemoryUsed: 0,
            cleanupRuns: 0,
            lastCleanupTime: 0,
        };
    }
    /**
     * Get diagnostic report
     */
    getDiagnosticReport() {
        const memoryStats = this.getMemoryStats();
        const cacheStats = this.getCacheStats();
        const leakDetection = this.detectMemoryLeaks();
        // Calculate health score (0-100)
        let healthScore = 100;
        if (leakDetection.hasLeaks) {
            healthScore -= leakDetection.leakIndicators.length * 15;
        }
        if (cacheStats.utilizationPercent > 90) {
            healthScore -= 10;
        }
        if (memoryStats.cleanupRuns === 0) {
            healthScore -= 20;
        }
        healthScore = Math.max(0, healthScore);
        return {
            memoryStats,
            cacheStats,
            leakDetection,
            recommendations: leakDetection.recommendations,
            healthScore,
        };
    }
    /**
     * Dispose of resources
     */
    dispose() {
        this.clearAllCache();
        this.resetStats();
    }
}
exports.MemoryManager = MemoryManager;
//# sourceMappingURL=MemoryManager.js.map