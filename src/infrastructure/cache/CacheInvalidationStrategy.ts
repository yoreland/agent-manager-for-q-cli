import { FileEvent } from '../infrastructure/IFileSystemAdapter';
import { CacheManager } from './CacheManager';
import { ILogger } from '../infrastructure/ILogger';

export class CacheInvalidationStrategy {
    constructor(
        private cacheManager: CacheManager,
        private logger: ILogger
    ) {}

    async handleFileSystemEvent(event: FileEvent): Promise<void> {
        this.logger.debug('Processing file system event for cache invalidation', { event });

        const { path, type } = event;

        // Invalidate agent config cache for agent files
        if (path.includes('.amazonq/cli-agents') && path.endsWith('.json')) {
            await this.invalidateAgentCache(path);
        }

        // Invalidate file system cache for any file changes
        await this.invalidateFileSystemCache(path);

        // Invalidate directory cache for directory changes
        if (type === 'created' || type === 'deleted') {
            await this.invalidateDirectoryCache(path);
        }
    }

    private async invalidateAgentCache(filePath: string): Promise<void> {
        const agentName = this.extractAgentName(filePath);
        if (agentName) {
            const cache = this.cacheManager.getCache('agents');
            if (cache) {
                await cache.delete(agentName);
                this.logger.debug('Agent cache invalidated', { agentName });
            }
        }
    }

    private async invalidateFileSystemCache(filePath: string): Promise<void> {
        const cache = this.cacheManager.getCache('filesystem');
        if (cache) {
            // Invalidate the specific file and its parent directory
            await cache.delete(filePath);
            
            const parentDir = this.getParentDirectory(filePath);
            if (parentDir) {
                await cache.delete(parentDir);
            }
            
            this.logger.debug('File system cache invalidated', { filePath });
        }
    }

    private async invalidateDirectoryCache(path: string): Promise<void> {
        const cache = this.cacheManager.getCache('directories');
        if (cache) {
            await cache.delete(path);
            
            // Also invalidate parent directories
            const parentDir = this.getParentDirectory(path);
            if (parentDir) {
                await cache.delete(parentDir);
            }
            
            this.logger.debug('Directory cache invalidated', { path });
        }
    }

    private extractAgentName(filePath: string): string | null {
        const match = filePath.match(/([^/\\]+)\.json$/);
        return match ? match[1] : null;
    }

    private getParentDirectory(filePath: string): string | null {
        const lastSlash = Math.max(filePath.lastIndexOf('/'), filePath.lastIndexOf('\\'));
        return lastSlash > 0 ? filePath.substring(0, lastSlash) : null;
    }
}
