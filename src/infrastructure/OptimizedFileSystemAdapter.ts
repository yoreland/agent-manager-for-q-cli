import { CachedFileSystemAdapter } from '../shared/infrastructure/CachedFileSystemAdapter';
import { BatchProcessor } from './BatchProcessor';
import { ICache } from '../shared/infrastructure/ICache';
import { ILogger } from '../shared/infrastructure/ILogger';
import { Result, success, failure } from '../shared/errors/result';

export class OptimizedFileSystemAdapter extends CachedFileSystemAdapter {
    private readBatchProcessor: BatchProcessor<string, string>;
    private writeBatchProcessor: BatchProcessor<WriteOperation, void>;

    constructor(
        cache: ICache,
        logger: ILogger
    ) {
        super(cache, logger);
        
        this.readBatchProcessor = new BatchProcessor(
            this.processBatchReads.bind(this),
            logger,
            10, // batch size
            50  // delay ms
        );

        this.writeBatchProcessor = new BatchProcessor(
            this.processBatchWrites.bind(this),
            logger,
            5,  // batch size
            100 // delay ms
        );
    }

    async readFileBatched(path: string): Promise<Result<string>> {
        try {
            const content = await this.readBatchProcessor.add(path);
            return success(content);
        } catch (error) {
            return failure(error as Error);
        }
    }

    async writeFileBatched(path: string, content: string): Promise<Result<void>> {
        try {
            await this.writeBatchProcessor.add({ path, content });
            return success(undefined);
        } catch (error) {
            return failure(error as Error);
        }
    }

    private async processBatchReads(paths: string[]): Promise<string[]> {
        const results: string[] = [];
        
        for (const path of paths) {
            try {
                const result = await super.readFile(path);
                if (result.success) {
                    results.push(result.data);
                } else {
                    throw result.error;
                }
            } catch (error) {
                this.logger.error('Batch read failed for path', error as Error, { path });
                results.push(''); // Return empty string for failed reads
            }
        }
        
        return results;
    }

    private async processBatchWrites(operations: WriteOperation[]): Promise<void[]> {
        const results: void[] = [];
        
        for (const { path, content } of operations) {
            try {
                const result = await super.writeFile(path, content);
                if (!result.success) {
                    throw result.error;
                }
                results.push();
            } catch (error) {
                this.logger.error('Batch write failed for path', error as Error, { path });
                results.push(); // Continue with other operations
            }
        }
        
        return results;
    }

    async flushBatches(): Promise<void> {
        await Promise.all([
            this.readBatchProcessor.flush(),
            this.writeBatchProcessor.flush()
        ]);
    }

    dispose(): void {
        this.readBatchProcessor.dispose();
        this.writeBatchProcessor.dispose();
        super.dispose();
    }
}

interface WriteOperation {
    path: string;
    content: string;
}
