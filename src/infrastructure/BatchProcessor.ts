import { ILogger } from '../shared/infrastructure/ILogger';

export class BatchProcessor<T, R> {
    private queue: BatchItem<T>[] = [];
    private timer: NodeJS.Timeout | undefined;
    private processing = false;
    private disposed = false;

    constructor(
        private processor: (items: T[]) => Promise<R[]>,
        private logger: ILogger,
        private batchSize = 10,
        private delay = 100
    ) {}

    async add(item: T): Promise<R> {
        if (this.disposed) {
            throw new Error('BatchProcessor is disposed');
        }

        return new Promise<R>((resolve, reject) => {
            const batchItem: BatchItem<T> = {
                item,
                resolve,
                reject
            };

            this.queue.push(batchItem);
            this.scheduleProcessing();
        });
    }

    async flush(): Promise<void> {
        if (this.timer) {
            clearTimeout(this.timer);
            this.timer = undefined;
        }

        if (this.queue.length > 0 && !this.processing) {
            await this.processBatch();
        }
    }

    private scheduleProcessing(): void {
        if (this.processing || this.disposed) {return;}

        // Process immediately if batch is full
        if (this.queue.length >= this.batchSize) {
            this.processBatch();
            return;
        }

        // Schedule delayed processing
        if (this.timer) {
            clearTimeout(this.timer);
        }

        this.timer = setTimeout(() => {
            this.processBatch();
        }, this.delay);
    }

    private async processBatch(): Promise<void> {
        if (this.processing || this.queue.length === 0 || this.disposed) {return;}

        this.processing = true;
        
        try {
            // Take items from queue
            const batchItems = this.queue.splice(0, this.batchSize);
            const items = batchItems.map(bi => bi.item);

            this.logger.debug('Processing batch', { size: items.length });

            // Process batch
            const results = await this.processor(items);

            // Resolve promises
            for (let i = 0; i < batchItems.length; i++) {
                const batchItem = batchItems[i];
                const result = results[i];
                
                if (batchItem && result !== undefined) {
                    batchItem.resolve(result);
                } else if (batchItem) {
                    batchItem.reject(new Error('No result for batch item'));
                }
            }

            this.logger.debug('Batch processed successfully', { size: items.length });

        } catch (error) {
            this.logger.error('Batch processing failed', error as Error);

            // Reject all promises in current batch
            const batchItems = this.queue.splice(0, this.batchSize);
            for (const batchItem of batchItems) {
                batchItem.reject(error as Error);
            }
        } finally {
            this.processing = false;

            // Schedule next batch if queue is not empty
            if (this.queue.length > 0) {
                this.scheduleProcessing();
            }
        }
    }

    dispose(): void {
        if (this.disposed) {return;}

        this.disposed = true;

        if (this.timer) {
            clearTimeout(this.timer);
            this.timer = undefined;
        }

        // Reject all pending items
        for (const batchItem of this.queue) {
            batchItem.reject(new Error('BatchProcessor disposed'));
        }
        this.queue = [];

        this.logger.debug('BatchProcessor disposed');
    }
}

interface BatchItem<T> {
    item: T;
    resolve: (result: any) => void;
    reject: (error: Error) => void;
}
