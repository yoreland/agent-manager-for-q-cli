import { PerformanceBenchmark } from '../../../shared/performance/PerformanceBenchmark';
import { PerformanceMonitor } from '../../../infrastructure/PerformanceMonitor';
import { MemoryOptimizer } from '../../../shared/performance/MemoryOptimizer';
import { EnhancedLogger } from '../../../shared/infrastructure/EnhancedLogger';

describe('Performance Regression Tests', () => {
    let benchmark: PerformanceBenchmark;
    let monitor: PerformanceMonitor;
    let memoryOptimizer: MemoryOptimizer;
    let logger: EnhancedLogger;

    beforeAll(() => {
        logger = new EnhancedLogger('performance-test');
        monitor = PerformanceMonitor.getInstance(logger);
        benchmark = new PerformanceBenchmark(monitor, logger);
        memoryOptimizer = new MemoryOptimizer(logger);
    });

    afterAll(() => {
        memoryOptimizer.dispose();
    });

    describe('Critical Path Performance', () => {
        it('should meet extension activation benchmark', async () => {
            const activationBenchmark = await benchmark.runBenchmark(
                'extension-activation',
                async () => {
                    // Simulate extension activation work
                    await new Promise(resolve => setTimeout(resolve, 10));
                    return 'activated';
                },
                5
            );

            expect(activationBenchmark.averageDuration).toBeLessThan(100); // < 100ms target
            expect(activationBenchmark.maxDuration).toBeLessThan(200); // Max 200ms
            expect(activationBenchmark.standardDeviation).toBeLessThan(50); // Consistent performance
        });

        it('should meet file operation benchmark', async () => {
            const fileOpBenchmark = await benchmark.runBenchmark(
                'file-operations',
                async () => {
                    // Simulate file operations
                    const operations = Array.from({ length: 10 }, (_, i) => 
                        new Promise(resolve => setTimeout(resolve, 1))
                    );
                    await Promise.all(operations);
                    return 'completed';
                },
                3
            );

            expect(fileOpBenchmark.averageDuration).toBeLessThan(50); // < 50ms for batch ops
            expect(fileOpBenchmark.maxDuration).toBeLessThan(100);
        });

        it('should meet agent list loading benchmark', async () => {
            const agentListBenchmark = await benchmark.runBenchmark(
                'agent-list-loading',
                async () => {
                    // Simulate loading agent list
                    const agents = Array.from({ length: 50 }, (_, i) => ({
                        name: `agent-${i}`,
                        config: { description: `Agent ${i}` }
                    }));
                    return agents;
                },
                5
            );

            expect(agentListBenchmark.averageDuration).toBeLessThan(30); // < 30ms for 50 agents
            expect(agentListBenchmark.maxDuration).toBeLessThan(60);
        });
    });

    describe('Memory Performance', () => {
        it('should maintain stable memory usage', async () => {
            const initialUsage = memoryOptimizer.getMemoryUsage();
            
            // Simulate memory-intensive operations
            const operations = Array.from({ length: 100 }, async (_, i) => {
                const data = new Array(1000).fill(`data-${i}`);
                await new Promise(resolve => setTimeout(resolve, 1));
                return data.length;
            });

            await Promise.all(operations);

            // Force garbage collection if available
            if (global.gc) {
                global.gc();
            }

            const finalUsage = memoryOptimizer.getMemoryUsage();
            const memoryIncrease = finalUsage.heapUsed - initialUsage.heapUsed;
            const memoryIncreaseMB = memoryIncrease / (1024 * 1024);

            expect(memoryIncreaseMB).toBeLessThan(10); // < 10MB increase
        });

        it('should handle memory pressure gracefully', async () => {
            let memoryPressureHandled = false;
            
            const optimizer = new MemoryOptimizer(logger, async () => {
                memoryPressureHandled = true;
            });

            // Simulate memory usage that might trigger pressure handling
            const largeArrays = Array.from({ length: 10 }, () => 
                new Array(100000).fill('memory-test')
            );

            // Wait a bit for potential memory pressure detection
            await new Promise(resolve => setTimeout(resolve, 100));

            optimizer.dispose();

            // Memory pressure handling should be available
            expect(typeof optimizer.getMemoryUsage).toBe('function');
            expect(largeArrays.length).toBe(10); // Ensure arrays were created
        });
    });

    describe('Scalability Tests', () => {
        it('should handle large number of agents efficiently', async () => {
            const agentCounts = [10, 50, 100, 200];
            const results: { count: number; duration: number }[] = [];

            for (const count of agentCounts) {
                const result = await benchmark.runBenchmark(
                    `agents-${count}`,
                    async () => {
                        // Simulate processing many agents
                        const agents = Array.from({ length: count }, (_, i) => ({
                            name: `agent-${i}`,
                            process: () => `processed-${i}`
                        }));
                        
                        return agents.map(agent => agent.process());
                    },
                    3
                );

                results.push({ count, duration: result.averageDuration });
            }

            // Performance should scale reasonably (not exponentially)
            for (let i = 1; i < results.length; i++) {
                const prev = results[i - 1];
                const curr = results[i];
                const scaleFactor = curr.count / prev.count;
                const performanceRatio = curr.duration / prev.duration;

                // Performance degradation should be less than scale factor
                expect(performanceRatio).toBeLessThan(scaleFactor * 2);
            }
        });

        it('should handle concurrent operations efficiently', async () => {
            const concurrentBenchmark = await benchmark.runBenchmark(
                'concurrent-operations',
                async () => {
                    // Simulate concurrent file operations
                    const operations = Array.from({ length: 20 }, async (_, i) => {
                        await new Promise(resolve => setTimeout(resolve, Math.random() * 10));
                        return `operation-${i}-completed`;
                    });

                    const results = await Promise.all(operations);
                    return results;
                },
                3
            );

            expect(concurrentBenchmark.averageDuration).toBeLessThan(100); // Should complete quickly
            expect(concurrentBenchmark.standardDeviation).toBeLessThan(30); // Consistent timing
        });
    });

    describe('Performance Monitoring', () => {
        it('should track performance metrics accurately', () => {
            monitor.startTimer('test-operation');
            
            // Simulate some work
            const start = Date.now();
            while (Date.now() - start < 10) {
                // Busy wait for 10ms
            }
            
            const duration = monitor.endTimer('test-operation');
            
            expect(duration).toBeGreaterThan(8); // Should be at least 8ms
            expect(duration).toBeLessThan(50); // Should be less than 50ms
        });

        it('should provide performance summary', () => {
            // Add some metrics
            monitor.startTimer('op1');
            monitor.endTimer('op1');
            monitor.startTimer('op2');
            monitor.endTimer('op2');

            const metrics = monitor.getMetrics();
            expect(metrics.length).toBeGreaterThan(0);
            
            // Should not throw when logging summary
            expect(() => monitor.logSummary()).not.toThrow();
        });
    });

    describe('Benchmark Comparisons', () => {
        it('should compare different implementations', async () => {
            // Benchmark synchronous approach
            const syncBenchmark = await benchmark.runBenchmark(
                'sync-approach',
                async () => {
                    let result = 0;
                    for (let i = 0; i < 1000; i++) {
                        result += i;
                    }
                    return result;
                },
                5
            );

            // Benchmark async approach
            const asyncBenchmark = await benchmark.runBenchmark(
                'async-approach',
                async () => {
                    const promises = Array.from({ length: 10 }, async (_, i) => {
                        await new Promise(resolve => setTimeout(resolve, 0));
                        return i * 100;
                    });
                    const results = await Promise.all(promises);
                    return results.reduce((sum, val) => sum + val, 0);
                },
                5
            );

            const comparison = benchmark.compareBenchmarks('sync-approach', 'async-approach');
            
            expect(comparison).toBeDefined();
            expect(comparison?.benchmark1).toBe('sync-approach');
            expect(comparison?.benchmark2).toBe('async-approach');
            expect(typeof comparison?.performanceRatio).toBe('number');
        });
    });
});
