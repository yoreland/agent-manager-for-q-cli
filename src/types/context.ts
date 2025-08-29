import * as vscode from 'vscode';

/**
 * Represents an item in the context tree view
 */
export interface ContextItem {
    /** Display label for the context item */
    label: string;
    
    /** Optional description shown as tooltip */
    description?: string;
    
    /** Icon to display next to the item */
    iconPath?: vscode.ThemeIcon | vscode.Uri;
    
    /** Context value for command enablement */
    contextValue?: string;
    
    /** Child items for tree structure */
    children?: ContextItem[];
    
    /** File path if this item represents a file */
    filePath?: string;
    
    /** Whether this item is collapsible */
    collapsibleState?: vscode.TreeItemCollapsibleState;
}

/**
 * Types of context items
 */
export enum ContextType {
    FILE = 'file',
    DIRECTORY = 'directory',
    PLACEHOLDER = 'placeholder',
    WELCOME = 'welcome'
}

/**
 * Context management operation results
 */
export enum ContextOperationResult {
    SUCCESS = 'success',
    ERROR = 'error',
    CANCELLED = 'cancelled',
    NOT_FOUND = 'not_found'
}