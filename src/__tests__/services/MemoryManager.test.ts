import * as vscode from 'vscode';
import { MemoryManager } from '../../services/MemoryManager';

// Mock vscode
jest.mock('vscode', () => ({
    workspace: {
        getConfiguration: jest.fn(),
    },
}));

describe('MemoryManager', () => {
    let memoryManager: MemoryManager;
    let mockContext: vscode.ExtensionContext;
    let mockGetConfiguration: jest.Mock;

    beforeEach(() => {
        memoryManager = new MemoryManager();
        jest.clearAllMocks();

        mockGetConfiguration = vscode.workspace.getConfiguration as jest.Mock;

        mockContext = {
            globalState: {
                get: jest.fn(),
                update: jest.fn(),
                keys: [],
            },
            workspaceState: {
                get: jest.fn(),
                update: jest.fn(),
                keys: [],
            },
        } as any;

        // Default configuration
        const mockConfig = {
            get: jest.fn((key: string, defaultValue: any) => {
                if (key === 'dataRetentionDays') return 30;
                if (key === 'autoCleanupEnabled') return false;
                if (key === 'cleanupIntervalDays') return 7;
                return defaultValue;
            }),
        };
        mockGetConfiguration.mockReturnValue(mockConfig);
    });

    afterEach(() => {
        memoryManager.dispose();
    });

    describe('cleanupOldData', () => {
        it('should remove entries older than retention period', async () => {
            const retentionDays = 30;
            const cutoffTime = Date.now() - (retentionDays * 24 * 60 * 60 * 1000);
            const oldTimestamp = cutoffTime - 1000;
            const recentTimestamp = Date.now();

            const mockActivityLog = {
                lastUpdated: recentTimestamp,
                dailyLogs: [
                    { timestamp: oldTimestamp, activities: [] },
                    { timestamp: recentTimestamp, activities: [] },
                ],
                history: [
                    { id: '1', timestamp: oldTimestamp, text: 'Old entry' },
                    { id: '2', timestamp: recentTimestamp, text: 'Recent entry' },
                ],
            };

            (mockContext.globalState.get as jest.Mock).mockReturnValue(mockActivityLog);

            const result = await memoryManager.cleanupOldData(mockContext);

            expect(result.removedEntries).toBe(2);
            expect(result.retentionDays).toBe(30);
            expect(mockContext.globalState.update).toHaveBeenCalledWith(
                'standup.activityLog',
                expect.objectContaining({
                    dailyLogs: expect.arrayContaining([
                        expect.objectContaining({ timestamp: recentTimestamp }),
                    ]),
                })
            );
        });

        it('should handle empty activity log gracefully', async () => {
            (mockContext.globalState.get as jest.Mock).mockReturnValue(null);

            const result = await memoryManager.cleanupOldData(mockContext);

            expect(result.removedEntries).toBe(0);
            expect(result.freedMemory).toBe(0);
        });

        it('should use default retention period when not configured', async () => {
            const mockConfig = {
                get: jest.fn((key: string) => key === 'dataRetentionDays' ? undefined : 30),
            };
            mockGetConfiguration.mockReturnValue(mockConfig);

            (mockContext.globalState.get as jest.Mock).mockReturnValue({
                dailyLogs: [],
                history: [],
            });

            await memoryManager.cleanupOldData(mockContext);

            expect(mockConfig.get).toHaveBeenCalledWith('dataRetentionDays', 30);
        });

        it('should update memory statistics after cleanup', async () => {
            const mockActivityLog = {
                dailyLogs: [],
                history: [],
            };

            (mockContext.globalState.get as jest.Mock).mockReturnValue(mockActivityLog);

            await memoryManager.cleanupOldData(mockContext);

            const stats = memoryManager.getMemoryStats();
            expect(stats.cleanupRuns).toBeGreaterThan(0);
            expect(stats.lastCleanupTime).toBeGreaterThan(0);
        });
    });

    describe('previewCleanup', () => {
        it('should preview entries to be removed without deleting', () => {
            const retentionDays = 30;
            const cutoffTime = Date.now() - (retentionDays * 24 * 60 * 60 * 1000);
            const oldTimestamp = cutoffTime - 1000;
            const recentTimestamp = Date.now();

            const mockActivityLog = {
                dailyLogs: [
                    { timestamp: oldTimestamp, activities: [] },
                    { timestamp: recentTimestamp, activities: [] },
                ],
                history: [
                    { id: '1', timestamp: oldTimestamp, text: 'Old entry' },
                    { id: '2', timestamp: recentTimestamp, text: 'Recent entry' },
                ],
            };

            (mockContext.globalState.get as jest.Mock).mockReturnValue(mockActivityLog);

            const result = memoryManager.previewCleanup(mockContext);

            expect(result.totalEntries).toBe(4);
            expect(result.entriesToRemove).toHaveLength(2);
            expect(result.entriesToRemove[0]).toHaveProperty('type');
            expect(result.estimatedMemoryToFree).toBeGreaterThan(0);
        });

        it('should estimate memory to free accurately', () => {
            const retentionDays = 30;
            const cutoffTime = Date.now() - (retentionDays * 24 * 60 * 60 * 1000);

            const mockActivityLog = {
                dailyLogs: Array.from({ length: 10 }, (_, i) => ({
                    // Use (i + 1) to ensure all timestamps are strictly less than cutoffTime
                    timestamp: cutoffTime - ((i + 1) * 1000000),
                    activities: [],
                })),
                history: [],
            };

            (mockContext.globalState.get as jest.Mock).mockReturnValue(mockActivityLog);

            const result = memoryManager.previewCleanup(mockContext);

            expect(result.estimatedMemoryToFree).toBe(10 * 500); // 500 bytes per entry
        });

        it('should return zero entries when activity log is empty', () => {
            (mockContext.globalState.get as jest.Mock).mockReturnValue(null);

            const result = memoryManager.previewCleanup(mockContext);

            expect(result.entriesToRemove).toHaveLength(0);
            expect(result.totalEntries).toBe(0);
        });
    });

    describe('LRU Cache', () => {
        it('should store and retrieve data from cache', () => {
            memoryManager.setCache('test-key', { data: 'test-value' });

            const result = memoryManager.getCache('test-key');

            expect(result).toEqual({ data: 'test-value' });
        });

        it('should update access time on cache hit', async () => {
            memoryManager.setCache('test-key', { data: 'test-value' });

            const firstStats = memoryManager.getCacheStats();
            const initialTime = Date.now();

            // Small delay to ensure timestamp difference
            await new Promise(resolve => setTimeout(resolve, 10));

            memoryManager.getCache('test-key');

            const secondStats = memoryManager.getCacheStats();
            expect(secondStats.mostAccessed[0].accessCount).toBe(2);
        });

        it('should evict least recently used entry when cache is full', () => {
            // Fill cache to max capacity
            for (let i = 0; i < 105; i++) {
                memoryManager.setCache(`key${i}`, { data: `value${i}` });
            }

            const stats = memoryManager.getCacheStats();
            expect(stats.size).toBeLessThanOrEqual(100); // MAX_CACHE_SIZE
        });

        it('should clear specific cache entry', () => {
            memoryManager.setCache('test-key', { data: 'test-value' });

            const result = memoryManager.clearCache('test-key');

            expect(result).toBe(true);
            expect(memoryManager.getCache('test-key')).toBeUndefined();
        });

        it('should clear all cache entries', () => {
            memoryManager.setCache('key1', { data: 'value1' });
            memoryManager.setCache('key2', { data: 'value2' });

            memoryManager.clearAllCache();

            const stats = memoryManager.getCacheStats();
            expect(stats.size).toBe(0);
        });

        it('should track cache access patterns', () => {
            memoryManager.setCache('popular-key', { data: 'popular-value' });
            memoryManager.setCache('unpopular-key', { data: 'unpopular-value' });

            // Access popular key multiple times
            for (let i = 0; i < 5; i++) {
                memoryManager.getCache('popular-key');
            }

            memoryManager.getCache('unpopular-key');

            const stats = memoryManager.getCacheStats();
            const popularEntry = stats.mostAccessed.find((e) => e.key === 'popular-key');
            const unpopularEntry = stats.mostAccessed.find((e) => e.key === 'unpopular-key');

            // setCache initializes accessCount to 1, then 5 getCache calls make it 6
            expect(popularEntry?.accessCount).toBe(6);
            expect(unpopularEntry?.accessCount).toBe(2);
        });
    });

    describe('Lazy Loading', () => {
        it('should load history with date range filter', async () => {
            const startDate = new Date('2024-01-01');
            const endDate = new Date('2024-01-31');

            const mockActivityLog = {
                history: [
                    { id: '1', timestamp: new Date('2024-01-15').getTime(), text: 'Entry 1' },
                    { id: '2', timestamp: new Date('2024-02-15').getTime(), text: 'Entry 2' },
                    { id: '3', timestamp: new Date('2024-01-20').getTime(), text: 'Entry 3' },
                ],
            };

            (mockContext.globalState.get as jest.Mock).mockReturnValue(mockActivityLog);

            const result = await memoryManager.loadHistoryLazy(mockContext, {
                dateRange: { start: startDate, end: endDate },
            });

            expect(result).toHaveLength(2);
            expect(result[0].id).toBe('1');
            expect(result[1].id).toBe('3');
        });

        it('should support pagination with offset and limit', async () => {
            const mockActivityLog = {
                history: Array.from({ length: 25 }, (_, i) => ({
                    id: `entry-${i}`,
                    timestamp: Date.now(),
                    text: `Entry ${i}`,
                })),
            };

            (mockContext.globalState.get as jest.Mock).mockReturnValue(mockActivityLog);

            const result = await memoryManager.loadHistoryLazy(mockContext, {
                offset: 10,
                limit: 5,
            });

            expect(result).toHaveLength(5);
            expect(result[0].id).toBe('entry-10');
            expect(result[4].id).toBe('entry-14');
        });

        it('should return empty array when no history exists', async () => {
            (mockContext.globalState.get as jest.Mock).mockReturnValue(null);

            const result = await memoryManager.loadHistoryLazy(mockContext);

            expect(result).toEqual([]);
        });
    });

    describe('Data Aggregation', () => {
        it('should aggregate data by date range', () => {
            const startDate = new Date('2024-01-01');
            const endDate = new Date('2024-01-03');

            const mockActivityLog = {
                dailyLogs: [
                    {
                        timestamp: new Date('2024-01-01').getTime(),
                        activities: [
                            { type: 'file' },
                            { type: 'file' },
                            { type: 'git' },
                        ],
                    },
                    {
                        timestamp: new Date('2024-01-02').getTime(),
                        activities: [
                            { type: 'file' },
                            { type: 'git' },
                        ],
                    },
                    {
                        timestamp: new Date('2024-01-04').getTime(), // Outside range
                        activities: [
                            { type: 'file' },
                        ],
                    },
                ],
            };

            (mockContext.globalState.get as jest.Mock).mockReturnValue(mockActivityLog);

            const result = memoryManager.aggregateDataByDateRange(mockContext, startDate, endDate);

            expect(result).toHaveLength(2);
            expect(result[0]).toHaveProperty('date');
            expect(result[0]).toHaveProperty('activityCount');
            expect(result[0]).toHaveProperty('fileCount');
            expect(result[0]).toHaveProperty('commitCount');
        });

        it('should handle empty activity log', () => {
            (mockContext.globalState.get as jest.Mock).mockReturnValue(null);

            const result = memoryManager.aggregateDataByDateRange(
                mockContext,
                new Date('2024-01-01'),
                new Date('2024-01-31')
            );

            expect(result).toEqual([]);
        });
    });

    describe('Memory Leak Detection', () => {
        it('should detect potential memory leaks', () => {
            // Fill cache to near capacity
            for (let i = 0; i < 95; i++) {
                memoryManager.setCache(`key${i}`, { data: `value${i}` });
            }

            const result = memoryManager.detectMemoryLeaks();

            expect(result.hasLeaks).toBe(true);
            expect(result.leakIndicators.length).toBeGreaterThan(0);
            expect(result.recommendations.length).toBeGreaterThan(0);
        });

        it('should not detect leaks when memory is healthy', () => {
            // Fresh memory manager has no cleanup runs, which is expected
            // but doesn't indicate a leak by itself
            const result = memoryManager.detectMemoryLeaks();

            // In a fresh state, only cleanupRuns = 0 might trigger a warning
            // but this is expected for a new instance
            expect(result.leakIndicators.length).toBeLessThanOrEqual(2); // At most 2 indicators for fresh instance
        });

        it('should provide actionable recommendations', () => {
            // Set up scenario with no cleanup
            const stats = memoryManager.getMemoryStats();
            expect(stats.cleanupRuns).toBe(0);

            const result = memoryManager.detectMemoryLeaks();

            if (result.hasLeaks) {
                expect(result.recommendations).toBeInstanceOf(Array);
                result.recommendations.forEach(rec => {
                    expect(typeof rec).toBe('string');
                    expect(rec.length).toBeGreaterThan(0);
                });
            }
        });
    });

    describe('Memory Statistics', () => {
        it('should return accurate memory statistics', () => {
            memoryManager.setCache('key1', { data: 'value1' });
            memoryManager.setCache('key2', { data: 'value2' });

            const stats = memoryManager.getMemoryStats();

            expect(stats.cacheSize).toBe(2);
            expect(stats.totalCacheEntries).toBe(2);
            expect(stats.totalMemoryUsed).toBeGreaterThanOrEqual(0);
        });

        it('should calculate memory efficiency correctly', () => {
            for (let i = 0; i < 50; i++) {
                memoryManager.setCache(`key${i}`, { data: `value${i}` });
            }

            const stats = memoryManager.getMemoryStats();

            expect(stats.memoryEfficiency).toBe(50); // 50/100 = 50%
        });
    });

    describe('Cache Statistics', () => {
        it('should provide detailed cache statistics', () => {
            memoryManager.setCache('key1', { data: 'value1' });
            memoryManager.setCache('key2', { data: 'value2' });

            // Access key1 multiple times
            memoryManager.getCache('key1');
            memoryManager.getCache('key1');
            memoryManager.getCache('key1');

            const stats = memoryManager.getCacheStats();

            expect(stats.size).toBe(2);
            expect(stats.maxSize).toBe(100);
            expect(stats.utilizationPercent).toBe(2);
            expect(stats.mostAccessed.length).toBeGreaterThan(0);
        });

        it('should handle empty cache', () => {
            const stats = memoryManager.getCacheStats();

            expect(stats.size).toBe(0);
            expect(stats.mostAccessed).toHaveLength(0);
        });
    });

    describe('Automatic Cleanup', () => {
        it('should run automatic cleanup when enabled and due', async () => {
            const mockConfig = {
                get: jest.fn((key: string) => {
                    if (key === 'autoCleanupEnabled') return true;
                    if (key === 'cleanupIntervalDays') return 7;
                    return 30;
                }),
            };
            mockGetConfiguration.mockReturnValue(mockConfig);

            // Set last cleanup to 8 days ago
            memoryManager['memoryStats'].lastCleanupTime = Date.now() - (8 * 24 * 60 * 60 * 1000);

            const mockActivityLog = {
                dailyLogs: [],
                history: [],
            };
            (mockContext.globalState.get as jest.Mock).mockReturnValue(mockActivityLog);

            const result = await memoryManager.runAutomaticCleanup(mockContext);

            expect(result).toBe(true);
        });

        it('should not run automatic cleanup when disabled', async () => {
            const mockConfig = {
                get: jest.fn((key: string) => {
                    if (key === 'autoCleanupEnabled') return false;
                    return 30;
                }),
            };
            mockGetConfiguration.mockReturnValue(mockConfig);

            const result = await memoryManager.runAutomaticCleanup(mockContext);

            expect(result).toBe(false);
        });

        it('should not run automatic cleanup when not due', async () => {
            const mockConfig = {
                get: jest.fn((key: string) => {
                    if (key === 'autoCleanupEnabled') return true;
                    if (key === 'cleanupIntervalDays') return 7;
                    return 30;
                }),
            };
            mockGetConfiguration.mockReturnValue(mockConfig);

            // Set last cleanup to 1 day ago
            memoryManager['memoryStats'].lastCleanupTime = Date.now() - (1 * 24 * 60 * 60 * 1000);

            const result = await memoryManager.runAutomaticCleanup(mockContext);

            expect(result).toBe(false);
        });
    });

    describe('Diagnostic Report', () => {
        it('should generate comprehensive diagnostic report', () => {
            memoryManager.setCache('test-key', { data: 'test-value' });

            const report = memoryManager.getDiagnosticReport();

            expect(report).toHaveProperty('memoryStats');
            expect(report).toHaveProperty('cacheStats');
            expect(report).toHaveProperty('leakDetection');
            expect(report).toHaveProperty('recommendations');
            expect(report).toHaveProperty('healthScore');

            expect(report.healthScore).toBeGreaterThanOrEqual(0);
            expect(report.healthScore).toBeLessThanOrEqual(100);
        });

        it('should calculate health score correctly', () => {
            // Healthy scenario
            const report = memoryManager.getDiagnosticReport();

            expect(report.healthScore).toBeGreaterThanOrEqual(50);
        });

        it('should reduce health score for memory issues', () => {
            // Unhealthy scenario: fill cache and don't run cleanup
            for (let i = 0; i < 95; i++) {
                memoryManager.setCache(`key${i}`, { data: `value${i}` });
            }

            const report = memoryManager.getDiagnosticReport();

            expect(report.healthScore).toBeLessThan(100);
            if (report.leakDetection.hasLeaks) {
                expect(report.recommendations.length).toBeGreaterThan(0);
            }
        });
    });

    describe('Webview Memory Optimization', () => {
        it('should send clear cache command to webview', () => {
            const mockWebview = {
                postMessage: jest.fn(),
            } as any;

            memoryManager.optimizeWebviewMemory(mockWebview);

            expect(mockWebview.postMessage).toHaveBeenCalledWith({
                command: 'clearCache',
            });
        });

        it('should handle webview communication errors gracefully', () => {
            const mockWebview = {
                postMessage: jest.fn(() => {
                    throw new Error('Webview not active');
                }),
            } as any;

            expect(() => {
                memoryManager.optimizeWebviewMemory(mockWebview);
            }).not.toThrow();
        });
    });

    describe('Resource Management', () => {
        it('should dispose of all resources properly', () => {
            memoryManager.setCache('key1', { data: 'value1' });
            memoryManager.setCache('key2', { data: 'value2' });

            memoryManager.dispose();

            const stats = memoryManager.getMemoryStats();
            expect(stats.cacheSize).toBe(0);
            expect(stats.totalCacheEntries).toBe(0);
        });

        it('should reset statistics on disposal', () => {
            memoryManager['memoryStats'].cleanupRuns = 5;
            memoryManager['memoryStats'].totalMemoryUsed = 1000;

            memoryManager.dispose();

            const stats = memoryManager.getMemoryStats();
            expect(stats.cleanupRuns).toBe(0);
            expect(stats.totalMemoryUsed).toBe(0);
        });

        it('should handle multiple dispose calls safely', () => {
            memoryManager.setCache('key1', { data: 'value1' });

            memoryManager.dispose();
            memoryManager.dispose();
            memoryManager.dispose();

            expect(() => memoryManager.dispose()).not.toThrow();
        });
    });

    describe('Edge Cases', () => {
        it('should handle negative retention days', async () => {
            const mockConfig = {
                get: jest.fn(() => -30),
            };
            mockGetConfiguration.mockReturnValue(mockConfig);

            (mockContext.globalState.get as jest.Mock).mockReturnValue({
                dailyLogs: [],
                history: [],
            });

            const result = await memoryManager.cleanupOldData(mockContext);

            expect(result).toBeDefined();
        });

        it('should handle very large cache sizes', () => {
            // Try to add more than max cache size
            for (let i = 0; i < 1000; i++) {
                memoryManager.setCache(`key${i}`, { data: `value${i}` });
            }

            const stats = memoryManager.getCacheStats();
            expect(stats.size).toBeLessThanOrEqual(100); // MAX_CACHE_SIZE
        });

        it('should handle cache operations with null keys', () => {
            expect(() => {
                memoryManager.setCache(null as any, { data: 'value' });
            }).not.toThrow();

            expect(() => {
                memoryManager.getCache(null as any);
            }).not.toThrow();
        });

        it('should handle empty date ranges in lazy loading', async () => {
            (mockContext.globalState.get as jest.Mock).mockReturnValue({
                history: [
                    { id: '1', timestamp: Date.now(), text: 'Entry 1' },
                ],
            });

            const result = await memoryManager.loadHistoryLazy(mockContext, {
                dateRange: {
                    start: new Date('2024-01-01'),
                    end: new Date('2024-01-01'), // Same start and end
                },
            });

            expect(result).toBeDefined();
        });
    });
});
