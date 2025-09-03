import * as vscode from 'vscode';
import { AgentItemWithLocation, LocationSeparatorItem, ConflictWarningItem, AGENT_CONSTANTS } from '../types/agent';
import { EnhancedAgentManagementService, LocationBasedAgentList } from '../services/EnhancedAgentManagementService';
import { AgentConflictResolver } from '../services/AgentConflictResolver';
import { ILogger } from '../shared/infrastructure/ILogger';

type TreeItem = LocationSeparatorItem | AgentItemWithLocation | ConflictWarningItem | EmptyStateItem;

interface EmptyStateItem {
    label: string;
    description: string;
    contextValue: 'emptyState';
    iconPath: vscode.ThemeIcon;
}

export class EnhancedAgentTreeProvider implements vscode.TreeDataProvider<TreeItem> {
    private _onDidChangeTreeData = new vscode.EventEmitter<TreeItem | undefined | null | void>();
    readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

    private agentData: LocationBasedAgentList | null = null;

    constructor(
        private agentManagementService: EnhancedAgentManagementService,
        private conflictResolver: AgentConflictResolver,
        private logger: ILogger
    ) {
        this.agentManagementService.onAgentListChanged(this.onAgentListChanged.bind(this));
        this.initializeAgentList();
    }

    private async initializeAgentList(): Promise<void> {
        const result = await this.agentManagementService.getAgentsByLocation();
        if (result.success) {
            this.agentData = result.value;
            this._onDidChangeTreeData.fire();
        }
    }

    private onAgentListChanged(data: LocationBasedAgentList): void {
        this.agentData = data;
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: TreeItem): vscode.TreeItem {
        if ('contextValue' in element && element.contextValue === 'locationSeparator') {
            return this.createLocationSeparatorTreeItem(element as LocationSeparatorItem);
        }
        
        if ('contextValue' in element && element.contextValue === 'conflictWarning') {
            return this.createConflictWarningTreeItem(element as ConflictWarningItem);
        }
        
        if ('contextValue' in element && element.contextValue === 'emptyState') {
            return this.createEmptyStateTreeItem(element as EmptyStateItem);
        }

        return this.createAgentTreeItem(element as AgentItemWithLocation);
    }

    getChildren(element?: TreeItem): Thenable<TreeItem[]> {
        if (!element) {
            return Promise.resolve(this.getRootItems());
        }

        if ('contextValue' in element && element.contextValue === 'locationSeparator') {
            return Promise.resolve(this.getLocationChildren(element as LocationSeparatorItem));
        }

        return Promise.resolve([]);
    }

    private getRootItems(): TreeItem[] {
        if (!this.agentData) {
            return [this.createGlobalEmptyState()];
        }

        const items: TreeItem[] = [];

        // Local Agents Section
        const localSection: LocationSeparatorItem = {
            label: `Local Agents (${this.agentData.local.length})`,
            contextValue: 'locationSeparator',
            collapsibleState: vscode.TreeItemCollapsibleState.Expanded,
            children: this.agentData.local
        };
        items.push(localSection);

        // Global Agents Section
        const globalSection: LocationSeparatorItem = {
            label: `Global Agents (${this.agentData.global.length})`,
            contextValue: 'locationSeparator',
            collapsibleState: vscode.TreeItemCollapsibleState.Expanded,
            children: this.agentData.global
        };
        items.push(globalSection);

        // Conflict Warnings (if any)
        if (this.agentData.conflicts.length > 0) {
            const conflictWarning: ConflictWarningItem = {
                label: `⚠️ ${this.agentData.conflicts.length} Name Conflicts`,
                description: 'Local agents take precedence',
                iconPath: AGENT_CONSTANTS.CONFLICT_ICON,
                contextValue: 'conflictWarning',
                tooltip: this.generateConflictTooltip()
            };
            items.push(conflictWarning);
        }

        return items;
    }

    private getLocationChildren(separator: LocationSeparatorItem): TreeItem[] {
        if (separator.children.length === 0) {
            const isLocal = separator.label.includes('Local');
            return [this.createLocationEmptyState(isLocal)];
        }

        return separator.children;
    }

    private createLocationSeparatorTreeItem(item: LocationSeparatorItem): vscode.TreeItem {
        const treeItem = new vscode.TreeItem(item.label, item.collapsibleState);
        treeItem.contextValue = item.contextValue;
        treeItem.iconPath = new vscode.ThemeIcon('folder');
        return treeItem;
    }

    private createAgentTreeItem(agent: AgentItemWithLocation): vscode.TreeItem {
        const treeItem = new vscode.TreeItem(agent.label, vscode.TreeItemCollapsibleState.None);
        
        treeItem.description = agent.description;
        treeItem.contextValue = 'agentItem';
        treeItem.tooltip = this.conflictResolver.generateConflictTooltip(agent);
        
        // Set icon based on location and conflict status
        if (agent.hasConflict) {
            treeItem.iconPath = new vscode.ThemeIcon('warning', new vscode.ThemeColor('problemsWarningIcon.foreground'));
        } else {
            treeItem.iconPath = agent.iconPath || AGENT_CONSTANTS.DEFAULT_ICON;
        }

        // Add inline actions
        treeItem.command = {
            command: 'qcli-agents.runAgent',
            title: 'Run Agent',
            arguments: [agent.label]
        };

        return treeItem;
    }

    private createConflictWarningTreeItem(item: ConflictWarningItem): vscode.TreeItem {
        const treeItem = new vscode.TreeItem(item.label, vscode.TreeItemCollapsibleState.None);
        treeItem.description = item.description;
        treeItem.contextValue = item.contextValue;
        treeItem.iconPath = item.iconPath;
        treeItem.tooltip = item.tooltip;
        return treeItem;
    }

    private createEmptyStateTreeItem(item: EmptyStateItem): vscode.TreeItem {
        const treeItem = new vscode.TreeItem(item.label, vscode.TreeItemCollapsibleState.None);
        treeItem.description = item.description;
        treeItem.contextValue = item.contextValue;
        treeItem.iconPath = item.iconPath;
        return treeItem;
    }

    private createLocationEmptyState(isLocal: boolean): EmptyStateItem {
        return {
            label: isLocal ? 'No local agents' : 'No global agents',
            description: isLocal ? 'Create agents in this workspace' : 'Create agents for all workspaces',
            contextValue: 'emptyState',
            iconPath: new vscode.ThemeIcon('info')
        };
    }

    private createGlobalEmptyState(): EmptyStateItem {
        return {
            label: 'No agents found',
            description: 'Click + to create your first agent',
            contextValue: 'emptyState',
            iconPath: new vscode.ThemeIcon('info')
        };
    }

    private generateConflictTooltip(): string {
        if (!this.agentData || this.agentData.conflicts.length === 0) {
            return '';
        }

        const conflictNames = this.agentData.conflicts.map(c => 
            `• Agent names with conflicts (local takes precedence)`
        ).join('\n');

        return `Name Conflicts Detected:\n${conflictNames}`;
    }

    refresh(): void {
        this.agentManagementService.refreshAgentList();
    }

    dispose(): void {
        this._onDidChangeTreeData.dispose();
    }
}
