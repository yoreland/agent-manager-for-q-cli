/**
 * @fileoverview Type definitions for Q CLI agent configurations and operations.
 * 
 * This module defines interfaces, enums, and types used throughout the
 * Agent Manager extension for handling Q CLI agent configurations,
 * validation, and management operations.
 * 
 * @author Agent Manager for Q CLI Extension
 * @since 0.1.0
 */

import * as vscode from 'vscode';

/**
 * Enumeration of agent storage locations.
 * 
 * Defines where Q CLI agents can be stored - either locally in the
 * workspace or globally in the user's home directory.
 * 
 * @enum {string}
 */
export enum AgentLocation {
    /** Local workspace agent (.amazonq/cli-agents/) */
    Local = 'local',
    /** Global user agent (~/.aws/amazonq/cli-agents/) */
    Global = 'global'
}

/**
 * Information about agent name conflicts between local and global locations.
 * 
 * Used to detect and resolve conflicts when agents with the same name
 * exist in both local and global locations.
 * 
 * @interface AgentConflictInfo
 */
export interface AgentConflictInfo {
    /** Whether a naming conflict exists */
    hasConflict: boolean;
    /** Whether agent exists in local location */
    localExists: boolean;
    /** Whether agent exists in global location */
    globalExists: boolean;
    /** Recommended action to resolve conflict */
    recommendedAction: 'use_local' | 'use_global' | 'rename';
}

/**
 * Q CLI Agent configuration schema interface.
 * 
 * Based on the official Q CLI agent JSON schema. Defines the structure
 * and properties required for a valid Q CLI agent configuration.
 * 
 * @interface AgentConfig
 * @see {@link https://docs.aws.amazon.com/amazonq/latest/qdeveloper-ug/q-developer-cli-agents.html}
 */
export interface AgentConfig {
    /** JSON schema reference URL for validation */
    $schema: string;
    
    /** Unique agent identifier (must match filename without .json extension) */
    name: string;
    
    /** Human-readable description of the agent */
    description: string;
    
    /** Custom prompt for the agent (optional) */
    prompt: string | null;
    
    /** MCP (Model Context Protocol) servers configuration */
    mcpServers?: Record<string, any>;
    
    /** List of available tools for the agent */
    tools: string[];
    
    /** Tool aliases mapping */
    toolAliases?: Record<string, string>;
    
    /** List of explicitly allowed tools */
    allowedTools: string[];
    
    /** Resource paths (files, directories, etc.) */
    resources: string[];
    
    /** Hook configurations */
    hooks?: Record<string, any>;
    
    /** Tool-specific settings */
    toolsSettings?: Record<string, any>;
    
    /** Whether to use legacy MCP JSON format */
    useLegacyMcpJson: boolean;
}

/**
 * Represents an agent item in the tree view
 */
export interface AgentItem {
    /** Display label for the agent item */
    label: string;
    
    /** Optional description shown as tooltip */
    description?: string;
    
    /** Icon to display next to the item */
    iconPath?: vscode.ThemeIcon | vscode.Uri;
    
    /** Context value for command enablement */
    contextValue: string;
    
    /** Full file path to the agent configuration file */
    filePath: string;
    
    /** Parsed agent configuration */
    config: AgentConfig;
    
    /** Child items for tree structure (if any) */
    children?: AgentItem[];
    
    /** Whether this item is collapsible */
    collapsibleState?: vscode.TreeItemCollapsibleState;
    
    /** Command to execute when the item is clicked */
    command?: vscode.Command;
}

/**
 * Extended agent item with location information
 */
export interface AgentItemWithLocation extends AgentItem {
    /** Location of the agent (local or global) */
    location: AgentLocation;
    
    /** Whether this agent has a name conflict */
    hasConflict: boolean;
    
    /** Conflict information if applicable */
    conflictInfo?: AgentConflictInfo;
}

/**
 * Location separator item for tree view organization
 */
export interface LocationSeparatorItem {
    /** Display label (e.g., "Local Agents", "Global Agents") */
    label: string;
    
    /** Context value for command enablement */
    contextValue: 'locationSeparator';
    
    /** Always expanded to show children */
    collapsibleState: vscode.TreeItemCollapsibleState.Expanded;
    
    /** Child agent items */
    children: AgentItemWithLocation[];
}

/**
 * Conflict warning item for tree view
 */
export interface ConflictWarningItem {
    /** Warning message label */
    label: string;
    
    /** Detailed description */
    description: string;
    
    /** Warning icon */
    iconPath: vscode.ThemeIcon;
    
    /** Context value for command enablement */
    contextValue: 'conflictWarning';
    
    /** Tooltip with detailed information */
    tooltip: string;
}

/**
 * Result of agent creation operation
 */
export interface AgentCreationResult {
    /** Whether the operation was successful */
    success: boolean;
    
    /** Human-readable message about the operation result */
    message: string;
    
    /** Created agent item (if successful) */
    agentItem?: AgentItem;
    
    /** Error details (if failed) */
    error?: Error;
}

/**
 * Result of validation operations
 */
export interface ValidationResult {
    /** Whether the validation passed */
    isValid: boolean;
    
    /** List of validation errors */
    errors: string[];
    
    /** List of validation warnings (optional) */
    warnings?: string[];
}

/**
 * Agent template configuration options
 */
export interface AgentTemplateOptions {
    /** Agent name to be used in the template */
    name: string;
    
    /** Custom description for the agent */
    description?: string;
    
    /** Custom prompt for the agent */
    prompt?: string | null;
    
    /** Additional tools to include beyond the default set */
    additionalTools?: string[];
    
    /** Additional resources to include beyond the default set */
    additionalResources?: string[];
    
    /** Whether to include advanced tools (use_aws, gh_issue) */
    includeAdvancedTools?: boolean;
    
    /** Whether to include all available tools */
    includeAllTools?: boolean;
}

/**
 * Types of agent-related operations
 */
export enum AgentOperationType {
    CREATE = 'create',
    UPDATE = 'update',
    DELETE = 'delete',
    VALIDATE = 'validate',
    REFRESH = 'refresh'
}

/**
 * Agent operation results
 */
export enum AgentOperationResult {
    SUCCESS = 'success',
    ERROR = 'error',
    CANCELLED = 'cancelled',
    NOT_FOUND = 'not_found',
    ALREADY_EXISTS = 'already_exists',
    INVALID_NAME = 'invalid_name',
    PERMISSION_DENIED = 'permission_denied'
}

/**
 * Agent-related constants
 */
export const AGENT_CONSTANTS = {
    /** Default agent directory path relative to workspace root */
    AGENT_DIRECTORY: '.amazonq/cli-agents',
    
    /** Global agent directory path relative to home directory */
    GLOBAL_AGENT_DIRECTORY: '.aws/amazonq/cli-agents',
    
    /** Agent file extension */
    AGENT_FILE_EXTENSION: '.json',
    
    /** Maximum agent name length */
    MAX_AGENT_NAME_LENGTH: 50,
    
    /** Minimum agent name length */
    MIN_AGENT_NAME_LENGTH: 1,
    
    /** Valid agent name pattern (alphanumeric, hyphens, underscores) */
    VALID_NAME_PATTERN: /^[a-zA-Z0-9_-]+$/,
    
    /** Reserved agent names that cannot be used */
    RESERVED_NAMES: ['default', 'system', 'config', 'settings'],
    
    /** Default agent icon */
    DEFAULT_ICON: new vscode.ThemeIcon('robot'),
    
    /** Create new agent button icon */
    CREATE_ICON: new vscode.ThemeIcon('add'),
    
    /** Global agent icon overlay */
    GLOBAL_ICON: new vscode.ThemeIcon('globe'),
    
    /** Conflict warning icon */
    CONFLICT_ICON: new vscode.ThemeIcon('warning'),
    
    /** Agent context values for commands */
    CONTEXT_VALUES: {
        AGENT_ITEM: 'agentItem',
        CREATE_BUTTON: 'createAgentButton',
        EMPTY_STATE: 'emptyAgentState',
        LOCATION_SEPARATOR: 'locationSeparator',
        CONFLICT_WARNING: 'conflictWarning'
    },
    
    /** Template-related constants */
    TEMPLATES: {
        /** Official Q CLI agent schema URL */
        SCHEMA_URL: 'https://raw.githubusercontent.com/aws/amazon-q-developer-cli/refs/heads/main/schemas/agent-v1.json',
        
        /** Default description for new agents */
        DEFAULT_DESCRIPTION: 'Custom Q CLI Agent',
        
        /** Basic tools available to all agents */
        BASIC_TOOLS: ['fs_read', 'fs_write', 'execute_bash', 'knowledge', 'thinking'],
        
        /** Advanced tools for specialized use cases */
        ADVANCED_TOOLS: ['use_aws', 'gh_issue', 'web_search', 'calculator', 'code_interpreter'],
        
        /** Default resources for new agents */
        DEFAULT_RESOURCES: [
            'file://README.md',
            'file://.amazonq/rules/**/*.md'
        ],
        
        /** Common additional resources */
        COMMON_RESOURCES: [
            'file://docs/**/*.md',
            'file://src/**/*.ts',
            'file://src/**/*.js',
            'file://package.json',
            'file://tsconfig.json'
        ]
    }
} as const;

/**
 * Default agent configuration template
 * Based on the official Q CLI agent schema
 * This template provides a comprehensive starting point for new agents
 */
export const DEFAULT_AGENT_CONFIG: Omit<AgentConfig, 'name'> = {
    $schema: AGENT_CONSTANTS.TEMPLATES.SCHEMA_URL,
    description: AGENT_CONSTANTS.TEMPLATES.DEFAULT_DESCRIPTION,
    prompt: null,
    tools: [
        ...AGENT_CONSTANTS.TEMPLATES.BASIC_TOOLS,
        ...AGENT_CONSTANTS.TEMPLATES.ADVANCED_TOOLS
    ],
    allowedTools: ['fs_read'],
    resources: [...AGENT_CONSTANTS.TEMPLATES.DEFAULT_RESOURCES],
    useLegacyMcpJson: true
};

/**
 * Agent selection event data
 */
export interface AgentSelectionEvent {
    /** Name of the selected agent */
    agentName: string;
    
    /** Full path to the agent configuration file */
    agentPath: string;
    
    /** Parsed agent configuration */
    agentConfig: AgentConfig;
    
    /** Location of the agent (local or global) */
    location: AgentLocation;
    
    /** Timestamp when the selection occurred */
    timestamp: number;
}

/**
 * Interface for components that emit agent selection events
 */
export interface AgentSelectionEventEmitter {
    /** Event fired when an agent is selected */
    onAgentSelected: vscode.Event<AgentSelectionEvent>;
    
    /** Fire an agent selection event */
    fireAgentSelected(event: AgentSelectionEvent): void;
}

/**
 * Agent-related commands
 */
export const AGENT_COMMANDS = {
    /** Create new agent command */
    CREATE_AGENT: 'qcli-agents.createAgent',
    
    /** Delete agent command */
    DELETE_AGENT: 'qcli-agents.deleteAgent',
    
    /** Edit agent command */
    EDIT_AGENT: 'qcli-agents.editAgent',
    
    /** Open agent file command */
    OPEN_AGENT: 'qcli-agents.openAgent',
    
    /** Select agent command (fires selection event) */
    SELECT_AGENT: 'qcli-agents.selectAgent',
    
    /** Refresh agent list command */
    REFRESH_AGENTS: 'qcli-agents.refreshTree',
    
    /** Validate agent command */
    VALIDATE_AGENT: 'qcli-agents.validateAgent'
} as const;