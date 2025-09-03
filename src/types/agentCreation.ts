/**
 * Types for Agent Creation UI
 */

import { AgentLocation } from './agent';
import { ExperimentalTool } from './experimentalTools';

export interface AgentFormData {
    name: string;
    description: string;
    prompt: string;
    location: AgentLocation;  // New: Agent location selection
    tools: {
        available: string[];  // Tools in the "tools" array
        allowed: string[];    // Tools in the "allowedTools" array
        experimental: string[];  // New: Experimental tools selected
    };
    resources: string[];
}

export interface BuiltInTool {
    name: string;
    displayName: string;
    description: string;
    category: 'filesystem' | 'execution' | 'aws' | 'utility' | 'development' | 'experimental';
    defaultAllowed: boolean;
    isExperimental?: boolean;  // New: Mark experimental tools
}

export interface ToolSection {
    title: string;
    tools: BuiltInTool[];
    isExperimental: boolean;
    warningMessage?: string;
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
    location?: AgentLocation;  // New: Include location in result
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
    | { type: 'openAgentFile'; path: string }
    | { type: 'locationChanged'; location: AgentLocation }  // New: Location change message
    | { type: 'requestExperimentalToolInfo'; toolName: string };  // New: Request experimental tool info

export type ExtensionMessage = 
    | { type: 'initialData'; data: AgentFormData; tools: BuiltInTool[]; toolSections: ToolSection[] }  // Enhanced with sections
    | { type: 'validationResult'; result: FormValidationResult }
    | { type: 'creationResult'; result: AgentCreationResult }
    | { type: 'error'; message: string }
    | { type: 'locationValidation'; isValid: boolean; message?: string }  // New: Location validation
    | { type: 'experimentalToolInfo'; tool: ExperimentalTool | null };  // New: Experimental tool info
