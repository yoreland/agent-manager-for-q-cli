/**
 * Types for Agent Creation UI
 */

export interface AgentFormData {
    name: string;
    description: string;
    prompt: string;
    tools: {
        available: string[];  // Tools in the "tools" array
        allowed: string[];    // Tools in the "allowedTools" array
    };
    resources: string[];
}

export interface BuiltInTool {
    name: string;
    displayName: string;
    description: string;
    category: 'filesystem' | 'execution' | 'aws' | 'utility' | 'development';
    defaultAllowed: boolean;
}

export interface FormValidationResult {
    isValid: boolean;
    errors: {
        field: keyof AgentFormData;
        message: string;
    }[];
    warnings: {
        field: keyof AgentFormData;
        message: string;
    }[];
}

export interface AgentCreationResult {
    success: boolean;
    agentPath?: string;
    error?: string;
}

// WebView Message Protocol
export type WebviewMessage = 
    | { type: 'ready' }
    | { type: 'formDataChanged'; data: Partial<AgentFormData> }
    | { type: 'validateForm'; data: AgentFormData }
    | { type: 'submitForm'; data: AgentFormData }
    | { type: 'cancel' }
    | { type: 'addResource'; path: string }
    | { type: 'removeResource'; index: number }
    | { type: 'openAgentFile'; path: string };

export type ExtensionMessage = 
    | { type: 'initialData'; data: AgentFormData; tools: BuiltInTool[] }
    | { type: 'validationResult'; result: FormValidationResult }
    | { type: 'creationResult'; result: AgentCreationResult }
    | { type: 'error'; message: string };
