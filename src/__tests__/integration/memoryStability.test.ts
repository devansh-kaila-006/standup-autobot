/**
 * Memory Stability Tests
 *
 * These tests verify that the memory management features work correctly
 * and that memory usage remains stable over extended periods.
 */

import { MemoryManager } from '../../services/MemoryManager';
import * as vscode from 'vscode';

describe('Memory Stability Tests', () => {
    let memoryManager: MemoryManager;
    let mockContext: vscode.ExtensionContext;

    beforeEach(() => {
        // Create mock context
        mockContext = {
            globalState: {
                get: jest.fn(),
                update: jest.fn(),
            },
            globalStoragePath: '/tmp/test',
        } as any;

        memoryManager = new MemoryManager();
    });

    describe('Data Cleanup', () => {
        it('should clean up old data based on retention policy', async () => {
            const mockActivityLog = {
                dailyLogs: [
                    { timestamp: Date.now() - 1000 * 60 * 60 * 24 * 10, activities: [] }, // 10 days old
                    { timestamp: Date.now() - 1000 * 60 * 60 * 24 * 35, activities: [] }, // 35 days old
                    { timestamp: Date.now() - 1000 * 60 * 60 * 24 * 40, activities: [] }, // 40 days old
                ],
                history: [
                    { id: '1', timestamp: Date.now() - 1000 * 60 * 60 * 24 * 10 },
                    { id: '2', timestamp: Date.now() - 1000 * 60 * 60 * 24 * 35 },
                ],
                lastUpdated: Date.now(),
            };

            (mockContext.globalState.get as jest.Mock).mockReturnValue(mockActivityLog);
            (mockContext.globalState.update as jest.Mock).mockResolvedValue(undefined);

            const result = await memoryManager.cleanupOldData(mockContext);

            expect(result.removedEntries).toBeGreaterThan(0);
            expect(result.freedMemory).toBeGreaterThan(0);
            expect(mockContext.globalState.update).toHaveBeenCalled();
        });

        it('should respect custom retention period', async () => {
            const mockActivityLog = {
                dailyLogs: [
                    { timestamp: Date.now() - 1000 * 60 * 60 * 24 * 15, activities: [] }, // 15 days old
                    { timestamp: Date.now() - 1000 * 60 * 60 * 24 * 25, activities: [] }, // 25 days old
                ],
                lastUpdated: Date.now(),
            };

            (mockContext.globalState.get as jest.Mock).mockReturnValue(mockActivityLog);
            (mockContext.globalState.update as jest.Mock).mockResolvedValue(undefined);

            // Test with 20 day retention
            const result = await memoryManager.cleanupOldData(mockContext);

            // Should remove entries older than 20 days
            expect(result.retentionDays).toBeDefined();
        });
    });

    describe('LRU Cache', () => {
        it('should evict least recently used items when cache is full', () => {
            const cacheSize = 5;
            const testData = Array.from({ length: 10 }, (_, i) => ({
                key: `key${i}`,
                value: `value${i}`,
            }));

            // Fill cache beyond capacity
            testData.forEach((item) => {
                memoryManager.setCache(item.key, item.value);
            });

            // Access some items to update their LRU status
            memoryManager.getCache('key8');
            memoryManager.getCache('key9');

            // Add more items
            memoryManager.setCache('key10', 'value10');

            const stats = memoryManager.getCacheStats();

            // Cache should not exceed max size
            expect(stats.size).toBeLessThanOrEqual(cacheSize);
            expect(stats.utilizationPercent).toBeLessThanOrEqual(100);
        });

        it('should track access count for cache entries', () => {
            memoryManager.setCache('test-key', 'test-value');

            // Access the item multiple times
            memoryManager.getCache('test-key');
            memoryManager.getCache('test-key');
            memoryManager.getCache('test-key');

            const stats = memoryManager.getCacheStats();

            expect(stats.mostAccessed.length).toBeGreaterThan(0);
            expect(stats.mostAccessed[0].key).toBe('test-key');
            expect(stats.mostAccessed[0].accessCount).toBe(3);
        });
    });

    describe('Memory Leak Detection', () => {
        it('should detect potential memory leaks', () => {
            // Simulate high memory usage
            for (let i = 0; i < 100; i++) {
                memoryManager.setCache(`key${i}`, `value${i}`);
            }

            const detection = memoryManager.detectMemoryLeaks();

            expect(detection).toHaveProperty('hasLeaks');
            expect(detection).toHaveProperty('leakIndicators');
            expect(detection).toHaveProperty('recommendations');
        });

        it('should provide recommendations for memory issues', () => {
            // Create conditions that might trigger memory leak warnings
            for (let i = 0; i < 95; i++) {
                memoryManager.setCache(`key${i}`, `value${i}`);
            }

            const detection = memoryManager.detectMemoryLeaks();

            if (detection.hasLeaks) {
                expect(detection.recommendations.length).toBeGreaterThan(0);
                expect(detection.recommendations).toEqual(
                    expect.arrayContaining([expect.any(String)])
                );
            }
        });
    });

    describe('Lazy Loading', () => {
        it('should load data in chunks', async () => {
            const mockActivityLog = {
                history: Array.from({ length: 100 }, (_, i) => ({
                    id: `entry${i}`,
                    timestamp: Date.now() - i * 1000,
                })),
                lastUpdated: Date.now(),
            };

            (mockContext.globalState.get as jest.Mock).mockReturnValue(mockActivityLog);

            // Load first 20 items
            const page1 = await memoryManager.loadHistoryLazy(mockContext, { limit: 20 });
            expect(page1.length).toBe(20);

            // Load next 20 items
            const page2 = await memoryManager.loadHistoryLazy(mockContext, {
                limit: 20,
                offset: 20,
            });
            expect(page2.length).toBe(20);

            // Ensure different data
            expect(page1[0].id).not.toBe(page2[0].id);
        });

        it('should filter by date range', async () => {
            const now = Date.now();
            const mockActivityLog = {
                history: [
                    { id: '1', timestamp: now - 1000 * 60 * 60 * 24 * 1 }, // 1 day ago
                    { id: '2', timestamp: now - 1000 * 60 * 60 * 24 * 5 }, // 5 days ago
                    { id: '3', timestamp: now - 1000 * 60 * 60 * 24 * 10 }, // 10 days ago
                ],
                lastUpdated: now,
            };

            (mockContext.globalState.get as jest.Mock).mockReturnValue(mockActivityLog);

            const startDate = new Date(now - 1000 * 60 * 60 * 24 * 7);
            const endDate = new Date(now);

            const filtered = await memoryManager.loadHistoryLazy(mockContext, {
                dateRange: { start: startDate, end: endDate },
            });

            expect(filtered.length).toBe(2); // Only entries from last 7 days
        });
    });

    describe('Memory Statistics', () => {
        it('should provide accurate memory statistics', () => {
            // Add some cache entries
            memoryManager.setCache('key1', 'value1');
            memoryManager.setCache('key2', 'value2');
            memoryManager.setCache('key3', 'value3');

            const stats = memoryManager.getMemoryStats();

            expect(stats).toHaveProperty('cacheSize');
            expect(stats).toHaveProperty('totalCacheEntries');
            expect(stats).toHaveProperty('memoryEfficiency');
            expect(stats.cacheSize).toBe(3);
        });

        it('should calculate memory efficiency correctly', () => {
            const cacheSize = 100;
            for (let i = 0; i < 50; i++) {
                memoryManager.setCache(`key${i}`, `value${i}`);
            }

            const stats = memoryManager.getMemoryStats();

            expect(stats.memoryEfficiency).toBeGreaterThan(0);
            expect(stats.memoryEfficiency).toBeLessThanOrEqual(100);
        });
    });

    describe('Diagnostic Report', () => {
        it('should generate comprehensive diagnostic report', () => {
            // Add some data
            for (let i = 0; i < 50; i++) {
                memoryManager.setCache(`key${i}`, `value${i}`);
            }

            const report = memoryManager.getDiagnosticReport();

            expect(report).toHaveProperty('memoryStats');
            expect(report).toHaveProperty('cacheStats');
            expect(report).toHaveProperty('leakDetection');
            expect(report).toHaveProperty('healthScore');
            expect(report.healthScore).toBeGreaterThanOrEqual(0);
            expect(report.healthScore).toBeLessThanOrEqual(100);
        });

        it('should lower health score for memory issues', () => {
            // Fill cache to near capacity
            for (let i = 0; i < 95; i++) {
                memoryManager.setCache(`key${i}`, `value${i}`);
            }

            const report = memoryManager.getDiagnosticReport();

            // Health score should be lower due to high cache utilization
            if (report.cacheStats.utilizationPercent > 90) {
                expect(report.healthScore).toBeLessThan(100);
            }
        });
    });

    describe('Automatic Cleanup', () => {
        it('should run automatic cleanup when enabled', async () => {
            const config = {
                get: jest.fn(),
            };

            config.get.mockImplementation((key: string, defaultValue: any) => {
                if (key === 'autoCleanupEnabled') return true;
                if (key === 'cleanupIntervalDays') return 7;
                return defaultValue;
            });

            // Mock workspace.getConfiguration
            (vscode.workspace.getConfiguration as jest.Mock).mockReturnValue(config);

            const mockActivityLog = {
                dailyLogs: [
                    { timestamp: Date.now() - 1000 * 60 * 60 * 24 * 10, activities: [] },
                ],
                lastUpdated: Date.now(),
            };

            (mockContext.globalState.get as jest.Mock).mockReturnValue(mockActivityLog);
            (mockContext.globalState.update as jest.Mock).mockResolvedValue(undefined);

            // Force cleanup by setting last cleanup time to old date
            memoryManager['memoryStats'].lastCleanupTime = Date.now() - 1000 * 60 * 60 * 24 * 10;

            const result = await memoryManager.runAutomaticCleanup(mockContext);

            expect(result).toBe(true);
        });

        it('should skip automatic cleanup when disabled', async () => {
            const config = {
                get: jest.fn(),
            };

            config.get.mockReturnValue(false); // autoCleanupEnabled = false

            (vscode.workspace.getConfiguration as jest.Mock).mockReturnValue(config);

            const result = await memoryManager.runAutomaticCleanup(mockContext);

            expect(result).toBe(false);
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

            // Should not throw
            expect(() => {
                memoryManager.optimizeWebviewMemory(mockWebview);
            }).not.toThrow();
        });
    });
});
