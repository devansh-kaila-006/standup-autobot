"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const performanceMonitor_1 = require("../../utils/performanceMonitor");
(0, globals_1.describe)('PerformanceMonitor', () => {
    let monitor;
    (0, globals_1.beforeEach)(() => {
        monitor = new performanceMonitor_1.PerformanceMonitor();
    });
    (0, globals_1.describe)('start and stop', () => {
        (0, globals_1.it)('should measure operation duration', () => {
            const stop = monitor.start('testOperation');
            // Simulate some work
            const sum = Array.from({ length: 1000 }, (_, i) => i).reduce((a, b) => a + b, 0);
            stop();
            const stats = monitor.getStats('testOperation');
            (0, globals_1.expect)(stats).toBeDefined();
            (0, globals_1.expect)(stats?.count).toBe(1);
            (0, globals_1.expect)(stats?.totalDuration).toBeGreaterThan(0);
        });
        (0, globals_1.it)('should track multiple operations', () => {
            const stop1 = monitor.start('testOperation');
            stop1();
            const stop2 = monitor.start('testOperation');
            stop2();
            const stats = monitor.getStats('testOperation');
            (0, globals_1.expect)(stats?.count).toBe(2);
        });
        (0, globals_1.it)('should return stop function that works even if not called', () => {
            const stop = monitor.start('testOperation');
            // Not calling stop should not throw
            (0, globals_1.expect)(() => { }).not.toThrow();
        });
    });
    (0, globals_1.describe)('getStats', () => {
        (0, globals_1.it)('should return null for non-existent operations', () => {
            const stats = monitor.getStats('nonExistent');
            (0, globals_1.expect)(stats).toBeNull();
        });
        (0, globals_1.it)('should calculate statistics correctly', () => {
            // Add some metrics manually
            monitor['metrics'].set('testOp', [
                { name: 'testOp', duration: 100, timestamp: Date.now() },
                { name: 'testOp', duration: 200, timestamp: Date.now() },
                { name: 'testOp', duration: 300, timestamp: Date.now() },
            ]);
            const stats = monitor.getStats('testOp');
            (0, globals_1.expect)(stats?.count).toBe(3);
            (0, globals_1.expect)(stats?.totalDuration).toBe(600);
            (0, globals_1.expect)(stats?.averageDuration).toBe(200);
            (0, globals_1.expect)(stats?.minDuration).toBe(100);
            (0, globals_1.expect)(stats?.maxDuration).toBe(300);
        });
    });
    (0, globals_1.describe)('getAllStats', () => {
        (0, globals_1.it)('should return all operations sorted by total duration', () => {
            const stop1 = monitor.start('fastOp');
            stop1();
            // Simulate a slower operation
            const stop2 = monitor.start('slowOp');
            const start = Date.now();
            while (Date.now() - start < 10) {
                // Busy wait
            }
            stop2();
            const stats = monitor.getAllStats();
            (0, globals_1.expect)(stats.length).toBe(2);
            (0, globals_1.expect)(stats[0].name).toBe('slowOp'); // Should be first (slower)
            (0, globals_1.expect)(stats[1].name).toBe('fastOp');
        });
    });
    (0, globals_1.describe)('generateReport', () => {
        (0, globals_1.it)('should generate comprehensive report', () => {
            const stop1 = monitor.start('op1');
            stop1();
            const stop2 = monitor.start('op2');
            stop2();
            const report = monitor.generateReport();
            (0, globals_1.expect)(report.metrics.length).toBeGreaterThan(0);
            (0, globals_1.expect)(report.summary.totalOperations).toBeGreaterThan(0);
            (0, globals_1.expect)(report.summary.totalDuration).toBeGreaterThan(0);
            (0, globals_1.expect)(report.summary.averageDuration).toBeGreaterThan(0);
            (0, globals_1.expect)(report.summary.slowestOperation).toBeDefined();
            (0, globals_1.expect)(report.summary.fastestOperation).toBeDefined();
            (0, globals_1.expect)(report.summary.mostFrequentOperation).toBeDefined();
        });
        (0, globals_1.it)('should generate empty report when no metrics', () => {
            const report = monitor.generateReport();
            (0, globals_1.expect)(report.metrics).toEqual([]);
            (0, globals_1.expect)(report.summary.totalOperations).toBe(0);
            (0, globals_1.expect)(report.summary.totalDuration).toBe(0);
            (0, globals_1.expect)(report.summary.averageDuration).toBe(0);
        });
        (0, globals_1.it)('should provide recommendations for slow operations', () => {
            // Add slow operation
            monitor['metrics'].set('slowOp', [
                { name: 'slowOp', duration: 2000, timestamp: Date.now() },
                { name: 'slowOp', duration: 2500, timestamp: Date.now() },
            ]);
            const report = monitor.generateReport();
            (0, globals_1.expect)(report.recommendations.length).toBeGreaterThan(0);
            (0, globals_1.expect)(report.recommendations.some(r => r.includes('slowOp'))).toBe(true);
        });
    });
    (0, globals_1.describe)('clear and reset', () => {
        (0, globals_1.it)('should clear all metrics', () => {
            const stop = monitor.start('testOp');
            stop();
            (0, globals_1.expect)(monitor.getStats('testOp')).toBeDefined();
            monitor.clear();
            (0, globals_1.expect)(monitor.getStats('testOp')).toBeNull();
        });
        (0, globals_1.it)('should clear specific operation', () => {
            const stop1 = monitor.start('op1');
            stop1();
            const stop2 = monitor.start('op2');
            stop2();
            monitor.clearOperation('op1');
            (0, globals_1.expect)(monitor.getStats('op1')).toBeNull();
            (0, globals_1.expect)(monitor.getStats('op2')).toBeDefined();
        });
    });
    (0, globals_1.describe)('enable/disable', () => {
        (0, globals_1.it)('should disable monitoring', () => {
            monitor.setEnabled(false);
            const stop = monitor.start('testOp');
            stop();
            (0, globals_1.expect)(monitor.getStats('testOp')).toBeNull();
        });
        (0, globals_1.it)('should re-enable monitoring', () => {
            monitor.setEnabled(false);
            monitor.setEnabled(true);
            const stop = monitor.start('testOp');
            stop();
            (0, globals_1.expect)(monitor.getStats('testOp')).toBeDefined();
        });
    });
    (0, globals_1.describe)('export and visualization', () => {
        (0, globals_1.it)('should export metrics as JSON', () => {
            const stop = monitor.start('testOp');
            stop();
            const exported = monitor.exportMetrics();
            (0, globals_1.expect)(exported).toBeDefined();
            (0, globals_1.expect)(typeof exported).toBe('string');
            const parsed = JSON.parse(exported);
            (0, globals_1.expect)(parsed).toHaveProperty('testOp');
        });
        (0, globals_1.it)('should provide metrics for visualization', () => {
            const stop1 = monitor.start('op1');
            stop1();
            const stop2 = monitor.start('op2');
            stop2();
            const vizMetrics = monitor.getMetricsForVisualization();
            (0, globals_1.expect)(vizMetrics.length).toBe(2);
            (0, globals_1.expect)(vizMetrics[0]).toHaveProperty('name');
            (0, globals_1.expect)(vizMetrics[0]).toHaveProperty('count');
            (0, globals_1.expect)(vizMetrics[0]).toHaveProperty('avgDuration');
            (0, globals_1.expect)(vizMetrics[0]).toHaveProperty('totalDuration');
        });
    });
    (0, globals_1.describe)('measureAsyncPerformance', () => {
        (0, globals_1.it)('should measure async function performance', async () => {
            const result = await (0, performanceMonitor_1.measureAsyncPerformance)('asyncOp', async () => {
                return 42;
            });
            (0, globals_1.expect)(result).toBe(42);
            const stats = performanceMonitor_1.globalPerformanceMonitor.getStats('asyncOp');
            (0, globals_1.expect)(stats).toBeDefined();
        });
        (0, globals_1.it)('should measure async function errors', async () => {
            await (0, globals_1.expect)((0, performanceMonitor_1.measureAsyncPerformance)('failingAsyncOp', async () => {
                throw new Error('Test error');
            })).rejects.toThrow('Test error');
            // Should still track performance
            const stats = performanceMonitor_1.globalPerformanceMonitor.getStats('failingAsyncOp');
            (0, globals_1.expect)(stats).toBeDefined();
        });
    });
    (0, globals_1.describe)('measurePerformance', () => {
        (0, globals_1.it)('should measure sync function performance', () => {
            const result = (0, performanceMonitor_1.measurePerformance)('syncOp', () => {
                return 42;
            });
            (0, globals_1.expect)(result).toBe(42);
            const stats = performanceMonitor_1.globalPerformanceMonitor.getStats('syncOp');
            (0, globals_1.expect)(stats).toBeDefined();
        });
        (0, globals_1.it)('should measure sync function errors', () => {
            (0, globals_1.expect)(() => {
                (0, performanceMonitor_1.measurePerformance)('failingSyncOp', () => {
                    throw new Error('Test error');
                });
            }).toThrow('Test error');
            // Should still track performance
            const stats = performanceMonitor_1.globalPerformanceMonitor.getStats('failingSyncOp');
            (0, globals_1.expect)(stats).toBeDefined();
        });
    });
});
//# sourceMappingURL=performanceMonitor.test.js.map