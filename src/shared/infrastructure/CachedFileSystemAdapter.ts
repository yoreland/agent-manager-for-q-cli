import * as fs from 'fs/promises';
import * as path from 'path';
import * as vscode from 'vscode';
import { IFileSystemAdapter, FileEvent, FileWatcher } from './IFileSystemAdapter';
import { ICache } from './ICache';
import { ILogger } from './ILogger';
import { Result, success, failure } from '../errors/result';

export class CachedFileSystemAdapter implements IFileSystemAdapter {
    private watchers = new Map<string, vscode.FileSystemWatcher>();
    private disposed = false;

    constructor(
        private cache: ICache,
        private logger: ILogger
    ) {}

    async readFile(filePath: string): Promise<Result<string>> {
        if (this.disposed) {
            return failure(new Error('FileSystemAdapter is disposed'));
        }

        try {
            // Check cache first
            const cacheKey = `file:${filePath}`;
            const cached = await this.cache.get<string>(cacheKey);
            if (cached !== null) {
                this.logger.debug('File read from cache', { path: filePath });
                return success(cached);
            }

            // Read from file system
            const content = await fs.readFile(filePath, 'utf-8');
            
            // Cache for 1 minute
            await this.cache.set(cacheKey, content, 60000);
            
            this.logger.debug('File read from disk', { path: filePath, size: content.length });
            return success(content);
        } catch (error) {
            this.logger.error('Failed to read file', error as Error, { path: filePath });
            return failure(error as Error);
        }
    }

    async writeFile(filePath: string, content: string): Promise<Result<void>> {
        if (this.disposed) {
            return failure(new Error('FileSystemAdapter is disposed'));
        }

        try {
            await fs.writeFile(filePath, content, 'utf-8');
            
            // Update cache
            const cacheKey = `file:${filePath}`;
            await this.cache.set(cacheKey, content, 60000);
            
            this.logger.debug('File written', { path: filePath, size: content.length });
            return success(undefined);
        } catch (error) {
            this.logger.error('Failed to write file', error as Error, { path: filePath });
            return failure(error as Error);
        }
    }

    async deleteFile(filePath: string): Promise<Result<void>> {
        if (this.disposed) {
            return failure(new Error('FileSystemAdapter is disposed'));
        }

        try {
            await fs.unlink(filePath);
            
            // Remove from cache
            const cacheKey = `file:${filePath}`;
            await this.cache.delete(cacheKey);
            
            this.logger.debug('File deleted', { path: filePath });
            return success(undefined);
        } catch (error) {
            this.logger.error('Failed to delete file', error as Error, { path: filePath });
            return failure(error as Error);
        }
    }

    async exists(filePath: string): Promise<Result<boolean>> {
        if (this.disposed) {
            return failure(new Error('FileSystemAdapter is disposed'));
        }

        try {
            await fs.access(filePath);
            return success(true);
        } catch {
            return success(false);
        }
    }

    async ensureDirectory(dirPath: string): Promise<Result<void>> {
        if (this.disposed) {
            return failure(new Error('FileSystemAdapter is disposed'));
        }

        try {
            await fs.mkdir(dirPath, { recursive: true });
            this.logger.debug('Directory ensured', { path: dirPath });
            return success(undefined);
        } catch (error) {
            this.logger.error('Failed to ensure directory', error as Error, { path: dirPath });
            return failure(error as Error);
        }
    }

    async readDirectory(dirPath: string): Promise<Result<string[]>> {
        if (this.disposed) {
            return failure(new Error('FileSystemAdapter is disposed'));
        }

        try {
            // Check cache first
            const cacheKey = `dir:${dirPath}`;
            const cached = await this.cache.get<string[]>(cacheKey);
            if (cached !== null) {
                this.logger.debug('Directory read from cache', { path: dirPath });
                return success(cached);
            }

            // Read from file system
            const entries = await fs.readdir(dirPath);
            
            // Cache for 30 seconds
            await this.cache.set(cacheKey, entries, 30000);
            
            this.logger.debug('Directory read from disk', { path: dirPath, count: entries.length });
            return success(entries);
        } catch (error) {
            this.logger.error('Failed to read directory', error as Error, { path: dirPath });
            return failure(error as Error);
        }
    }

    async watchFile(filePath: string, callback: (event: FileEvent) => void): Promise<Result<FileWatcher>> {
        return this.createWatcher(filePath, callback, false);
    }

    async watchDirectory(dirPath: string, callback: (event: FileEvent) => void): Promise<Result<FileWatcher>> {
        return this.createWatcher(dirPath, callback, true);
    }

    private async createWatcher(
        watchPath: string, 
        callback: (event: FileEvent) => void, 
        isDirectory: boolean
    ): Promise<Result<FileWatcher>> {
        if (this.disposed) {
            return failure(new Error('FileSystemAdapter is disposed'));
        }

        try {
            const pattern = isDirectory ? path.join(watchPath, '**/*') : watchPath;
            const watcher = vscode.workspace.createFileSystemWatcher(pattern);
            
            const handleEvent = (type: 'created' | 'modified' | 'deleted') => (uri: vscode.Uri) => {
                // Invalidate cache
                const cacheKey = isDirectory ? `dir:${watchPath}` : `file:${watchPath}`;
                this.cache.delete(cacheKey);
                
                callback({
                    type,
                    path: uri.fsPath,
                    timestamp: new Date()
                });
            };

            watcher.onDidCreate(handleEvent('created'));
            watcher.onDidChange(handleEvent('modified'));
            watcher.onDidDelete(handleEvent('deleted'));

            const watcherKey = `${isDirectory ? 'dir' : 'file'}:${watchPath}`;
            this.watchers.set(watcherKey, watcher);

            const fileWatcher: FileWatcher = {
                dispose: () => {
                    watcher.dispose();
                    this.watchers.delete(watcherKey);
                }
            };

            this.logger.debug('File watcher created', { path: watchPath, isDirectory });
            return success(fileWatcher);
        } catch (error) {
            this.logger.error('Failed to create file watcher', error as Error, { path: watchPath });
            return failure(error as Error);
        }
    }

    dispose(): void {
        if (this.disposed) return;
        
        this.disposed = true;
        
        // Dispose all watchers
        for (const watcher of this.watchers.values()) {
            watcher.dispose();
        }
        this.watchers.clear();
        
        this.logger.debug('FileSystemAdapter disposed');
    }
}
