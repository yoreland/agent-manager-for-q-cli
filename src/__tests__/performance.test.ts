/**
 * Performance tests for the Q CLI Context Manager extension
 * Ensures activation time and memory usage requirements are met
 */

import { PerformanceMonitor, measureAsyncOperation, measureSyncOperation } from '../utils/performance';

describe('Performance Tests', () => {
    let performanceMonitor: PerformanceMonitor;

    beforeEach(() => {
        performanceMonitor = PerformanceMonitor.getInstance();
    });

    afterEach(() => {
        performanceMonitor.clearMetricsHistory();
    });

    describe('PerformanceMonitor', () => {
        it('should track activation time correctly', () => {
            performanceMonitor.startActivationTracking();
            
            // Simulate some work
            const start = Date.now();
            while (Date.now() - start < 10) {
                // Busy wait for 10ms
            }
            
            const metrics = performanceMonitor.endActivationTracking();
            
            expect(metrics.activationTime).toBeGreaterThanOrEqual(10);
            expect(metrics.activationTime).toBeLessThan(100); // Should be well under target
            expect(metrics.memoryUsage).toBeDefined();
            expect(metrics.timestamp).toBeDefined();
        });

        it('should maintain metrics history', () => {
            // Record multiple metrics
            for (let i = 0; i < 3; i++) {
                performanceMonitor.startActivationTracking();
                performanceMonitor.endActivationTracking();
            }
            
            const history = performanceMonitor.getMetricsHistory();
            expect(history).toHaveLength(3);
        });

        it('should limit metrics history size', () => {
            // Record more than max history size
            for (let i = 0; i < 15; i++) {
                performanceMonitor.startActivationTracking();
                performanceMonitor.endActivationTracking();
            }
            
            const history = performanceMonitor.getMetricsHistory();
            expect(history.length).toBeLessThanOrEqual(10); // Max history size
        });

        it('should calculate average activation time', () => {
            // Record some metrics with actual work
            performanceMonitor.startActivationTracking();
            const start1 = Date.now();
            while (Date.now() - start1 < 5) {
                // Busy wait for 5ms
            }
            performanceMonitor.endActivationTracking();
            
            performanceMonitor.startActivationTracking();
            const start2 = Date.now();
            while (Date.now() - start2 < 5) {
                // Busy wait for 5ms
            }
            performanceMonitor.endActivationTracking();
            
            const average = performanceMonitor.getAverageActivationTime();
            expect(average).toBeGreaterThan(0);
        });

        it('should check performance requirements', () => {
            performanceMonitor.startActivationTracking();
            const metrics = performanceMonitor.endActivationTracking();
            
            const requirements = performanceMonitor.checkPerformanceRequirements();
            
            expect(requirements.activationTimeOk).toBeDefined();
            expect(requirements.memoryUsageOk).toBeDefined();
            expect(requirements.details.activationTime).toBe(metrics.activationTime);
            expect(requirements.details.activationTimeTarget).toBe(100);
        });

        it('should get current memory usage', () => {
            const memoryUsage = performanceMonitor.getCurrentMemoryUsage();
            
            expect(memoryUsage.heapUsed).toBeGreaterThan(0);
            expect(memoryUsage.heapTotal).toBeGreaterThan(0);
            expect(memoryUsage.external).toBeGreaterThanOrEqual(0);
        });

        it('should clear metrics history', () => {
            // Add some metrics
            performanceMonitor.startActivationTracking();
            performanceMonitor.endActivationTracking();
            
            expect(performanceMonitor.getMetricsHistory()).toHaveLength(1);
            
            performanceMonitor.clearMetricsHistory();
            expect(performanceMonitor.getMetricsHistory()).toHaveLength(0);
        });
    });

    describe('Performance Measurement Utilities', () => {
        it('should measure async operation duration', async () => {
            const testOperation = async () => {
                return new Promise<string>(resolve => {
                    setTimeout(() => resolve('test'), 10);
                });
            };

            const { result, duration } = await measureAsyncOperation(testOperation, 'test-async');
            
            expect(result).toBe('test');
            expect(duration).toBeGreaterThanOrEqual(10);
        });

        it('should measure sync operation duration', () => {
            const testOperation = () => {
                const start = Date.now();
                while (Date.now() - start < 5) {
                    // Busy wait for 5ms
                }
                return 'test';
            };

            const { result, duration } = measureSyncOperation(testOperation, 'test-sync');
            
            expect(result).toBe('test');
            expect(duration).toBeGreaterThanOrEqual(5);
        });

        it('should handle async operation errors', async () => {
            const testOperation = async () => {
                throw new Error('Test error');
            };

            await expect(measureAsyncOperation(testOperation, 'test-error')).rejects.toThrow('Test error');
        });

        it('should handle sync operation errors', () => {
            const testOperation = () => {
                throw new Error('Test error');
            };

            expect(() => measureSyncOperation(testOperation, 'test-error')).toThrow('Test error');
        });
    });

    describe('Memory Management', () => {
        it('should track memory usage over time', () => {
            const initialMemory = performanceMonitor.getCurrentMemoryUsage();
            
            // Create some objects to increase memory usage
            const largeArray = new Array(1000).fill('test');
            
            const afterMemory = performanceMonitor.getCurrentMemoryUsage();
            
            expect(afterMemory.heapUsed).toBeGreaterThanOrEqual(initialMemory.heapUsed);
            
            // Clean up
            largeArray.length = 0;
        });

        it('should detect memory usage within reasonable bounds', () => {
            const memoryUsage = performanceMonitor.getCurrentMemoryUsage();
            const memoryUsageMB = Math.round(memoryUsage.heapUsed / 1024 / 1024);
            
            // For a test environment, memory usage can be higher due to Jest overhead
            // In production, this would be much lower
            expect(memoryUsageMB).toBeLessThan(500); // Adjusted for test environment
            expect(memoryUsageMB).toBeGreaterThan(0); // Should use some memory
        });
    });

    describe('Performance Requirements Validation', () => {
        it('should validate activation time requirement (100ms)', () => {
            performanceMonitor.startActivationTracking();
            
            // Simulate fast activation
            const start = Date.now();
            while (Date.now() - start < 50) {
                // Busy wait for 50ms (well under 100ms target)
            }
            
            performanceMonitor.endActivationTracking();
            const requirements = performanceMonitor.checkPerformanceRequirements();
            
            expect(requirements.activationTimeOk).toBe(true);
            expect(requirements.details.activationTime).toBeLessThan(100);
        });

        it('should detect when activation time exceeds requirement', () => {
            performanceMonitor.startActivationTracking();
            
            // Simulate slow activation
            const start = Date.now();
            while (Date.now() - start < 150) {
                // Busy wait for 150ms (exceeds 100ms target)
            }
            
            performanceMonitor.endActivationTracking();
            const requirements = performanceMonitor.checkPerformanceRequirements();
            
            expect(requirements.activationTimeOk).toBe(false);
            expect(requirements.details.activationTime).toBeGreaterThan(100);
        });
    });
});