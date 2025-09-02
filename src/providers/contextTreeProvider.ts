import * as vscode from 'vscode';
import { ContextItem } from '../types/context';
import { getExtensionState } from '../extension';

/**
 * Tree Data Provider for the Q CLI Agent Manager Activity Bar view
 * Implements VS Code's TreeDataProvider interface to display context items
 * Optimized for memory efficiency and performance
 */
export class ContextTreeProvider implements vscode.TreeDataProvider<ContextItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<ContextItem | undefined | null | void> = new vscode.EventEmitter<ContextItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<ContextItem | undefined | null | void> = this._onDidChangeTreeData.event;

    private contextItems: ContextItem[] = [];
    private _disposed = false;

    constructor() {
        // Initialize with minimal welcome message to reduce memory footprint
        this.contextItems = [this.createWelcomeItem()];
    }

    /**
     * Create welcome item with minimal memory footprint
     */
    private createWelcomeItem(): ContextItem {
        return {
            label: 'Q CLI Agent Manager에 오신 것을 환영합니다',
            description: '아직 추가된 컨텍스트 파일이 없습니다',
            iconPath: new vscode.ThemeIcon('info'),
            contextValue: 'welcome'
        };
    }

    /**
     * Dispose of resources to prevent memory leaks
     */
    dispose(): void {
        if (this._disposed) {
            return;
        }
        
        this._disposed = true;
        this._onDidChangeTreeData.dispose();
        this.contextItems = [];
        
        const extensionState = getExtensionState();
        if (extensionState?.logger) {
            extensionState.logger.debug('ContextTreeProvider disposed');
        }
    }

    /**
     * Refresh the tree view
     * Optimized to avoid unnecessary refreshes
     */
    refresh(): void {
        if (this._disposed) {
            return;
        }
        
        const extensionState = getExtensionState();
        if (extensionState?.logger) {
            extensionState.logger.debug('Context tree view refreshed');
        }
        this._onDidChangeTreeData.fire();
    }

    /**
     * Get tree item representation for display
     * Optimized for memory efficiency
     */
    getTreeItem(element: ContextItem): vscode.TreeItem {
        if (this._disposed) {
            return new vscode.TreeItem('Disposed');
        }
        
        const treeItem = new vscode.TreeItem(element.label);
        
        // Only set properties that are defined to minimize memory usage
        if (element.description !== undefined) {
            treeItem.description = element.description;
        }
        
        if (element.iconPath !== undefined) {
            treeItem.iconPath = element.iconPath;
        }
        
        if (element.contextValue !== undefined) {
            treeItem.contextValue = element.contextValue;
        }
        
        // Set collapsible state based on whether item has children
        treeItem.collapsibleState = (element.children && element.children.length > 0) 
            ? vscode.TreeItemCollapsibleState.Collapsed 
            : vscode.TreeItemCollapsibleState.None;

        return treeItem;
    }

    /**
     * Get children of a tree item
     * Optimized to return empty arrays instead of creating new ones
     */
    getChildren(element?: ContextItem): Thenable<ContextItem[]> {
        if (this._disposed) {
            return Promise.resolve([]);
        }
        
        if (!element) {
            // Return root items
            return Promise.resolve(this.contextItems);
        } else {
            // Return children of the element, or empty array to avoid creating new arrays
            return Promise.resolve(element.children || []);
        }
    }

    /**
     * Update the context items displayed in the tree
     * Optimized to reuse objects and minimize allocations
     */
    updateContextItems(items: ContextItem[]): void {
        if (this._disposed) {
            return;
        }
        
        const extensionState = getExtensionState();
        if (extensionState?.logger) {
            extensionState.logger.debug(`Updating context tree with ${items.length} items`);
        }
        
        // Clear existing items to free memory
        this.contextItems.length = 0;
        
        if (items.length > 0) {
            this.contextItems.push(...items);
        } else {
            // Reuse empty item creation
            this.contextItems.push(this.createEmptyItem());
        }
        
        this.refresh();
    }

    /**
     * Create empty item with minimal memory footprint
     */
    private createEmptyItem(): ContextItem {
        return {
            label: '컨텍스트 파일이 없습니다',
            description: '파일을 추가하여 시작하세요',
            iconPath: new vscode.ThemeIcon('file-add'),
            contextValue: 'empty'
        };
    }

    /**
     * Add a context item to the tree
     * Optimized to avoid array recreation
     */
    addContextItem(item: ContextItem): void {
        if (this._disposed) {
            return;
        }
        
        const extensionState = getExtensionState();
        if (extensionState?.logger) {
            extensionState.logger.debug(`Adding context item: ${item.label}`);
        }
        
        // Remove welcome/empty messages efficiently
        for (let i = this.contextItems.length - 1; i >= 0; i--) {
            const existing = this.contextItems[i];
            if (existing && (existing.contextValue === 'welcome' || existing.contextValue === 'empty')) {
                this.contextItems.splice(i, 1);
            }
        }
        
        this.contextItems.push(item);
        this.refresh();
    }

    /**
     * Remove a context item from the tree
     * Optimized to avoid array recreation
     */
    removeContextItem(item: ContextItem): void {
        if (this._disposed) {
            return;
        }
        
        const extensionState = getExtensionState();
        if (extensionState?.logger) {
            extensionState.logger.debug(`Removing context item: ${item.label}`);
        }
        
        // Remove item efficiently using splice
        for (let i = this.contextItems.length - 1; i >= 0; i--) {
            const contextItem = this.contextItems[i];
            if (contextItem && contextItem.label === item.label) {
                this.contextItems.splice(i, 1);
                break; // Assume unique labels
            }
        }
        
        // Add empty message if no items remain
        if (this.contextItems.length === 0) {
            this.contextItems.push(this.createEmptyItem());
        }
        
        this.refresh();
    }

    /**
     * Get current context items
     */
    getContextItems(): ContextItem[] {
        return this.contextItems.filter(
            item => item.contextValue !== 'welcome' && item.contextValue !== 'empty'
        );
    }
}