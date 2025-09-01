import * as vscode from 'vscode';
import { IContextRepository } from '../core/context/IContextRepository';
import { ContextDomainService } from '../core/context/ContextDomainService';
import { ContextItem, ContextType } from '../core/context/ContextItem';
import { ILogger } from '../shared/infrastructure/ILogger';
import { PerformanceMonitor } from '../infrastructure/PerformanceMonitor';

export class RefactoredContextTreeProvider implements vscode.TreeDataProvider<ContextTreeItem> {
    private _onDidChangeTreeData = new vscode.EventEmitter<ContextTreeItem | undefined | null | void>();
    readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

    private contextItems: ContextItem[] = [];
    private currentAgent: string | undefined;
    private disposed = false;
    private readonly disposables: vscode.Disposable[] = [];

    constructor(
        private contextRepository: IContextRepository,
        private contextDomainService: ContextDomainService,
        private logger: ILogger,
        private performanceMonitor: PerformanceMonitor
    ) {
        this.disposables.push(this._onDidChangeTreeData);
    }

    getTreeItem(element: ContextTreeItem): vscode.TreeItem {
        return element;
    }

    async getChildren(element?: ContextTreeItem): Promise<ContextTreeItem[]> {
        if (element) {
            return []; // No children for context items
        }

        return this.performanceMonitor.measureAsync('getContextTreeChildren', async () => {
            if (!this.currentAgent) {
                return [this.createNoAgentItem()];
            }

            if (this.contextItems.length === 0) {
                return [this.createEmptyStateItem()];
            }

            return this.contextItems.map(item => this.createContextTreeItem(item));
        });
    }

    async setCurrentAgent(agentName: string): Promise<void> {
        if (this.disposed) {return;}
        
        this.currentAgent = agentName;
        await this.loadContextItems();
    }

    async addContextItem(path: string, type: ContextType): Promise<void> {
        if (!this.currentAgent) {return;}
        
        const result = await this.contextDomainService.addContextItem(this.currentAgent, path, type);
        if (result.success) {
            await this.loadContextItems();
            this.logger.info('Context item added', { agent: this.currentAgent, path });
        } else {
            this.logger.error('Failed to add context item', result.error, { agent: this.currentAgent, path });
        }
    }

    async removeContextItem(path: string): Promise<void> {
        if (!this.currentAgent) {return;}
        
        const result = await this.contextDomainService.removeContextItem(this.currentAgent, path);
        if (result.success) {
            await this.loadContextItems();
            this.logger.info('Context item removed', { agent: this.currentAgent, path });
        } else {
            this.logger.error('Failed to remove context item', result.error, { agent: this.currentAgent, path });
        }
    }

    async refresh(): Promise<void> {
        if (this.disposed) {return;}
        
        this.logger.debug('Refreshing context tree');
        await this.loadContextItems();
    }

    private async loadContextItems(): Promise<void> {
        if (!this.currentAgent) {
            this.contextItems = [];
            this._onDidChangeTreeData.fire();
            return;
        }

        try {
            const result = await this.contextRepository.getContextItems(this.currentAgent);
            if (result.success) {
                this.contextItems = result.data;
                this._onDidChangeTreeData.fire();
                this.logger.debug('Context items loaded', { agent: this.currentAgent, count: result.data.length });
            } else {
                this.logger.error('Failed to load context items', result.error, { agent: this.currentAgent });
            }
        } catch (error) {
            this.logger.error('Error loading context items', error as Error, { agent: this.currentAgent });
        }
    }

    private createNoAgentItem(): ContextTreeItem {
        return new ContextTreeItem(
            'No agent selected',
            'Select an agent to view its context',
            vscode.TreeItemCollapsibleState.None,
            undefined,
            new vscode.ThemeIcon('info'),
            'noAgent'
        );
    }

    private createEmptyStateItem(): ContextTreeItem {
        return new ContextTreeItem(
            'No context items',
            'Add files or directories to this agent\'s context',
            vscode.TreeItemCollapsibleState.None,
            undefined,
            new vscode.ThemeIcon('info'),
            'emptyState'
        );
    }

    private createContextTreeItem(contextItem: ContextItem): ContextTreeItem {
        const icon = this.getIconForContextType(contextItem.type);
        const tooltip = this.getTooltipForContextItem(contextItem);
        
        return new ContextTreeItem(
            contextItem.path,
            tooltip,
            vscode.TreeItemCollapsibleState.None,
            {
                command: 'qcli-context.openContextItem',
                title: 'Open Context Item',
                arguments: [contextItem]
            },
            icon,
            'contextItem',
            contextItem
        );
    }

    private getIconForContextType(type: ContextType): vscode.ThemeIcon {
        switch (type) {
            case ContextType.FILE:
                return new vscode.ThemeIcon('file');
            case ContextType.DIRECTORY:
                return new vscode.ThemeIcon('folder');
            case ContextType.GLOB_PATTERN:
                return new vscode.ThemeIcon('search');
            default:
                return new vscode.ThemeIcon('question');
        }
    }

    private getTooltipForContextItem(contextItem: ContextItem): string {
        let tooltip = `${contextItem.type}: ${contextItem.path}`;
        
        if (contextItem.metadata?.description) {
            tooltip += `\n${contextItem.metadata.description}`;
        }
        
        if (contextItem.metadata?.size) {
            tooltip += `\nSize: ${contextItem.metadata.size} bytes`;
        }
        
        return tooltip;
    }

    dispose(): void {
        if (this.disposed) {return;}
        
        this.disposed = true;
        
        for (const disposable of this.disposables) {
            disposable.dispose();
        }
        this.disposables.length = 0;
        
        this.logger.debug('ContextTreeProvider disposed');
    }
}

export class ContextTreeItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly tooltip: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly command?: vscode.Command,
        public readonly iconPath?: vscode.ThemeIcon,
        public readonly contextValue?: string,
        public readonly contextItem?: ContextItem
    ) {
        super(label, collapsibleState);
        this.tooltip = tooltip;
        this.command = command;
        this.iconPath = iconPath;
        this.contextValue = contextValue;
    }
}
