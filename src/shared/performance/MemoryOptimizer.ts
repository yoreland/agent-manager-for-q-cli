import { ILogger } from '../infrastructure/ILogger';

export class MemoryOptimizer {
    private memoryThreshold = 100 * 1024 * 1024; // 100MB
    private checkInterval = 30000; // 30 seconds
    private intervalId: NodeJS.Timeout | undefined;
    private disposed = false;

    constructor(
        private logger: ILogger,
        private onMemoryPressure?: () => Promise<void>
    ) {}

    startMonitoring(): void {
        if (this.disposed || this.intervalId) {return;}

        this.intervalId = setInterval(() => {
            this.checkMemoryUsage();
        }, this.checkInterval);

        this.logger.debug('Memory monitoring started');
    }

    stopMonitoring(): void {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = undefined;
            this.logger.debug('Memory monitoring stopped');
        }
    }

    async forceGarbageCollection(): Promise<void> {
        if (global.gc) {
            global.gc();
            this.logger.debug('Forced garbage collection');
        } else {
            this.logger.warn('Garbage collection not available');
        }
    }

    getMemoryUsage(): MemoryUsage {
        const usage = process.memoryUsage();
        return {
            heapUsed: usage.heapUsed,
            heapTotal: usage.heapTotal,
            external: usage.external,
            rss: usage.rss,
            timestamp: Date.now()
        };
    }

    private async checkMemoryUsage(): Promise<void> {
        const usage = this.getMemoryUsage();
        
        if (usage.heapUsed > this.memoryThreshold) {
            this.logger.warn('High memory usage detected', {
                heapUsed: Math.round(usage.heapUsed / 1024 / 1024),
                threshold: Math.round(this.memoryThreshold / 1024 / 1024)
            });

            if (this.onMemoryPressure) {
                try {
                    await this.onMemoryPressure();
                } catch (error) {
                    this.logger.error('Error handling memory pressure', error as Error);
                }
            }

            await this.forceGarbageCollection();
        }
    }

    dispose(): void {
        if (this.disposed) {return;}

        this.disposed = true;
        this.stopMonitoring();
        this.logger.debug('MemoryOptimizer disposed');
    }
}

export interface MemoryUsage {
    heapUsed: number;
    heapTotal: number;
    external: number;
    rss: number;
    timestamp: number;
}
