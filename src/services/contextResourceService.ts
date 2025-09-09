import * as vscode from 'vscode';
import * as path from 'path';
import { AgentConfig } from '../types/agent';
import { ResourceFileItem } from '../types/context';
import { ExtensionLogger } from './logger';

/**
 * Service interface for Context Resource operations
 */
export interface IContextResourceService {
    getResourceFiles(agentConfig: AgentConfig): Promise<ResourceFileItem[]>;
    watchResourceChanges(agentConfig: AgentConfig): vscode.Disposable;
}

/**
 * Cache entry with TTL support
 */
interface CacheEntry {
    data: ResourceFileItem[];
    timestamp: number;
    ttl: number;
}

/**
 * Context Resource Service implementation
 */
export class ContextResourceService implements IContextResourceService {
    private logger: ExtensionLogger;
    private resourceCache = new Map<string, CacheEntry>();
    private fileWatchers = new Map<string, vscode.FileSystemWatcher[]>();
    private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes
    private readonly MAX_CACHE_SIZE = 50;

    constructor(logger: ExtensionLogger) {
        this.logger = logger;
        
        // Cleanup expired cache entries every minute
        setInterval(() => this.cleanupExpiredCache(), 60 * 1000);
    }

    async getResourceFiles(agentConfig: AgentConfig): Promise<ResourceFileItem[]> {
        // Validate input
        if (!agentConfig) {
            throw new Error('Agent configuration is required');
        }

        if (!agentConfig.name) {
            throw new Error('Agent name is required');
        }

        // Check workspace
        if (!vscode.workspace.workspaceFolders || vscode.workspace.workspaceFolders.length === 0) {
            throw new Error('No workspace folder is open');
        }

        const cacheKey = this.getCacheKey(agentConfig);
        
        // Check cache with TTL
        const cached = this.resourceCache.get(cacheKey);
        if (cached && (Date.now() - cached.timestamp) < cached.ttl) {
            return cached.data;
        }

        const resourceFiles: ResourceFileItem[] = [];
        
        if (!agentConfig.resources || agentConfig.resources.length === 0) {
            this.logger.debug(`Agent ${agentConfig.name} has no resources configured`);
            return resourceFiles;
        }

        // Validate resource patterns
        const validResources = agentConfig.resources.filter(resource => {
            if (!resource || typeof resource !== 'string') {
                this.logger.warn(`Invalid resource pattern: ${resource}`);
                return false;
            }
            return true;
        });

        if (validResources.length === 0) {
            throw new Error('No valid resource patterns found');
        }

        // Performance optimization: Process resources in batches with retry
        const batchSize = 10;
        const maxRetries = 2;
        
        for (let i = 0; i < validResources.length; i += batchSize) {
            const batch = validResources.slice(i, i + batchSize);
            
            for (let retry = 0; retry <= maxRetries; retry++) {
                try {
                    const batchPromises = batch.map(async (resourcePath) => {
                        try {
                            const normalizedPath = this.normalizeResourcePath(resourcePath);
                            
                            // Validate normalized path
                            if (!normalizedPath || normalizedPath.trim() === '') {
                                this.logger.warn(`Empty resource path after normalization: ${resourcePath}`);
                                return [];
                            }

                            const matchedFiles = await this.findFiles(normalizedPath);
                            
                            const fileItems = await Promise.all(
                                matchedFiles.map(filePath => this.createResourceFileItem(filePath, resourcePath))
                            );
                            
                            return fileItems.filter(item => item !== null) as ResourceFileItem[];
                        } catch (error) {
                            this.logger.warn(`Failed to process resource path: ${resourcePath}`, error as Error);
                            return [];
                        }
                    });

                    const batchResults = await Promise.all(batchPromises);
                    resourceFiles.push(...batchResults.flat());
                    break; // Success, no need to retry
                    
                } catch (error) {
                    if (retry === maxRetries) {
                        this.logger.error(`Failed to process batch after ${maxRetries} retries`, error as Error);
                        throw new Error(`Resource processing failed: ${(error as Error).message}`);
                    }
                    
                    this.logger.warn(`Batch processing failed, retrying (${retry + 1}/${maxRetries})`, error as Error);
                    await new Promise(resolve => setTimeout(resolve, 1000 * (retry + 1))); // Exponential backoff
                }
            }
        }

        try {
            const hierarchicalFiles = this.buildHierarchicalStructure(resourceFiles);
            
            // Convert to flat list for better UX
            const flatFiles = this.buildFlatListStructure(resourceFiles);
            
            // Cache with size limit and TTL
            this.setCacheEntry(cacheKey, flatFiles);
            
            this.logger.debug(`Loaded ${flatFiles.length} resource files for agent ${agentConfig.name}`);
            return flatFiles;
            
        } catch (error) {
            this.logger.error('Failed to build file structure', error as Error);
            throw new Error(`Failed to organize resource files: ${(error as Error).message}`);
        }
    }

    private buildFlatListStructure(files: ResourceFileItem[]): ResourceFileItem[] {
        // Group files by their original resource pattern
        const patternGroups = new Map<string, ResourceFileItem[]>();
        
        files.forEach(file => {
            const pattern = file.originalPattern;
            if (!patternGroups.has(pattern)) {
                patternGroups.set(pattern, []);
            }
            patternGroups.get(pattern)!.push(file);
        });

        const result: ResourceFileItem[] = [];

        // Create group headers and add files
        for (const [pattern, groupFiles] of patternGroups) {
            // Add pattern group header (no indentation)
            result.push({
                label: this.formatPatternLabel(pattern),
                filePath: '',
                relativePath: pattern,
                originalPattern: pattern,
                fileType: 'directory',
                size: 0,
                lastModified: 0,
                exists: true,
                iconPath: new vscode.ThemeIcon('folder', new vscode.ThemeColor('charts.blue')),
                contextValue: 'patternGroup',
                description: `${groupFiles.length} file${groupFiles.length !== 1 ? 's' : ''}`
            } as ResourceFileItem);

            // Add files in this group (sorted and indented)
            const sortedFiles = groupFiles.sort((a, b) => a.label.localeCompare(b.label));
            sortedFiles.forEach(file => {
                result.push({
                    ...file,
                    label: `  ${file.label}`, // Indent files only
                    description: file.exists ? file.relativePath : `${file.relativePath} (missing)`,
                    children: undefined,
                    contextValue: file.exists 
                        ? (file.fileType === 'file' ? 'resourceFile' : 'resourceDirectory')
                        : 'missingResourceFile'
                });
            });
        }

        return result;
    }

    private formatPatternLabel(pattern: string): string {
        // Remove file:// prefix for display
        let displayPattern = pattern.startsWith('file://') ? pattern.substring(7) : pattern;
        return displayPattern;
    }

    private formatFileSize(bytes: number): string {
        if (bytes === 0) return '0 B';
        
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }

    watchResourceChanges(agentConfig: AgentConfig): vscode.Disposable {
        const cacheKey = this.getCacheKey(agentConfig);
        const watchers: vscode.FileSystemWatcher[] = [];

        // Cleanup existing watchers
        this.disposeWatchers(cacheKey);

        for (const resourcePath of agentConfig.resources || []) {
            try {
                const normalizedPath = this.normalizeResourcePath(resourcePath);
                const pattern = new vscode.RelativePattern(vscode.workspace.workspaceFolders![0], normalizedPath);
                const watcher = vscode.workspace.createFileSystemWatcher(pattern);

                const invalidateHandler = () => {
                    this.invalidateCache(cacheKey);
                    this.logger.debug(`Cache invalidated for: ${cacheKey}`);
                };

                watcher.onDidCreate(invalidateHandler);
                watcher.onDidDelete(invalidateHandler);
                watcher.onDidChange(invalidateHandler);

                watchers.push(watcher);
            } catch (error) {
                this.logger.warn(`Failed to create watcher for resource: ${resourcePath}`, error as Error);
            }
        }

        this.fileWatchers.set(cacheKey, watchers);

        return new vscode.Disposable(() => {
            this.disposeWatchers(cacheKey);
        });
    }

    private setCacheEntry(key: string, data: ResourceFileItem[]): void {
        // Enforce cache size limit
        if (this.resourceCache.size >= this.MAX_CACHE_SIZE) {
            const oldestKey = this.resourceCache.keys().next().value;
            this.resourceCache.delete(oldestKey);
        }

        this.resourceCache.set(key, {
            data,
            timestamp: Date.now(),
            ttl: this.CACHE_TTL
        });
    }

    private cleanupExpiredCache(): void {
        const now = Date.now();
        for (const [key, entry] of this.resourceCache.entries()) {
            if ((now - entry.timestamp) > entry.ttl) {
                this.resourceCache.delete(key);
                this.logger.debug(`Expired cache entry removed: ${key}`);
            }
        }
    }

    private disposeWatchers(cacheKey: string): void {
        const existingWatchers = this.fileWatchers.get(cacheKey);
        if (existingWatchers) {
            existingWatchers.forEach(watcher => watcher.dispose());
            this.fileWatchers.delete(cacheKey);
        }
    }

    private invalidateCache(cacheKey: string): void {
        this.resourceCache.delete(cacheKey);
    }

    private normalizeResourcePath(resourcePath: string): string {
        return resourcePath.startsWith('file://') ? resourcePath.substring(7) : resourcePath;
    }

    private async findFiles(pattern: string): Promise<string[]> {
        try {
            const relativePattern = new vscode.RelativePattern(vscode.workspace.workspaceFolders![0], pattern);
            const uris = await vscode.workspace.findFiles(relativePattern, null, 1000);
            return uris.map(uri => uri.fsPath);
        } catch (error) {
            this.logger.error(`Failed to find files with pattern: ${pattern}`, error as Error);
            return [];
        }
    }

    private async createResourceFileItem(filePath: string, originalPattern: string): Promise<ResourceFileItem | null> {
        try {
            const stat = await vscode.workspace.fs.stat(vscode.Uri.file(filePath));
            const relativePath = vscode.workspace.asRelativePath(filePath);

            return {
                label: path.basename(filePath),
                filePath,
                relativePath,
                originalPattern,
                fileType: stat.type === vscode.FileType.Directory ? 'directory' : 'file',
                size: stat.size,
                lastModified: stat.mtime,
                exists: true,
                iconPath: this.getFileIcon(filePath, stat.type),
                contextValue: stat.type === vscode.FileType.Directory ? 'resourceDirectory' : 'resourceFile'
            };
        } catch (error) {
            return {
                label: path.basename(filePath),
                filePath,
                relativePath: vscode.workspace.asRelativePath(filePath),
                originalPattern,
                fileType: 'file',
                size: 0,
                lastModified: 0,
                exists: false,
                iconPath: new vscode.ThemeIcon('warning'),
                contextValue: 'missingResourceFile'
            };
        }
    }

    private buildHierarchicalStructure(files: ResourceFileItem[]): ResourceFileItem[] {
        const directoryMap = new Map<string, ResourceFileItem>();
        const rootItems: ResourceFileItem[] = [];
        const processedPaths = new Set<string>();

        // First pass: Create directory structure and collect all paths
        for (const file of files) {
            this.ensureDirectoryPath(file.filePath, file.originalPattern, directoryMap, processedPaths);
        }

        // Second pass: Assign files to their parent directories
        for (const file of files) {
            const dirPath = path.dirname(file.filePath);
            
            if (directoryMap.has(dirPath)) {
                const dirItem = directoryMap.get(dirPath)!;
                dirItem.children = dirItem.children || [];
                dirItem.children.push(file);
            } else {
                // File at root level
                rootItems.push(file);
            }
        }

        // Third pass: Build parent-child relationships for directories
        for (const [dirPath, dirItem] of directoryMap) {
            const parentDir = path.dirname(dirPath);
            
            if (directoryMap.has(parentDir) && parentDir !== dirPath) {
                const parentItem = directoryMap.get(parentDir)!;
                parentItem.children = parentItem.children || [];
                parentItem.children.push(dirItem);
            } else {
                // Directory at root level
                rootItems.push(dirItem);
            }
        }

        // Handle empty directories
        this.handleEmptyDirectories(directoryMap);

        return this.sortHierarchicalItems(rootItems);
    }

    private ensureDirectoryPath(
        filePath: string, 
        originalPattern: string, 
        directoryMap: Map<string, ResourceFileItem>,
        processedPaths: Set<string>
    ): void {
        const dirPath = path.dirname(filePath);
        
        if (processedPaths.has(dirPath) || directoryMap.has(dirPath)) {
            return;
        }

        // Recursively ensure parent directories exist
        const parentDir = path.dirname(dirPath);
        if (parentDir !== dirPath) {
            this.ensureDirectoryPath(dirPath, originalPattern, directoryMap, processedPaths);
        }

        // Create directory item
        const dirItem: ResourceFileItem = {
            label: path.basename(dirPath) || dirPath,
            filePath: dirPath,
            relativePath: vscode.workspace.asRelativePath(dirPath),
            originalPattern,
            fileType: 'directory',
            size: 0,
            lastModified: Date.now(),
            exists: true,
            children: [],
            iconPath: new vscode.ThemeIcon('folder'),
            contextValue: 'resourceDirectory'
        };

        directoryMap.set(dirPath, dirItem);
        processedPaths.add(dirPath);
    }

    private handleEmptyDirectories(directoryMap: Map<string, ResourceFileItem>): void {
        for (const [dirPath, dirItem] of directoryMap) {
            if (!dirItem.children || dirItem.children.length === 0) {
                // Create empty directory placeholder
                const emptyItem: ResourceFileItem = {
                    label: '(empty directory)',
                    filePath: path.join(dirPath, '.empty'),
                    relativePath: vscode.workspace.asRelativePath(path.join(dirPath, '.empty')),
                    originalPattern: dirItem.originalPattern,
                    fileType: 'file',
                    size: 0,
                    lastModified: 0,
                    exists: false,
                    iconPath: new vscode.ThemeIcon('info', new vscode.ThemeColor('descriptionForeground')),
                    contextValue: 'emptyDirectory'
                };

                dirItem.children = [emptyItem];
            }
        }
    }

    private sortHierarchicalItems(items: ResourceFileItem[]): ResourceFileItem[] {
        return items.sort((a, b) => {
            // Directories first, then files
            if (a.fileType === 'directory' && b.fileType === 'file') return -1;
            if (a.fileType === 'file' && b.fileType === 'directory') return 1;
            
            // Special handling for empty directory placeholders
            if (a.contextValue === 'emptyDirectory') return 1;
            if (b.contextValue === 'emptyDirectory') return 1;
            
            // Alphabetical order within same type
            return a.label.localeCompare(b.label, undefined, { 
                numeric: true, 
                sensitivity: 'base' 
            });
        }).map(item => {
            if (item.children && item.children.length > 0) {
                item.children = this.sortHierarchicalItems(item.children);
            }
            return item;
        });
    }

    private getFileIcon(filePath: string, fileType: vscode.FileType): vscode.ThemeIcon {
        if (fileType === vscode.FileType.Directory) {
            return new vscode.ThemeIcon('folder');
        }

        const ext = path.extname(filePath).toLowerCase();
        const iconMap: Record<string, string> = {
            '.js': 'symbol-method',
            '.ts': 'symbol-method',
            '.json': 'symbol-property',
            '.md': 'markdown',
            '.txt': 'symbol-text'
        };

        return new vscode.ThemeIcon(iconMap[ext] || 'symbol-file');
    }

    private getCacheKey(agentConfig: AgentConfig): string {
        return `${agentConfig.name}-${JSON.stringify(agentConfig.resources)}`;
    }
}
