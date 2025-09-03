import * as vscode from 'vscode';
import { 
    AgentItem, 
    AGENT_CONSTANTS, 
    AGENT_COMMANDS 
} from '../types/agent';
import { IAgentManagementService } from '../services/agentManagementService';
import { ExtensionLogger } from '../services/logger';

/**
 * Tree Data Provider for the Q CLI Agent Management view
 * Implements VS Code's TreeDataProvider interface to display agent items
 * Handles agent list display, creation button, and empty states
 */
export class AgentTreeProvider implements vscode.TreeDataProvider<AgentItem | CreateAgentItem | EmptyStateItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<AgentItem | CreateAgentItem | EmptyStateItem | undefined | null | void> = 
        new vscode.EventEmitter<AgentItem | CreateAgentItem | EmptyStateItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<AgentItem | CreateAgentItem | EmptyStateItem | undefined | null | void> = 
        this._onDidChangeTreeData.event;

    private agentItems: AgentItem[] = [];
    private _disposed = false;
    private readonly disposables: vscode.Disposable[] = [];

    constructor(
        public readonly agentManagementService: IAgentManagementService,
        private readonly logger: ExtensionLogger
    ) {
        // Register disposables
        this.disposables.push(this._onDidChangeTreeData);
        
        // Listen to agent list changes
        this.disposables.push(
            this.agentManagementService.onAgentListChanged(this.onAgentListChanged.bind(this))
        );
        
        this.logger.debug('AgentTreeProvider initialized');
        
        // Initialize with current agent list
        this.initializeAgentList();
    }

    /**
     * Initialize the agent list on startup
     */
    private async initializeAgentList(): Promise<void> {
        try {
            const agents = await this.agentManagementService.getAgentList();
            this.updateAgentItems(agents);
        } catch (error) {
            this.logger.error('Failed to initialize agent list', error as Error);
            // Show empty state on error
            this.agentItems = [];
            this.refresh();
        }
    }

    /**
     * Handle agent list changes from the management service
     */
    private onAgentListChanged(agents: AgentItem[]): void {
        this.logger.debug(`Agent list changed: ${agents.length} agents`);
        this.updateAgentItems(agents);
    }

    /**
     * Dispose of resources to prevent memory leaks
     */
    dispose(): void {
        if (this._disposed) {
            return;
        }
        
        this._disposed = true;
        
        // Dispose all disposables
        this.disposables.forEach(disposable => {
            try {
                disposable.dispose();
            } catch (error) {
                this.logger.error('Error disposing AgentTreeProvider resource', error as Error);
            }
        });
        
        this.disposables.length = 0;
        this.agentItems = [];
        
        this.logger.debug('AgentTreeProvider disposed');
    }

    /**
     * Refresh the tree view
     */
    refresh(): void {
        if (this._disposed) {
            return;
        }
        
        this.logger.debug('Agent tree view refreshed');
        this._onDidChangeTreeData.fire();
    }

    /**
     * Get tree item representation for display
     */
    getTreeItem(element: AgentItem | CreateAgentItem | EmptyStateItem): vscode.TreeItem {
        if (this._disposed) {
            return new vscode.TreeItem('Disposed');
        }
        
        // Handle create agent button
        if (this.isCreateAgentItem(element)) {
            return this.createTreeItemForCreateButton(element);
        }
        
        // Handle empty state item
        if (this.isEmptyStateItem(element)) {
            return this.createTreeItemForEmptyState(element);
        }
        
        // Handle regular agent item
        const agentItem = element as AgentItem;
        const treeItem = new vscode.TreeItem(agentItem.label);
        
        // Set unique ID to maintain selection state (fallback to label if name is undefined)
        const agentId = agentItem.name || agentItem.label || 'unknown';
        treeItem.id = `agent-${agentId}`;
        
        // Set resource URI to help VS Code track the item
        if (agentItem.filePath) {
            treeItem.resourceUri = vscode.Uri.file(agentItem.filePath);
        }
        
        // Set properties
        if (agentItem.description !== undefined) {
            treeItem.description = agentItem.description;
        }
        
        if (agentItem.iconPath !== undefined) {
            treeItem.iconPath = agentItem.iconPath;
        }
        
        if (agentItem.contextValue !== undefined) {
            treeItem.contextValue = agentItem.contextValue;
        }
        
        // Set collapsible state
        treeItem.collapsibleState = agentItem.collapsibleState || vscode.TreeItemCollapsibleState.None;
        
        // Set command for clicking on the agent item
        if (agentItem.command) {
            treeItem.command = agentItem.command;
        } else {
            // Set default command to open the agent file
            treeItem.command = {
                command: AGENT_COMMANDS.OPEN_AGENT,
                title: 'Open Agent Configuration',
                arguments: [agentItem]
            };
        }
        
        // Add tooltip with agent details
        treeItem.tooltip = this.createAgentTooltip(agentItem);
        
        return treeItem;
    }

    /**
     * Get children of a tree item
     */
    getChildren(element?: AgentItem | CreateAgentItem | EmptyStateItem): Thenable<(AgentItem | CreateAgentItem | EmptyStateItem)[]> {
        if (this._disposed) {
            return Promise.resolve([]);
        }
        
        if (!element) {
            // Return root items
            return Promise.resolve(this.getRootItems());
        } else if (!this.isCreateAgentItem(element) && !this.isEmptyStateItem(element)) {
            // Return children of agent item
            const agentItem = element as AgentItem;
            return Promise.resolve(agentItem.children || []);
        }
        
        // Create agent item and empty state item have no children
        return Promise.resolve([]);
    }

    /**
     * Get root items to display in the tree
     */
    private getRootItems(): (AgentItem | CreateAgentItem | EmptyStateItem)[] {
        const items: (AgentItem | CreateAgentItem | EmptyStateItem)[] = [];
        
        // Add agent items
        if (this.agentItems.length > 0) {
            items.push(...this.agentItems);
        } else {
            // Add empty state item
            items.push(this.createEmptyStateItem());
        }
        
        return items;
    }

    /**
     * Update the agent items displayed in the tree
     */
    updateAgentItems(items: AgentItem[]): void {
        if (this._disposed) {
            return;
        }
        
        this.logger.debug(`Updating agent tree with ${items.length} items`);
        
        // Clear existing items
        this.agentItems = [];
        
        // Add new items
        if (items.length > 0) {
            this.agentItems.push(...items);
        }
        
        this.refresh();
    }

    /**
     * Add a single agent item to the tree
     */
    addAgentItem(item: AgentItem): void {
        if (this._disposed) {
            return;
        }
        
        this.logger.debug(`Adding agent item: ${item.label}`);
        
        // Check if item already exists
        const existingIndex = this.agentItems.findIndex(existing => existing.label === item.label);
        if (existingIndex >= 0) {
            // Replace existing item
            this.agentItems[existingIndex] = item;
        } else {
            // Add new item
            this.agentItems.push(item);
            // Sort items by label
            this.agentItems.sort((a, b) => a.label.localeCompare(b.label));
        }
        
        this.refresh();
    }

    /**
     * Remove an agent item from the tree
     */
    removeAgentItem(item: AgentItem): void {
        if (this._disposed) {
            return;
        }
        
        this.logger.debug(`Removing agent item: ${item.label}`);
        
        // Remove item
        const index = this.agentItems.findIndex(existing => existing.label === item.label);
        if (index >= 0) {
            this.agentItems.splice(index, 1);
            this.refresh();
        }
    }

    /**
     * Get current agent items (excluding UI items)
     */
    getAgentItems(): AgentItem[] {
        return [...this.agentItems];
    }

    /**
     * Create the "Create New Agent" button item
     */
    private createCreateAgentItem(): CreateAgentItem {
        return {
            label: 'Create New Agent',
            description: 'Add a new Q CLI agent',
            iconPath: AGENT_CONSTANTS.CREATE_ICON,
            contextValue: AGENT_CONSTANTS.CONTEXT_VALUES.CREATE_BUTTON,
            command: {
                command: AGENT_COMMANDS.CREATE_AGENT,
                title: 'Create New Agent'
            }
        };
    }

    /**
     * Create empty state item when no agents exist
     */
    private createEmptyStateItem(): EmptyStateItem {
        return {
            label: 'No agents found',
            description: 'Use the + button above to create a new agent',
            iconPath: new vscode.ThemeIcon('info'),
            contextValue: AGENT_CONSTANTS.CONTEXT_VALUES.EMPTY_STATE
        };
    }

    /**
     * Create tree item for the create button
     */
    private createTreeItemForCreateButton(element: CreateAgentItem): vscode.TreeItem {
        const treeItem = new vscode.TreeItem(element.label);
        
        treeItem.description = element.description;
        treeItem.iconPath = element.iconPath;
        treeItem.contextValue = element.contextValue;
        treeItem.collapsibleState = vscode.TreeItemCollapsibleState.None;
        treeItem.command = element.command;
        
        // Make it stand out visually
        treeItem.tooltip = 'Click to create a new Q CLI agent';
        
        return treeItem;
    }

    /**
     * Create tooltip for agent item
     */
    private createAgentTooltip(agentItem: AgentItem): vscode.MarkdownString {
        const tooltip = new vscode.MarkdownString();
        
        tooltip.appendMarkdown(`**${agentItem.config.name}**\n\n`);
        
        if (agentItem.config.description) {
            tooltip.appendMarkdown(`*${agentItem.config.description}*\n\n`);
        }
        
        tooltip.appendMarkdown(`**Tools:** ${agentItem.config.tools.length} available\n\n`);
        tooltip.appendMarkdown(`**Resources:** ${agentItem.config.resources.length} configured\n\n`);
        tooltip.appendMarkdown(`**File:** \`${agentItem.filePath}\``);
        
        tooltip.isTrusted = true;
        return tooltip;
    }

    /**
     * Type guard to check if item is a create agent item
     */
    private isCreateAgentItem(item: AgentItem | CreateAgentItem | EmptyStateItem): item is CreateAgentItem {
        return 'command' in item && item.contextValue === AGENT_CONSTANTS.CONTEXT_VALUES.CREATE_BUTTON;
    }

    /**
     * Type guard to check if item is an empty state item
     */
    private isEmptyStateItem(item: AgentItem | CreateAgentItem | EmptyStateItem): item is EmptyStateItem {
        return item.contextValue === AGENT_CONSTANTS.CONTEXT_VALUES.EMPTY_STATE;
    }

    /**
     * Create tree item for empty state
     */
    private createTreeItemForEmptyState(element: EmptyStateItem): vscode.TreeItem {
        const treeItem = new vscode.TreeItem(element.label);
        
        treeItem.description = element.description;
        treeItem.iconPath = element.iconPath;
        treeItem.contextValue = element.contextValue;
        treeItem.collapsibleState = vscode.TreeItemCollapsibleState.None;
        
        treeItem.tooltip = 'No Q CLI agents found. Create your first agent to get started.';
        
        return treeItem;
    }

    /**
     * Force refresh from the management service
     */
    async forceRefresh(): Promise<void> {
        if (this._disposed) {
            return;
        }
        
        try {
            this.logger.debug('Force refreshing agent tree');
            await this.agentManagementService.refreshAgentList();
        } catch (error) {
            this.logger.error('Failed to force refresh agent tree', error as Error);
            // Show error state
            this.agentItems = [];
            this.refresh();
        }
    }
}

/**
 * Interface for the "Create New Agent" button item
 */
interface CreateAgentItem {
    label: string;
    description: string;
    iconPath: vscode.ThemeIcon;
    contextValue: string;
    command: vscode.Command;
}

/**
 * Interface for empty state item
 */
interface EmptyStateItem {
    label: string;
    description: string;
    iconPath: vscode.ThemeIcon;
    contextValue: string;
}