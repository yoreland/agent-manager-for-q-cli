import * as vscode from 'vscode';
import { ContextItem, ResourceFileItem, ContextResourceState } from '../../shared/types/context';
import { AgentSelectionEvent, AgentTreeProvider, AgentLocation } from '../../shared/types/agent';
import { IContextResourceService } from '../../application/context/contextResourceService';
import { ExtensionLogger } from '../../application/shared/logger';

/**
 * Tree Data Provider for the Q CLI Context Resources view
 * Displays resource files from selected agent with hierarchical structure
 */
export class ContextTreeProvider implements vscode.TreeDataProvider<ContextItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<ContextItem | undefined | null | void> = 
        new vscode.EventEmitter<ContextItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<ContextItem | undefined | null | void> = 
        this._onDidChangeTreeData.event;

    private state: ContextResourceState = {
        selectedAgent: null,
        resourceFiles: [],
        isLoading: false,
        error: null,
        searchFilter: ''
    };

    private agentSelectionSubscription: vscode.Disposable | null = null;
    private resourceWatcher: vscode.Disposable | null = null;
    private _disposed = false;

    constructor(
        private contextResourceService: IContextResourceService,
        private logger: ExtensionLogger,
        agentTreeProvider?: AgentTreeProvider
    ) {
        if (agentTreeProvider) {
            this.subscribeToAgentSelection(agentTreeProvider);
        }
    }

    private subscribeToAgentSelection(agentTreeProvider: AgentTreeProvider): void {
        this.logger.debug('Subscribing to agent selection events');
        this.agentSelectionSubscription = agentTreeProvider.onAgentSelected(
            this.handleAgentSelection.bind(this)
        );
        this.logger.debug('Agent selection subscription created');
    }

    private async handleAgentSelection(event: AgentSelectionEvent): Promise<void> {
        this.logger.debug(`Context view handling agent selection: ${event.agentName}`);

        // Cleanup previous watcher
        if (this.resourceWatcher) {
            this.resourceWatcher.dispose();
            this.resourceWatcher = null;
        }

        // Update state
        this.state.selectedAgent = event.agentConfig;
        this.state.isLoading = true;
        this.state.error = null;
        this.refresh();

        try {
            // Validate workspace
            if (!vscode.workspace.workspaceFolders || vscode.workspace.workspaceFolders.length === 0) {
                throw new Error('No workspace folder is open. Please open a folder to view resource files.');
            }

            // Load resource files with timeout
            const timeoutPromise = new Promise<never>((_, reject) => {
                setTimeout(() => reject(new Error('Resource loading timed out after 10 seconds')), 10000);
            });

            const resourceFiles = await Promise.race([
                this.contextResourceService.getResourceFiles(event.agentConfig),
                timeoutPromise
            ]);
            
            this.state.resourceFiles = resourceFiles;
            this.state.isLoading = false;

            // Start watching for changes
            try {
                this.resourceWatcher = this.contextResourceService.watchResourceChanges(event.agentConfig);
            } catch (watchError) {
                this.logger.warn('Failed to setup file watchers, auto-refresh disabled', watchError as Error);
                // Continue without watchers - not critical
            }

            this.refresh();

            // Show helpful message if no resources found
            if (resourceFiles.length === 0 && event.agentConfig.resources && event.agentConfig.resources.length > 0) {
                vscode.window.showInformationMessage(
                    `No files found matching the resource patterns for agent "${event.agentName}". Check if the patterns are correct and files exist.`,
                    'View Agent Config'
                ).then(choice => {
                    if (choice === 'View Agent Config') {
                        vscode.commands.executeCommand('qcli-agents.openAgent', { filePath: event.agentPath });
                    }
                });
            }

        } catch (error) {
            this.logger.error('Failed to load resource files', error as Error);
            this.state.isLoading = false;
            
            // Categorize and handle different error types
            const errorMessage = this.categorizeError(error as Error);
            this.state.error = errorMessage;
            this.refresh();

            // Show user-friendly error message with recovery options
            this.showErrorWithRecovery(error as Error, event.agentName);
        }
    }

    private categorizeError(error: Error): string {
        const message = error.message.toLowerCase();
        
        if (message.includes('no workspace')) {
            return 'No workspace folder open';
        } else if (message.includes('permission') || message.includes('eacces')) {
            return 'Permission denied accessing files';
        } else if (message.includes('not found') || message.includes('enoent')) {
            return 'Resource files not found';
        } else if (message.includes('timeout')) {
            return 'Resource loading timed out';
        } else if (message.includes('network') || message.includes('fetch')) {
            return 'Network error loading resources';
        } else {
            return `Error: ${error.message}`;
        }
    }

    private async showErrorWithRecovery(error: Error, agentName: string): Promise<void> {
        const message = error.message.toLowerCase();
        let actions: string[] = [];
        let primaryMessage = `Failed to load resources for agent "${agentName}"`;

        if (message.includes('no workspace')) {
            primaryMessage = 'No workspace folder is open';
            actions = ['Open Folder'];
        } else if (message.includes('permission')) {
            primaryMessage = 'Permission denied accessing resource files';
            actions = ['Check Permissions', 'Retry'];
        } else if (message.includes('not found')) {
            primaryMessage = 'Resource files not found';
            actions = ['View Agent Config', 'Retry'];
        } else if (message.includes('timeout')) {
            primaryMessage = 'Resource loading timed out';
            actions = ['Retry', 'View Agent Config'];
        } else {
            actions = ['Retry', 'View Logs'];
        }

        const choice = await vscode.window.showErrorMessage(primaryMessage, ...actions);
        
        switch (choice) {
            case 'Open Folder':
                vscode.commands.executeCommand('vscode.openFolder');
                break;
            case 'Retry':
                if (this.state.selectedAgent) {
                    this.handleAgentSelection({
                        agentName: this.state.selectedAgent.name,
                        agentPath: '', // Will be handled by the service
                        agentConfig: this.state.selectedAgent,
                        location: AgentLocation.Local, // Default
                        timestamp: Date.now()
                    });
                }
                break;
            case 'View Agent Config':
                // Try to find and open the agent config
                vscode.commands.executeCommand('qcli-agents.refreshTree');
                break;
            case 'View Logs':
                vscode.commands.executeCommand('workbench.action.toggleDevTools');
                break;
            case 'Check Permissions':
                vscode.window.showInformationMessage(
                    'Please check that VS Code has permission to read the workspace files and directories.'
                );
                break;
        }
    }

    getTreeItem(element: ContextItem): vscode.TreeItem {
        if (this._disposed) {
            return new vscode.TreeItem('Disposed');
        }

        const treeItem = new vscode.TreeItem(element.label);
        
        // Handle ResourceFileItem with pattern grouping
        const resourceItem = element as ResourceFileItem;
        if (resourceItem.filePath !== undefined && resourceItem.fileType) {
            // Handle pattern group headers
            if (resourceItem.contextValue === 'patternGroup') {
                treeItem.description = element.description;
                treeItem.collapsibleState = vscode.TreeItemCollapsibleState.None;
                treeItem.iconPath = resourceItem.iconPath;
                treeItem.contextValue = 'patternGroup';
                
                // Create tooltip for pattern group
                const tooltip = new vscode.MarkdownString();
                tooltip.appendMarkdown(`**Resource Pattern**\n\n`);
                tooltip.appendMarkdown(`\`${resourceItem.originalPattern}\`\n\n`);
                tooltip.appendMarkdown(`${element.description}`);
                treeItem.tooltip = tooltip;
                
                return treeItem;
            }

            // Handle individual files
            if (element.description) {
                treeItem.description = element.description;
            }

            // Set tooltip with detailed information
            treeItem.tooltip = this.createFileTooltip(resourceItem);

            // Set resource URI for file operations
            if (resourceItem.filePath) {
                treeItem.resourceUri = vscode.Uri.file(resourceItem.filePath);
            }

            // Set command for file items
            if (resourceItem.fileType === 'file' && resourceItem.exists) {
                treeItem.command = {
                    command: 'qcli-context.openFile',
                    title: 'Open File',
                    arguments: [resourceItem]
                };
            }

            // No collapsible state for flat list
            treeItem.collapsibleState = vscode.TreeItemCollapsibleState.None;
        } else {
            // Handle non-file items
            if (element.description) {
                treeItem.description = element.description;
            }
            
            treeItem.collapsibleState = element.collapsibleState || vscode.TreeItemCollapsibleState.None;
        }
        
        if (element.iconPath) {
            treeItem.iconPath = element.iconPath;
        }
        
        if (element.contextValue) {
            treeItem.contextValue = element.contextValue;
        }

        return treeItem;
    }

    private formatFileSize(bytes: number): string {
        if (bytes === 0) return '0 B';
        
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }

    private createFileTooltip(item: ResourceFileItem): vscode.MarkdownString {
        const tooltip = new vscode.MarkdownString();
        
        tooltip.appendMarkdown(`**${item.label}**\n\n`);
        
        if (item.exists) {
            tooltip.appendMarkdown(`**Path:** \`${item.relativePath}\`\n\n`);
            tooltip.appendMarkdown(`**Size:** ${this.formatFileSize(item.size)}\n\n`);
            
            if (item.lastModified > 0) {
                const modifiedDate = new Date(item.lastModified).toLocaleString();
                tooltip.appendMarkdown(`**Modified:** ${modifiedDate}\n\n`);
            }
            
            tooltip.appendMarkdown(`**Pattern:** \`${item.originalPattern}\`\n\n`);
        } else {
            tooltip.appendMarkdown(`**Status:** File not found\n\n`);
            tooltip.appendMarkdown(`**Expected Path:** \`${item.relativePath}\`\n\n`);
        }
        
        tooltip.isTrusted = true;
        return tooltip;
    }

    getChildren(element?: ContextItem): Thenable<ContextItem[]> {
        if (this._disposed) {
            return Promise.resolve([]);
        }

        if (!element) {
            // Return root items (flat list)
            return Promise.resolve(this.getRootItems());
        }

        // No children in flat list structure
        return Promise.resolve([]);
    }

    private getRootItems(): ContextItem[] {
        if (this.state.isLoading) {
            return [this.createLoadingItem()];
        }

        if (this.state.error) {
            return [this.createErrorItem(this.state.error)];
        }

        if (!this.state.selectedAgent) {
            return [this.createNoAgentSelectedItem()];
        }

        if (!this.state.selectedAgent.resources || this.state.selectedAgent.resources.length === 0) {
            return [this.createNoResourcesItem()];
        }

        const filteredFiles = this.applySearchFilter(this.state.resourceFiles);

        if (filteredFiles.length === 0) {
            return [this.createNoMatchingFilesItem()];
        }

        return filteredFiles;
    }

    private applySearchFilter(items: ResourceFileItem[]): ResourceFileItem[] {
        if (!this.state.searchFilter) {
            return items;
        }

        const filter = this.state.searchFilter.toLowerCase();
        return items.filter(item => {
            const matchesName = item.label.toLowerCase().includes(filter);
            const matchesPath = item.relativePath.toLowerCase().includes(filter);
            
            return matchesName || matchesPath;
        });
    }

    // State item creators
    private createLoadingItem(): ContextItem {
        return {
            label: 'Loading resource files...',
            iconPath: new vscode.ThemeIcon('loading~spin'),
            contextValue: 'loading'
        };
    }

    private createErrorItem(error: string): ContextItem {
        return {
            label: 'Error loading resources',
            description: error,
            iconPath: new vscode.ThemeIcon('error'),
            contextValue: 'error'
        };
    }

    private createNoAgentSelectedItem(): ContextItem {
        return {
            label: 'No agent selected',
            description: 'Select an agent to view its resource files',
            iconPath: new vscode.ThemeIcon('info'),
            contextValue: 'noAgentSelected'
        };
    }

    private createNoResourcesItem(): ContextItem {
        return {
            label: 'No resources configured',
            description: 'This agent has no resource files configured',
            iconPath: new vscode.ThemeIcon('warning'),
            contextValue: 'noResources'
        };
    }

    private createNoMatchingFilesItem(): ContextItem {
        return {
            label: 'No matching files',
            description: 'No files match the current search filter',
            iconPath: new vscode.ThemeIcon('search-stop'),
            contextValue: 'noMatchingFiles'
        };
    }

    // Search functionality
    setSearchFilter(filter: string): void {
        this.state.searchFilter = filter;
        this.refresh();
    }

    clearSearchFilter(): void {
        this.state.searchFilter = '';
        this.refresh();
    }

    refresh(): void {
        if (this._disposed) {
            return;
        }
        this._onDidChangeTreeData.fire();
    }

    dispose(): void {
        if (this._disposed) {
            return;
        }

        this._disposed = true;

        if (this.agentSelectionSubscription) {
            this.agentSelectionSubscription.dispose();
        }

        if (this.resourceWatcher) {
            this.resourceWatcher.dispose();
        }

        this._onDidChangeTreeData.dispose();
        
        this.logger.debug('ContextTreeProvider disposed');
    }
}
