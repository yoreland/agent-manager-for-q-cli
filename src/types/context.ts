import * as vscode from 'vscode';
import { AgentConfig } from './agent';

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
 * Resource file item for Context Resources view
 */
export interface ResourceFileItem extends ContextItem {
    /** Full file path */
    filePath: string;
    
    /** Workspace relative path */
    relativePath: string;
    
    /** Original resource pattern from agent config */
    originalPattern: string;
    
    /** File type */
    fileType: 'file' | 'directory';
    
    /** File size in bytes */
    size: number;
    
    /** Last modified timestamp */
    lastModified: number;
    
    /** Whether file exists */
    exists: boolean;
    
    /** Child items for directories */
    children?: ResourceFileItem[];
}

/**
 * Context resource state
 */
export interface ContextResourceState {
    /** Currently selected agent */
    selectedAgent: AgentConfig | null;
    
    /** Resource files from selected agent */
    resourceFiles: ResourceFileItem[];
    
    /** Loading state */
    isLoading: boolean;
    
    /** Error message if any */
    error: string | null;
    
    /** Search filter */
    searchFilter: string;
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