import * as vscode from 'vscode';
import { AgentLocationService, AgentLocation, AgentConflictInfo } from '../core/agent/AgentLocationService';
import { AgentItemWithLocation } from '../types/agent';
import { ILogger } from '../shared/infrastructure/ILogger';

export interface ConflictResolution {
    action: 'use_local' | 'use_global' | 'rename' | 'cancel';
    newName?: string;
}

export interface ConflictWarning {
    agentName: string;
    message: string;
    severity: 'info' | 'warning' | 'error';
    canProceed: boolean;
}

export class AgentConflictResolver {
    constructor(
        private agentLocationService: AgentLocationService,
        private logger: ILogger
    ) {}

    async detectAllConflicts(agents: { local: AgentItemWithLocation[], global: AgentItemWithLocation[] }): Promise<ConflictWarning[]> {
        const warnings: ConflictWarning[] = [];
        const localNames = new Set(agents.local.map(a => a.label));

        for (const globalAgent of agents.global) {
            if (localNames.has(globalAgent.label)) {
                const conflictInfo = await this.agentLocationService.detectNameConflicts(globalAgent.label);
                
                warnings.push({
                    agentName: globalAgent.label,
                    message: `Agent '${globalAgent.label}' exists in both local and global locations. Local version takes precedence.`,
                    severity: 'warning',
                    canProceed: true
                });
            }
        }

        return warnings;
    }

    async resolveConflictForCreation(name: string, preferredLocation: AgentLocation): Promise<ConflictResolution> {
        const conflictInfo = await this.agentLocationService.detectNameConflicts(name);
        
        if (!conflictInfo.hasConflict) {
            return { action: preferredLocation === AgentLocation.Local ? 'use_local' : 'use_global' };
        }

        // Show user dialog for conflict resolution
        const choice = await this.showConflictDialog(name, conflictInfo, preferredLocation);
        return choice;
    }

    private async showConflictDialog(name: string, conflictInfo: AgentConflictInfo, preferredLocation: AgentLocation): Promise<ConflictResolution> {
        const localExists = conflictInfo.localExists ? 'Local' : '';
        const globalExists = conflictInfo.globalExists ? 'Global' : '';
        const existsIn = [localExists, globalExists].filter(Boolean).join(' and ');

        const message = `Agent '${name}' already exists in ${existsIn} location(s). What would you like to do?`;
        
        const options: vscode.MessageItem[] = [];
        
        if (preferredLocation === AgentLocation.Local && !conflictInfo.localExists) {
            options.push({ title: 'Create Local', detail: 'Create in local location (will take precedence)' });
        }
        
        if (preferredLocation === AgentLocation.Global && !conflictInfo.globalExists) {
            options.push({ title: 'Create Global', detail: 'Create in global location' });
        }
        
        options.push(
            { title: 'Choose Different Name', detail: 'Enter a different agent name' },
            { title: 'Cancel', detail: 'Cancel agent creation', isCloseAffordance: true }
        );

        const choice = await vscode.window.showWarningMessage(message, { modal: true }, ...options);
        
        switch (choice?.title) {
            case 'Create Local':
                return { action: 'use_local' };
            case 'Create Global':
                return { action: 'use_global' };
            case 'Choose Different Name':
                const newName = await this.promptForNewName(name);
                return newName ? { action: 'rename', newName } : { action: 'cancel' };
            default:
                return { action: 'cancel' };
        }
    }

    private async promptForNewName(originalName: string): Promise<string | undefined> {
        const newName = await vscode.window.showInputBox({
            prompt: 'Enter a new agent name',
            value: originalName,
            validateInput: async (value) => {
                if (!value || value.trim().length === 0) {
                    return 'Agent name cannot be empty';
                }
                
                if (!/^[a-zA-Z0-9_-]+$/.test(value)) {
                    return 'Agent name can only contain letters, numbers, hyphens, and underscores';
                }
                
                const conflictInfo = await this.agentLocationService.detectNameConflicts(value);
                if (conflictInfo.hasConflict) {
                    return `Agent '${value}' already exists`;
                }
                
                return undefined;
            }
        });

        return newName?.trim();
    }

    async handleConflictWarnings(warnings: ConflictWarning[]): Promise<void> {
        if (warnings.length === 0) return;

        const message = `Found ${warnings.length} agent name conflict(s). Local agents will take precedence over global ones with the same name.`;
        
        const choice = await vscode.window.showWarningMessage(
            message,
            'Show Details',
            'Dismiss'
        );

        if (choice === 'Show Details') {
            await this.showConflictDetails(warnings);
        }
    }

    private async showConflictDetails(warnings: ConflictWarning[]): Promise<void> {
        const details = warnings.map(w => `• ${w.agentName}: ${w.message}`).join('\n');
        
        await vscode.window.showInformationMessage(
            `Agent Conflicts:\n\n${details}`,
            { modal: true },
            'OK'
        );
    }

    generateConflictTooltip(agent: AgentItemWithLocation): string {
        if (!agent.hasConflict || !agent.conflictInfo) {
            return agent.description || 'No description';
        }

        const conflictInfo = agent.conflictInfo;
        let tooltip = agent.description || 'No description';
        
        if (conflictInfo.hasConflict) {
            tooltip += '\n\n⚠️ Name Conflict: ';
            if (agent.location === AgentLocation.Local) {
                tooltip += 'This local agent takes precedence over the global agent with the same name.';
            } else {
                tooltip += 'A local agent with this name exists and takes precedence.';
            }
        }

        return tooltip;
    }
}
