import { PerformanceMonitor } from '../../infrastructure/PerformanceMonitor';
import { ILogger } from '../infrastructure/ILogger';

export class PerformanceBenchmark {
    private benchmarks = new Map<string, BenchmarkResult>();

    constructor(
        private performanceMonitor: PerformanceMonitor,
        private logger: ILogger
    ) {}

    async runBenchmark<T>(
        name: string,
        operation: () => Promise<T>,
        iterations = 10
    ): Promise<BenchmarkResult> {
        this.logger.info('Running benchmark', { name, iterations });

        const results: number[] = [];
        let totalMemoryDelta = 0;

        for (let i = 0; i < iterations; i++) {
            const memoryBefore = process.memoryUsage().heapUsed;
            
            const duration = await this.performanceMonitor.measureAsync(
                `benchmark.${name}.iteration.${i}`,
                operation
            ) as number;
            
            const memoryAfter = process.memoryUsage().heapUsed;
            const memoryDelta = memoryAfter - memoryBefore;
            
            results.push(duration);
            totalMemoryDelta += memoryDelta;
        }

        const benchmark: BenchmarkResult = {
            name,
            iterations,
            results,
            averageDuration: results.reduce((sum, r) => sum + r, 0) / iterations,
            minDuration: Math.min(...results),
            maxDuration: Math.max(...results),
            standardDeviation: this.calculateStandardDeviation(results),
            averageMemoryDelta: totalMemoryDelta / iterations,
            timestamp: Date.now()
        };

        this.benchmarks.set(name, benchmark);
        this.logger.info('Benchmark completed', {
            name,
            averageDuration: Math.round(benchmark.averageDuration),
            minDuration: benchmark.minDuration,
            maxDuration: benchmark.maxDuration
        });

        return benchmark;
    }

    getBenchmark(name: string): BenchmarkResult | undefined {
        return this.benchmarks.get(name);
    }

    getAllBenchmarks(): BenchmarkResult[] {
        return Array.from(this.benchmarks.values());
    }

    compareBenchmarks(name1: string, name2: string): BenchmarkComparison | null {
        const benchmark1 = this.benchmarks.get(name1);
        const benchmark2 = this.benchmarks.get(name2);

        if (!benchmark1 || !benchmark2) {
            return null;
        }

        const performanceRatio = benchmark2.averageDuration / benchmark1.averageDuration;
        const memoryRatio = benchmark2.averageMemoryDelta / benchmark1.averageMemoryDelta;

        return {
            benchmark1: benchmark1.name,
            benchmark2: benchmark2.name,
            performanceRatio,
            memoryRatio,
            fasterBenchmark: performanceRatio < 1 ? benchmark2.name : benchmark1.name,
            memoryEfficientBenchmark: memoryRatio < 1 ? benchmark2.name : benchmark1.name
        };
    }

    private calculateStandardDeviation(values: number[]): number {
        const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
        const squaredDifferences = values.map(value => Math.pow(value - mean, 2));
        const variance = squaredDifferences.reduce((sum, value) => sum + value, 0) / values.length;
        return Math.sqrt(variance);
    }

    exportResults(): string {
        const results = this.getAllBenchmarks();
        return JSON.stringify(results, null, 2);
    }
}

export interface BenchmarkResult {
    name: string;
    iterations: number;
    results: number[];
    averageDuration: number;
    minDuration: number;
    maxDuration: number;
    standardDeviation: number;
    averageMemoryDelta: number;
    timestamp: number;
}

export interface BenchmarkComparison {
    benchmark1: string;
    benchmark2: string;
    performanceRatio: number;
    memoryRatio: number;
    fasterBenchmark: string;
    memoryEfficientBenchmark: string;
}
