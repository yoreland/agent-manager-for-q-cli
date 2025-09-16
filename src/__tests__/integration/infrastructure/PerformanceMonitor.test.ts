import { PerformanceMonitor } from '../../../infrastructure/PerformanceMonitor';
import { ILogger } from '../../../shared/infrastructure/ILogger';

describe('PerformanceMonitor Integration', () => {
    let monitor: PerformanceMonitor;
    let mockLogger: jest.Mocked<ILogger>;

    beforeEach(() => {
        mockLogger = {
            debug: jest.fn(),
            info: jest.fn(),
            warn: jest.fn(),
            error: jest.fn(),
            setLogLevel: jest.fn(),
            getLogLevel: jest.fn(),
            dispose: jest.fn()
        };

        monitor = new PerformanceMonitor(mockLogger);
    });

    describe('timer operations', () => {
        it('should measure operation duration', () => {
            monitor.startTimer('test-operation');
            
            // Simulate some work
            const start = Date.now();
            while (Date.now() - start < 10) {
                // Wait at least 10ms
            }
            
            const duration = monitor.endTimer('test-operation');

            expect(duration).toBeGreaterThanOrEqual(10);
            expect(mockLogger.debug).toHaveBeenCalledWith(
                'Performance metric recorded',
                expect.objectContaining({
                    operation: 'test-operation',
                    duration: expect.any(Number)
                })
            );
        });

        it('should handle missing timer gracefully', () => {
            const duration = monitor.endTimer('nonexistent-operation');

            expect(duration).toBe(0);
            expect(mockLogger.warn).toHaveBeenCalledWith(
                'Timer not found',
                { operation: 'nonexistent-operation' }
            );
        });
    });

    describe('metrics collection', () => {
        it('should collect and aggregate metrics', () => {
            monitor.recordMetric('test-op', 100);
            monitor.recordMetric('test-op', 200);
            monitor.recordMetric('test-op', 150);

            const metric = monitor.getMetric('test-op');

            expect(metric).toBeDefined();
            expect(metric?.operation).toBe('test-op');
            expect(metric?.count).toBe(3);
            expect(metric?.totalDuration).toBe(450);
            expect(metric?.minDuration).toBe(100);
            expect(metric?.maxDuration).toBe(200);
            expect(metric?.avgDuration).toBe(150);
        });

        it('should return all metrics', () => {
            monitor.recordMetric('op1', 100);
            monitor.recordMetric('op2', 200);

            const metrics = monitor.getMetrics();

            expect(metrics).toHaveLength(2);
            expect(metrics.map(m => m.operation)).toContain('op1');
            expect(metrics.map(m => m.operation)).toContain('op2');
        });
    });

    describe('measurement helpers', () => {
        it('should measure synchronous function', () => {
            const result = monitor.measure('sync-op', () => {
                return 'test-result';
            });

            expect(result).toBe('test-result');
            
            const metric = monitor.getMetric('sync-op');
            expect(metric?.count).toBe(1);
        });

        it('should measure asynchronous function', async () => {
            const result = await monitor.measureAsync('async-op', async () => {
                await new Promise(resolve => setTimeout(resolve, 10));
                return 'async-result';
            });

            expect(result).toBe('async-result');
            
            const metric = monitor.getMetric('async-op');
            expect(metric?.count).toBe(1);
            expect(metric?.avgDuration).toBeGreaterThanOrEqual(10);
        });

        it('should handle errors in measured functions', async () => {
            const error = new Error('Test error');

            await expect(
                monitor.measureAsync('error-op', async () => {
                    throw error;
                })
            ).rejects.toThrow('Test error');

            // Should still record the metric even on error
            const metric = monitor.getMetric('error-op');
            expect(metric?.count).toBe(1);
        });
    });

    describe('reporting', () => {
        it('should log performance summary', () => {
            monitor.recordMetric('op1', 100);
            monitor.recordMetric('op2', 200);

            monitor.logSummary();

            expect(mockLogger.info).toHaveBeenCalledWith(
                'Performance Summary',
                expect.objectContaining({
                    totalOperations: 2,
                    metrics: expect.arrayContaining([
                        expect.objectContaining({ operation: 'op1' }),
                        expect.objectContaining({ operation: 'op2' })
                    ])
                })
            );
        });

        it('should handle empty metrics', () => {
            monitor.logSummary();

            expect(mockLogger.info).toHaveBeenCalledWith('No performance metrics to report');
        });
    });

    describe('cleanup', () => {
        it('should clear all metrics and timers', () => {
            monitor.startTimer('test-timer');
            monitor.recordMetric('test-metric', 100);

            monitor.clearMetrics();

            expect(monitor.getMetrics()).toHaveLength(0);
            expect(monitor.getMetric('test-metric')).toBeUndefined();
            
            // Timer should be cleared too
            const duration = monitor.endTimer('test-timer');
            expect(duration).toBe(0);
        });
    });
});
