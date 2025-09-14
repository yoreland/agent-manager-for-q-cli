/**
 * Experimental tool definition interface
 */
export interface ExperimentalTool {
    /** Tool name identifier */
    name: string;
    
    /** Human-readable display name */
    displayName: string;
    
    /** Tool description */
    description: string;
    
    /** Marks this as an experimental tool */
    isExperimental: true;
    
    /** Warning level for the experimental feature */
    warningLevel: 'info' | 'warning' | 'caution';
    
    /** Stability note explaining current status */
    stabilityNote: string;
    
    /** List of key features */
    features: string[];
    
    /** Usage examples (optional) */
    usage?: string[];
}

/**
 * Tool section for UI organization
 */
export interface ToolSection {
    /** Section title */
    title: string;
    
    /** Tools in this section */
    tools: string[];
    
    /** Whether this section contains experimental tools */
    isExperimental: boolean;
    
    /** Warning message for experimental sections */
    warningMessage?: string;
}

/**
 * Enhanced agent form data with experimental tool support
 */
export interface EnhancedAgentFormData {
    /** Agent name */
    name: string;
    
    /** Agent description */
    description: string;
    
    /** Agent prompt */
    prompt: string;
    
    /** Agent location (local or global) */
    location: 'local' | 'global';
    
    /** Tool configuration */
    tools: {
        /** All available tools */
        available: string[];
        
        /** Tools allowed without prompting */
        allowed: string[];
        
        /** Experimental tools selected */
        experimental: string[];
    };
    
    /** Resource paths */
    resources: string[];
}

/**
 * Experimental tool warning information
 */
export interface ExperimentalToolWarning {
    /** Tool name */
    toolName: string;
    
    /** Warning level */
    level: 'info' | 'warning' | 'caution';
    
    /** Warning message */
    message: string;
    
    /** Whether user can proceed with this tool */
    canProceed: boolean;
}

/**
 * Constants for experimental tools
 */
export const EXPERIMENTAL_TOOL_CONSTANTS = {
    /** List of experimental tool names */
    EXPERIMENTAL_TOOLS: ['knowledge', 'thinking', 'todo_list'],
    
    /** Default warning message for experimental tools */
    DEFAULT_WARNING: 'Experimental features are in active development and may change or be removed at any time. Use with caution in production workflows.',
    
    /** Warning icons by level */
    WARNING_ICONS: {
        info: 'info',
        warning: 'warning', 
        caution: 'error'
    }
} as const;
