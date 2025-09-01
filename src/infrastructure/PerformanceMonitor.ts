import { ILogger } from '../shared/infrastructure/ILogger';

export class PerformanceMonitor {
    private static instance: PerformanceMonitor;
    private metrics = new Map<string, PerformanceMetric>();
    private timers = new Map<string, number>();

    constructor(private logger: ILogger) {}

    static getInstance(logger?: ILogger): PerformanceMonitor {
        if (!PerformanceMonitor.instance && logger) {
            PerformanceMonitor.instance = new PerformanceMonitor(logger);
        }
        return PerformanceMonitor.instance;
    }

    startTimer(operation: string): void {
        this.timers.set(operation, Date.now());
    }

    endTimer(operation: string): number {
        const startTime = this.timers.get(operation);
        if (!startTime) {
            this.logger.warn('Timer not found', { operation });
            return 0;
        }

        const duration = Date.now() - startTime;
        this.timers.delete(operation);

        this.recordMetric(operation, duration);
        return duration;
    }

    recordMetric(operation: string, duration: number): void {
        let metric = this.metrics.get(operation);
        if (!metric) {
            metric = {
                operation,
                count: 0,
                totalDuration: 0,
                minDuration: Infinity,
                maxDuration: 0,
                avgDuration: 0
            };
            this.metrics.set(operation, metric);
        }

        metric.count++;
        metric.totalDuration += duration;
        metric.minDuration = Math.min(metric.minDuration, duration);
        metric.maxDuration = Math.max(metric.maxDuration, duration);
        metric.avgDuration = metric.totalDuration / metric.count;

        this.logger.debug('Performance metric recorded', {
            operation,
            duration,
            count: metric.count,
            avgDuration: metric.avgDuration
        });
    }

    getMetrics(): PerformanceMetric[] {
        return Array.from(this.metrics.values());
    }

    getMetric(operation: string): PerformanceMetric | undefined {
        return this.metrics.get(operation);
    }

    clearMetrics(): void {
        this.metrics.clear();
        this.timers.clear();
        this.logger.debug('Performance metrics cleared');
    }

    logSummary(): void {
        const metrics = this.getMetrics();
        if (metrics.length === 0) {
            this.logger.info('No performance metrics to report');
            return;
        }

        this.logger.info('Performance Summary', {
            totalOperations: metrics.length,
            metrics: metrics.map(m => ({
                operation: m.operation,
                count: m.count,
                avgDuration: Math.round(m.avgDuration),
                minDuration: m.minDuration,
                maxDuration: m.maxDuration
            }))
        });
    }

    async measureAsync<T>(operation: string, fn: () => Promise<T>): Promise<T> {
        this.startTimer(operation);
        try {
            const result = await fn();
            this.endTimer(operation);
            return result;
        } catch (error) {
            this.endTimer(operation);
            throw error;
        }
    }

    measure<T>(operation: string, fn: () => T): T {
        this.startTimer(operation);
        try {
            const result = fn();
            this.endTimer(operation);
            return result;
        } catch (error) {
            this.endTimer(operation);
            throw error;
        }
    }
}

export interface PerformanceMetric {
    operation: string;
    count: number;
    totalDuration: number;
    minDuration: number;
    maxDuration: number;
    avgDuration: number;
}
