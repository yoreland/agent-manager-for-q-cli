import { IFileSystemAdapter, FileWatcher, FileEvent } from '../shared/infrastructure/IFileSystemAdapter';
import { ILogger } from '../shared/infrastructure/ILogger';
import { Result, success, failure } from '../shared/errors/result';

export class FileWatcherPool {
    private watchers = new Map<string, PooledWatcher>();
    private disposed = false;

    constructor(
        private fileSystem: IFileSystemAdapter,
        private logger: ILogger
    ) {}

    async watchFile(path: string, callback: (event: FileEvent) => void): Promise<Result<FileWatcher>> {
        return this.getOrCreateWatcher(path, callback, false);
    }

    async watchDirectory(path: string, callback: (event: FileEvent) => void): Promise<Result<FileWatcher>> {
        return this.getOrCreateWatcher(path, callback, true);
    }

    private async getOrCreateWatcher(
        path: string, 
        callback: (event: FileEvent) => void, 
        isDirectory: boolean
    ): Promise<Result<FileWatcher>> {
        if (this.disposed) {
            return failure(new Error('FileWatcherPool is disposed'));
        }

        const key = `${isDirectory ? 'dir' : 'file'}:${path}`;
        let pooledWatcher = this.watchers.get(key);

        if (!pooledWatcher) {
            // Create new watcher
            const watcherResult = isDirectory 
                ? await this.fileSystem.watchDirectory(path, (event) => this.handleEvent(key, event))
                : await this.fileSystem.watchFile(path, (event) => this.handleEvent(key, event));

            if (!watcherResult.success) {
                return failure(watcherResult.error);
            }

            pooledWatcher = {
                watcher: watcherResult.data,
                callbacks: new Set(),
                refCount: 0
            };
            this.watchers.set(key, pooledWatcher);
            this.logger.debug('Created new file watcher', { path, isDirectory });
        }

        // Add callback and increment reference count
        pooledWatcher.callbacks.add(callback);
        pooledWatcher.refCount++;

        // Return a wrapper that handles cleanup
        const wrapper: FileWatcher = {
            dispose: () => {
                this.releaseWatcher(key, callback);
            }
        };

        return success(wrapper);
    }

    private handleEvent(key: string, event: FileEvent): void {
        const pooledWatcher = this.watchers.get(key);
        if (!pooledWatcher) return;

        // Notify all callbacks
        for (const callback of pooledWatcher.callbacks) {
            try {
                callback(event);
            } catch (error) {
                this.logger.error('Error in file watcher callback', error as Error, { key, event });
            }
        }
    }

    private releaseWatcher(key: string, callback: (event: FileEvent) => void): void {
        const pooledWatcher = this.watchers.get(key);
        if (!pooledWatcher) return;

        // Remove callback and decrement reference count
        pooledWatcher.callbacks.delete(callback);
        pooledWatcher.refCount--;

        // If no more references, dispose the watcher
        if (pooledWatcher.refCount <= 0) {
            pooledWatcher.watcher.dispose();
            this.watchers.delete(key);
            this.logger.debug('Disposed file watcher', { key });
        }
    }

    dispose(): void {
        if (this.disposed) return;

        this.disposed = true;

        // Dispose all watchers
        for (const [key, pooledWatcher] of this.watchers.entries()) {
            pooledWatcher.watcher.dispose();
            this.logger.debug('Disposed file watcher during pool cleanup', { key });
        }

        this.watchers.clear();
        this.logger.debug('FileWatcherPool disposed');
    }
}

interface PooledWatcher {
    watcher: FileWatcher;
    callbacks: Set<(event: FileEvent) => void>;
    refCount: number;
}
