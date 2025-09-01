import * as vscode from 'vscode';
import { RefactoredAgentManagementService, AgentItem } from '../services/RefactoredAgentManagementService';
import { ILogger } from '../shared/infrastructure/ILogger';
import { PerformanceMonitor } from '../infrastructure/PerformanceMonitor';

export class RefactoredAgentTreeProvider implements vscode.TreeDataProvider<AgentTreeItem> {
    private _onDidChangeTreeData = new vscode.EventEmitter<AgentTreeItem | undefined | null | void>();
    readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

    private agentItems: AgentItem[] = [];
    private disposed = false;
    private readonly disposables: vscode.Disposable[] = [];

    constructor(
        private agentManagementService: RefactoredAgentManagementService,
        private logger: ILogger,
        private performanceMonitor: PerformanceMonitor
    ) {
        this.disposables.push(this._onDidChangeTreeData);
        
        // Listen to agent list changes
        this.disposables.push(
            this.agentManagementService.onAgentListChanged(this.onAgentListChanged.bind(this))
        );
        
        this.initializeAgentList();
    }

    getTreeItem(element: AgentTreeItem): vscode.TreeItem {
        return element;
    }

    async getChildren(element?: AgentTreeItem): Promise<AgentTreeItem[]> {
        if (element) {
            return []; // No children for agent items
        }

        return this.performanceMonitor.measureAsync('getAgentTreeChildren', async () => {
            if (this.agentItems.length === 0) {
                return [this.createEmptyStateItem()];
            }

            const items = this.agentItems.map(agent => this.createAgentTreeItem(agent));
            items.unshift(this.createNewAgentItem());
            
            return items;
        });
    }

    async refresh(): Promise<void> {
        if (this.disposed) {return;}
        
        this.logger.debug('Refreshing agent tree');
        await this.agentManagementService.refreshAgentList();
    }

    private async initializeAgentList(): Promise<void> {
        try {
            const result = await this.agentManagementService.getAgentList();
            if (result.success) {
                this.updateAgentItems(result.data);
            } else {
                this.logger.error('Failed to initialize agent list', result.error);
            }
        } catch (error) {
            this.logger.error('Error initializing agent list', error as Error);
        }
    }

    private onAgentListChanged(agents: AgentItem[]): void {
        this.updateAgentItems(agents);
    }

    private updateAgentItems(agents: AgentItem[]): void {
        if (this.disposed) {return;}
        
        this.agentItems = agents;
        this._onDidChangeTreeData.fire();
        
        this.logger.debug('Agent tree updated', { count: agents.length });
    }

    private createNewAgentItem(): AgentTreeItem {
        return new AgentTreeItem(
            'Create New Agent',
            'Click to create a new agent',
            vscode.TreeItemCollapsibleState.None,
            {
                command: 'qcli-agents.createAgent',
                title: 'Create New Agent'
            },
            new vscode.ThemeIcon('add'),
            'createAgent'
        );
    }

    private createEmptyStateItem(): AgentTreeItem {
        return new AgentTreeItem(
            'No agents found',
            'Click "Create New Agent" to get started',
            vscode.TreeItemCollapsibleState.None,
            undefined,
            new vscode.ThemeIcon('info'),
            'emptyState'
        );
    }

    private createAgentTreeItem(agent: AgentItem): AgentTreeItem {
        const item = new AgentTreeItem(
            agent.label,
            agent.description,
            vscode.TreeItemCollapsibleState.None,
            {
                command: 'qcli-agents.openAgent',
                title: 'Open Agent Configuration',
                arguments: [agent]
            },
            new vscode.ThemeIcon('file-code'),
            'agent'
        );
        
        item.agentItem = agent;
        return item;
    }

    dispose(): void {
        if (this.disposed) {return;}
        
        this.disposed = true;
        
        for (const disposable of this.disposables) {
            disposable.dispose();
        }
        this.disposables.length = 0;
        
        this.logger.debug('AgentTreeProvider disposed');
    }
}

export class AgentTreeItem extends vscode.TreeItem {
    public override readonly label: string;
    
    constructor(
        label: string,
        tooltip: string,
        collapsibleState: vscode.TreeItemCollapsibleState,
        command?: vscode.Command,
        iconPath?: vscode.ThemeIcon,
        contextValue?: string
    ) {
        super(label, collapsibleState);
        this.label = label;
        this.tooltip = tooltip;
        if (command) {this.command = command;}
        if (iconPath) {this.iconPath = iconPath;}
        if (contextValue) {this.contextValue = contextValue;}
    }

    agentItem?: AgentItem;
}
