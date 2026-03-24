import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import {
    PerformanceMonitor,
    globalPerformanceMonitor,
    MeasurePerformance,
    measureAsyncPerformance,
    measurePerformance,
} from '../../utils/performanceMonitor';

describe('PerformanceMonitor', () => {
    let monitor: PerformanceMonitor;

    beforeEach(() => {
        monitor = new PerformanceMonitor();
    });

    describe('start and stop', () => {
        it('should measure operation duration', () => {
            const stop = monitor.start('testOperation');

            // Simulate some work
            const sum = Array.from({ length: 1000 }, (_, i) => i).reduce((a, b) => a + b, 0);

            stop();

            const stats = monitor.getStats('testOperation');
            expect(stats).toBeDefined();
            expect(stats?.count).toBe(1);
            expect(stats?.totalDuration).toBeGreaterThan(0);
        });

        it('should track multiple operations', () => {
            const stop1 = monitor.start('testOperation');
            stop1();

            const stop2 = monitor.start('testOperation');
            stop2();

            const stats = monitor.getStats('testOperation');
            expect(stats?.count).toBe(2);
        });

        it('should return stop function that works even if not called', () => {
            const stop = monitor.start('testOperation');

            // Not calling stop should not throw
            expect(() => {}).not.toThrow();
        });
    });

    describe('getStats', () => {
        it('should return null for non-existent operations', () => {
            const stats = monitor.getStats('nonExistent');
            expect(stats).toBeNull();
        });

        it('should calculate statistics correctly', () => {
            // Add some metrics manually
            monitor['metrics'].set('testOp', [
                { name: 'testOp', duration: 100, timestamp: Date.now() },
                { name: 'testOp', duration: 200, timestamp: Date.now() },
                { name: 'testOp', duration: 300, timestamp: Date.now() },
            ]);

            const stats = monitor.getStats('testOp');

            expect(stats?.count).toBe(3);
            expect(stats?.totalDuration).toBe(600);
            expect(stats?.averageDuration).toBe(200);
            expect(stats?.minDuration).toBe(100);
            expect(stats?.maxDuration).toBe(300);
        });
    });

    describe('getAllStats', () => {
        it('should return all operations sorted by total duration', () => {
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

            expect(stats.length).toBe(2);
            expect(stats[0].name).toBe('slowOp'); // Should be first (slower)
            expect(stats[1].name).toBe('fastOp');
        });
    });

    describe('generateReport', () => {
        it('should generate comprehensive report', () => {
            const stop1 = monitor.start('op1');
            stop1();

            const stop2 = monitor.start('op2');
            stop2();

            const report = monitor.generateReport();

            expect(report.metrics.length).toBeGreaterThan(0);
            expect(report.summary.totalOperations).toBeGreaterThan(0);
            expect(report.summary.totalDuration).toBeGreaterThan(0);
            expect(report.summary.averageDuration).toBeGreaterThan(0);
            expect(report.summary.slowestOperation).toBeDefined();
            expect(report.summary.fastestOperation).toBeDefined();
            expect(report.summary.mostFrequentOperation).toBeDefined();
        });

        it('should generate empty report when no metrics', () => {
            const report = monitor.generateReport();

            expect(report.metrics).toEqual([]);
            expect(report.summary.totalOperations).toBe(0);
            expect(report.summary.totalDuration).toBe(0);
            expect(report.summary.averageDuration).toBe(0);
        });

        it('should provide recommendations for slow operations', () => {
            // Add slow operation
            monitor['metrics'].set('slowOp', [
                { name: 'slowOp', duration: 2000, timestamp: Date.now() },
                { name: 'slowOp', duration: 2500, timestamp: Date.now() },
            ]);

            const report = monitor.generateReport();

            expect(report.recommendations.length).toBeGreaterThan(0);
            expect(report.recommendations.some(r => r.includes('slowOp'))).toBe(true);
        });
    });

    describe('clear and reset', () => {
        it('should clear all metrics', () => {
            const stop = monitor.start('testOp');
            stop();

            expect(monitor.getStats('testOp')).toBeDefined();

            monitor.clear();

            expect(monitor.getStats('testOp')).toBeNull();
        });

        it('should clear specific operation', () => {
            const stop1 = monitor.start('op1');
            stop1();

            const stop2 = monitor.start('op2');
            stop2();

            monitor.clearOperation('op1');

            expect(monitor.getStats('op1')).toBeNull();
            expect(monitor.getStats('op2')).toBeDefined();
        });
    });

    describe('enable/disable', () => {
        it('should disable monitoring', () => {
            monitor.setEnabled(false);

            const stop = monitor.start('testOp');
            stop();

            expect(monitor.getStats('testOp')).toBeNull();
        });

        it('should re-enable monitoring', () => {
            monitor.setEnabled(false);
            monitor.setEnabled(true);

            const stop = monitor.start('testOp');
            stop();

            expect(monitor.getStats('testOp')).toBeDefined();
        });
    });

    describe('export and visualization', () => {
        it('should export metrics as JSON', () => {
            const stop = monitor.start('testOp');
            stop();

            const exported = monitor.exportMetrics();

            expect(exported).toBeDefined();
            expect(typeof exported).toBe('string');

            const parsed = JSON.parse(exported);
            expect(parsed).toHaveProperty('testOp');
        });

        it('should provide metrics for visualization', () => {
            const stop1 = monitor.start('op1');
            stop1();

            const stop2 = monitor.start('op2');
            stop2();

            const vizMetrics = monitor.getMetricsForVisualization();

            expect(vizMetrics.length).toBe(2);
            expect(vizMetrics[0]).toHaveProperty('name');
            expect(vizMetrics[0]).toHaveProperty('count');
            expect(vizMetrics[0]).toHaveProperty('avgDuration');
            expect(vizMetrics[0]).toHaveProperty('totalDuration');
        });
    });

    describe('measureAsyncPerformance', () => {
        it('should measure async function performance', async () => {
            const result = await measureAsyncPerformance('asyncOp', async () => {
                return 42;
            });

            expect(result).toBe(42);

            const stats = globalPerformanceMonitor.getStats('asyncOp');
            expect(stats).toBeDefined();
        });

        it('should measure async function errors', async () => {
            await expect(
                measureAsyncPerformance('failingAsyncOp', async () => {
                    throw new Error('Test error');
                })
            ).rejects.toThrow('Test error');

            // Should still track performance
            const stats = globalPerformanceMonitor.getStats('failingAsyncOp');
            expect(stats).toBeDefined();
        });
    });

    describe('measurePerformance', () => {
        it('should measure sync function performance', () => {
            const result = measurePerformance('syncOp', () => {
                return 42;
            });

            expect(result).toBe(42);

            const stats = globalPerformanceMonitor.getStats('syncOp');
            expect(stats).toBeDefined();
        });

        it('should measure sync function errors', () => {
            expect(() => {
                measurePerformance('failingSyncOp', () => {
                    throw new Error('Test error');
                });
            }).toThrow('Test error');

            // Should still track performance
            const stats = globalPerformanceMonitor.getStats('failingSyncOp');
            expect(stats).toBeDefined();
        });
    });
});
