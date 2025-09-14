/**
 * @fileoverview Tree Data Provider for Q CLI Agent Management view.
 * 
 * This module implements VS Code's TreeDataProvider interface to display
 * Q CLI agents in the Activity Bar with support for local/global separation,
 * agent creation, and selection events.
 * 
 * @author Agent Manager for Q CLI Extension
 * @since 0.1.0
 */

import * as vscode from 'vscode';
import { 
    AgentItem, 
    AgentLocation,
    LocationSeparatorItem,
    AgentItemWithLocation,
    AgentSelectionEvent,
    AgentSelectionEventEmitter,
    AGENT_CONSTANTS, 
    AGENT_COMMANDS 
} from '../../shared/types/agent';
import { IAgentManagementService } from '../../application/agent/agentManagementService';
import { ExtensionLogger } from '../../application/shared/logger';

/**
 * Tree Data Provider for the Q CLI Agent Management view.
 * 
 * Implements VS Code's TreeDataProvider interface to display agent items
 * in the Activity Bar. Handles agent list display, creation buttons,
 * empty states, and agent selection events with location separation.
 * 
 * @example
 * ```typescript
 * const provider = new AgentTreeProvider(agentService, logger);
 * vscode.window.createTreeView('qcli-agents', { treeDataProvider: provider });
 * ```
 */
export class AgentTreeProvider implements vscode.TreeDataProvider<AgentItem | LocationSeparatorItem | CreateAgentItem | EmptyStateItem>, AgentSelectionEventEmitter {
    private _onDidChangeTreeData: vscode.EventEmitter<AgentItem | LocationSeparatorItem | CreateAgentItem | EmptyStateItem | undefined | null | void> = 
        new vscode.EventEmitter<AgentItem | LocationSeparatorItem | CreateAgentItem | EmptyStateItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<AgentItem | LocationSeparatorItem | CreateAgentItem | EmptyStateItem | undefined | null | void> = 
        this._onDidChangeTreeData.event;

    // Agent selection event emitter
    private _onAgentSelected: vscode.EventEmitter<AgentSelectionEvent> = new vscode.EventEmitter<AgentSelectionEvent>();
    readonly onAgentSelected: vscode.Event<AgentSelectionEvent> = this._onAgentSelected.event;

    private agentItems: AgentItem[] = [];
    private _disposed = false;
    private readonly disposables: vscode.Disposable[] = [];

    constructor(
        public readonly agentManagementService: IAgentManagementService,
        private readonly logger: ExtensionLogger
    ) {
        // Register disposables
        this.disposables.push(this._onDidChangeTreeData);
        this.disposables.push(this._onAgentSelected);
        
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
     * Fire an agent selection event
     */
    fireAgentSelected(event: AgentSelectionEvent): void {
        if (this._disposed) {
            this.logger.debug('AgentTreeProvider disposed, ignoring selection event');
            return;
        }
        
        this.logger.debug(`Firing agent selection event: ${event.agentName} at ${event.location}`);
        this._onAgentSelected.fire(event);
        this.logger.debug(`Agent selection event fired for: ${event.agentName}`);
    }

    /**
     * Handle agent selection and fire selection event
     */
    private handleAgentSelection(agentItem: AgentItem): void {
        if (this._disposed) {
            return;
        }

        // Determine agent location from file path
        const location = agentItem.filePath.includes('.aws/amazonq/cli-agents') 
            ? AgentLocation.Global 
            : AgentLocation.Local;

        const selectionEvent: AgentSelectionEvent = {
            agentName: agentItem.config.name,
            agentPath: agentItem.filePath,
            agentConfig: agentItem.config,
            location: location,
            timestamp: Date.now()
        };

        this.fireAgentSelected(selectionEvent);
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
    getTreeItem(element: AgentItem | LocationSeparatorItem | CreateAgentItem | EmptyStateItem): vscode.TreeItem {
        if (this._disposed) {
            return new vscode.TreeItem('Disposed');
        }
        
        // Handle location separator item
        if (this.isLocationSeparatorItem(element)) {
            return this.createTreeItemForLocationSeparator(element);
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
        
        // Set unique ID to maintain selection state (fallback to label if config.name is undefined)
        const agentId = agentItem.config.name || agentItem.label || 'unknown';
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
        
        // Don't set command for agent items - use selection event instead
        // This prevents conflicts with other commands and allows proper selection handling
        
        // Add tooltip with agent details
        treeItem.tooltip = this.createAgentTooltip(agentItem);
        
        return treeItem;
    }

    /**
     * Get children of a tree item
     */
    getChildren(element?: AgentItem | LocationSeparatorItem | CreateAgentItem | EmptyStateItem): Thenable<(AgentItem | LocationSeparatorItem | CreateAgentItem | EmptyStateItem)[]> {
        if (this._disposed) {
            return Promise.resolve([]);
        }
        
        if (!element) {
            // Return root items (location separators or empty state)
            return Promise.resolve(this.getRootItems());
        } else if (this.isLocationSeparatorItem(element)) {
            // Return children of location separator (agents in that location)
            const separator = element as LocationSeparatorItem;
            return Promise.resolve(separator.children);
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
    private getRootItems(): (LocationSeparatorItem | EmptyStateItem)[] {
        if (this.agentItems.length === 0) {
            return [this.createEmptyStateItem()];
        }
        
        // Group agents by location
        const localAgents: AgentItemWithLocation[] = [];
        const globalAgents: AgentItemWithLocation[] = [];
        
        for (const agent of this.agentItems) {
            const agentWithLocation = agent as AgentItem & { location?: AgentLocation; hasConflict?: boolean };
            const location = agentWithLocation.location || AgentLocation.Local;
            
            // Add conflict warning icon if needed
            if (agentWithLocation.hasConflict) {
                const conflictAgent = {
                    ...agentWithLocation,
                    iconPath: new vscode.ThemeIcon('warning', new vscode.ThemeColor('problemsWarningIcon.foreground')),
                    description: `${agentWithLocation.description || ''} (Conflict)`.trim()
                } as AgentItemWithLocation;
                
                if (location === AgentLocation.Local) {
                    localAgents.push(conflictAgent);
                } else {
                    globalAgents.push(conflictAgent);
                }
            } else {
                if (location === AgentLocation.Local) {
                    localAgents.push(agentWithLocation as AgentItemWithLocation);
                } else {
                    globalAgents.push(agentWithLocation as AgentItemWithLocation);
                }
            }
        }
        
        const items: LocationSeparatorItem[] = [];
        
        // Add Local Agents section
        if (localAgents.length > 0) {
            items.push(this.createLocationSeparator('Local Agents', localAgents));
        }
        
        // Add Global Agents section
        if (globalAgents.length > 0) {
            items.push(this.createLocationSeparator('Global Agents', globalAgents));
        }
        
        // If no agents in either location, show empty state
        if (items.length === 0) {
            return [this.createEmptyStateItem()];
        }
        
        return items;
    }

    /**
     * Create a location separator item
     */
    private createLocationSeparator(label: string, children: AgentItemWithLocation[]): LocationSeparatorItem {
        return {
            label: `${label} (${children.length})`,
            contextValue: 'locationSeparator',
            collapsibleState: vscode.TreeItemCollapsibleState.Expanded,
            children
        };
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
     * Handle agent selection command
     */
    selectAgent(agentItem: AgentItem): void {
        if (this._disposed) {
            this.logger.warn('AgentTreeProvider disposed, ignoring selectAgent call');
            return;
        }

        this.logger.info(`selectAgent method called for: ${agentItem.config.name}`);
        this.handleAgentSelection(agentItem);
        this.logger.info(`handleAgentSelection completed for: ${agentItem.config.name}`);
    }

    /**
     * Type guard to check if item is a location separator item
     */
    private isLocationSeparatorItem(item: AgentItem | LocationSeparatorItem | CreateAgentItem | EmptyStateItem): item is LocationSeparatorItem {
        return item.contextValue === 'locationSeparator';
    }

    /**
     * Type guard to check if item is a create agent item
     */
    private isCreateAgentItem(item: AgentItem | LocationSeparatorItem | CreateAgentItem | EmptyStateItem): item is CreateAgentItem {
        return 'command' in item && item.contextValue === AGENT_CONSTANTS.CONTEXT_VALUES.CREATE_BUTTON;
    }

    /**
     * Type guard to check if item is an empty state item
     */
    private isEmptyStateItem(item: AgentItem | LocationSeparatorItem | CreateAgentItem | EmptyStateItem): item is EmptyStateItem {
        return item.contextValue === AGENT_CONSTANTS.CONTEXT_VALUES.EMPTY_STATE;
    }

    /**
     * Create tree item for location separator
     */
    private createTreeItemForLocationSeparator(element: LocationSeparatorItem): vscode.TreeItem {
        const treeItem = new vscode.TreeItem(element.label, element.collapsibleState);
        
        treeItem.contextValue = element.contextValue;
        treeItem.iconPath = new vscode.ThemeIcon('folder');
        treeItem.tooltip = `${element.children.length} agents in this location`;
        
        return treeItem;
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