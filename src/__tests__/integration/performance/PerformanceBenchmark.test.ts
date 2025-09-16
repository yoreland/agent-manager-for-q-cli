import { PerformanceBenchmark } from '../../../shared/performance/PerformanceBenchmark';
import { PerformanceMonitor } from '../../../infrastructure/PerformanceMonitor';
import { ILogger } from '../../../shared/infrastructure/ILogger';

describe('PerformanceBenchmark Integration', () => {
    let benchmark: PerformanceBenchmark;
    let mockPerformanceMonitor: jest.Mocked<PerformanceMonitor>;
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

        mockPerformanceMonitor = {
            measureAsync: jest.fn().mockImplementation(async (_name, fn) => {
                const start = Date.now();
                await fn();
                return Date.now() - start;
            })
        } as any;

        benchmark = new PerformanceBenchmark(mockPerformanceMonitor, mockLogger);
    });

    describe('benchmark execution', () => {
        it('should run benchmark and return results', async () => {
            const testOperation = async () => {
                await new Promise(resolve => setTimeout(resolve, 10));
                return 'result';
            };

            const result = await benchmark.runBenchmark('test-operation', testOperation, 3);

            expect(result.name).toBe('test-operation');
            expect(result.iterations).toBe(3);
            expect(result.results).toHaveLength(3);
            expect(result.averageDuration).toBeGreaterThan(0);
            expect(result.minDuration).toBeGreaterThan(0);
            expect(result.maxDuration).toBeGreaterThan(0);
            expect(typeof result.standardDeviation).toBe('number');
            expect(typeof result.averageMemoryDelta).toBe('number');
            expect(result.timestamp).toBeGreaterThan(0);

            expect(mockLogger.info).toHaveBeenCalledWith('Running benchmark', { name: 'test-operation', iterations: 3 });
            expect(mockLogger.info).toHaveBeenCalledWith('Benchmark completed', expect.objectContaining({
                name: 'test-operation'
            }));
        });

        it('should store and retrieve benchmark results', async () => {
            const testOperation = async () => 'result';

            await benchmark.runBenchmark('stored-test', testOperation, 2);

            const storedResult = benchmark.getBenchmark('stored-test');
            expect(storedResult).toBeDefined();
            expect(storedResult?.name).toBe('stored-test');
            expect(storedResult?.iterations).toBe(2);
        });

        it('should return all benchmarks', async () => {
            const testOperation = async () => 'result';

            await benchmark.runBenchmark('test1', testOperation, 1);
            await benchmark.runBenchmark('test2', testOperation, 1);

            const allBenchmarks = benchmark.getAllBenchmarks();
            expect(allBenchmarks).toHaveLength(2);
            expect(allBenchmarks.map(b => b.name)).toContain('test1');
            expect(allBenchmarks.map(b => b.name)).toContain('test2');
        });
    });

    describe('benchmark comparison', () => {
        it('should compare two benchmarks', async () => {
            const fastOperation = async () => {
                await new Promise(resolve => setTimeout(resolve, 5));
            };

            const slowOperation = async () => {
                await new Promise(resolve => setTimeout(resolve, 15));
            };

            await benchmark.runBenchmark('fast-op', fastOperation, 2);
            await benchmark.runBenchmark('slow-op', slowOperation, 2);

            const comparison = benchmark.compareBenchmarks('fast-op', 'slow-op');

            expect(comparison).toBeDefined();
            expect(comparison?.benchmark1).toBe('fast-op');
            expect(comparison?.benchmark2).toBe('slow-op');
            expect(typeof comparison?.performanceRatio).toBe('number');
            expect(typeof comparison?.memoryRatio).toBe('number');
            expect(typeof comparison?.fasterBenchmark).toBe('string');
            expect(typeof comparison?.memoryEfficientBenchmark).toBe('string');
        });

        it('should return null for non-existent benchmarks', () => {
            const comparison = benchmark.compareBenchmarks('non-existent1', 'non-existent2');
            expect(comparison).toBeNull();
        });
    });

    describe('result export', () => {
        it('should export results as JSON', async () => {
            const testOperation = async () => 'result';
            await benchmark.runBenchmark('export-test', testOperation, 1);

            const exported = benchmark.exportResults();
            const parsed = JSON.parse(exported);

            expect(Array.isArray(parsed)).toBe(true);
            expect(parsed).toHaveLength(1);
            expect(parsed[0].name).toBe('export-test');
        });
    });
});
