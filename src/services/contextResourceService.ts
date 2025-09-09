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
 * Context Resource Service implementation
 */
export class ContextResourceService implements IContextResourceService {
    private logger: ExtensionLogger;
    private resourceCache = new Map<string, ResourceFileItem[]>();
    private fileWatchers = new Map<string, vscode.FileSystemWatcher[]>();

    constructor(logger: ExtensionLogger) {
        this.logger = logger;
    }

    async getResourceFiles(agentConfig: AgentConfig): Promise<ResourceFileItem[]> {
        const cacheKey = this.getCacheKey(agentConfig);
        
        if (this.resourceCache.has(cacheKey)) {
            return this.resourceCache.get(cacheKey)!;
        }

        const resourceFiles: ResourceFileItem[] = [];
        
        if (!agentConfig.resources || agentConfig.resources.length === 0) {
            return resourceFiles;
        }

        for (const resourcePath of agentConfig.resources) {
            try {
                const normalizedPath = this.normalizeResourcePath(resourcePath);
                const matchedFiles = await this.findFiles(normalizedPath);
                
                for (const filePath of matchedFiles) {
                    const fileItem = await this.createResourceFileItem(filePath, resourcePath);
                    if (fileItem) {
                        resourceFiles.push(fileItem);
                    }
                }
            } catch (error) {
                this.logger.warn(`Failed to process resource path: ${resourcePath}`, error as Error);
            }
        }

        const hierarchicalFiles = this.buildHierarchicalStructure(resourceFiles);
        this.resourceCache.set(cacheKey, hierarchicalFiles);
        
        return hierarchicalFiles;
    }

    watchResourceChanges(agentConfig: AgentConfig): vscode.Disposable {
        const cacheKey = this.getCacheKey(agentConfig);
        const watchers: vscode.FileSystemWatcher[] = [];

        if (this.fileWatchers.has(cacheKey)) {
            this.fileWatchers.get(cacheKey)!.forEach(watcher => watcher.dispose());
        }

        for (const resourcePath of agentConfig.resources || []) {
            try {
                const normalizedPath = this.normalizeResourcePath(resourcePath);
                const pattern = new vscode.RelativePattern(vscode.workspace.workspaceFolders![0], normalizedPath);
                const watcher = vscode.workspace.createFileSystemWatcher(pattern);

                watcher.onDidCreate(() => this.invalidateCache(cacheKey));
                watcher.onDidDelete(() => this.invalidateCache(cacheKey));
                watcher.onDidChange(() => this.invalidateCache(cacheKey));

                watchers.push(watcher);
            } catch (error) {
                this.logger.warn(`Failed to create watcher for resource: ${resourcePath}`, error as Error);
            }
        }

        this.fileWatchers.set(cacheKey, watchers);

        return new vscode.Disposable(() => {
            watchers.forEach(watcher => watcher.dispose());
            this.fileWatchers.delete(cacheKey);
        });
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

        for (const file of files) {
            const dirPath = path.dirname(file.filePath);

            if (!directoryMap.has(dirPath)) {
                const dirItem: ResourceFileItem = {
                    label: path.basename(dirPath) || dirPath,
                    filePath: dirPath,
                    relativePath: vscode.workspace.asRelativePath(dirPath),
                    originalPattern: file.originalPattern,
                    fileType: 'directory',
                    size: 0,
                    lastModified: 0,
                    exists: true,
                    children: [],
                    iconPath: new vscode.ThemeIcon('folder'),
                    contextValue: 'resourceDirectory'
                };
                directoryMap.set(dirPath, dirItem);
            }

            const dirItem = directoryMap.get(dirPath)!;
            dirItem.children = dirItem.children || [];
            dirItem.children.push(file);
        }

        for (const [dirPath, dirItem] of directoryMap) {
            const parentDir = path.dirname(dirPath);
            if (!directoryMap.has(parentDir) || parentDir === dirPath) {
                rootItems.push(dirItem);
            } else {
                const parentItem = directoryMap.get(parentDir)!;
                parentItem.children = parentItem.children || [];
                parentItem.children.push(dirItem);
            }
        }

        return this.sortHierarchicalItems(rootItems);
    }

    private sortHierarchicalItems(items: ResourceFileItem[]): ResourceFileItem[] {
        return items.sort((a, b) => {
            if (a.fileType === 'directory' && b.fileType === 'file') return -1;
            if (a.fileType === 'file' && b.fileType === 'directory') return 1;
            return a.label.localeCompare(b.label);
        }).map(item => {
            if (item.children) {
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

    private invalidateCache(cacheKey: string): void {
        this.resourceCache.delete(cacheKey);
    }

    private getCacheKey(agentConfig: AgentConfig): string {
        return `${agentConfig.name}-${JSON.stringify(agentConfig.resources)}`;
    }
}
