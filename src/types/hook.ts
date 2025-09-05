/**
 * Hook configuration types for agent context injection
 */

export interface HookTemplate {
    id: string;
    name: string;
    description: string;
    trigger: 'agentSpawn' | 'userPromptSubmit';
    command: string;
    category: 'git' | 'project' | 'system' | 'custom';
    isReadOnly: boolean;
    securityLevel: 'safe' | 'caution' | 'warning';
}

export interface HookConfigurationData {
    hooks: AgentHook[];
    skipHooks: boolean;
}

export interface AgentHook {
    id: string;
    name: string;
    trigger: 'agentSpawn' | 'userPromptSubmit';
    command: string;
    isCustom: boolean;
    templateId?: string;
}

export interface HookValidationResult {
    isValid: boolean;
    errors: string[];
    warnings: string[];
    securityWarnings: string[];
}
