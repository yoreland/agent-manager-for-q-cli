import * as vscode from 'vscode';
import { AgentItemWithLocation, ConflictWarningItem, AGENT_CONSTANTS } from '../types/agent';
import { AgentLocation } from '../core/agent/AgentLocationService';
import { LocationBasedAgentList } from '../services/EnhancedAgentManagementService';

export interface EmptyStateConfig {
    location?: AgentLocation;
    showCreateButton?: boolean;
    customMessage?: string;
}

export class TreeViewUIHelper {
    
    static createConflictWarningItems(agentData: LocationBasedAgentList): ConflictWarningItem[] {
        if (agentData.conflicts.length === 0) {
            return [];
        }

        const conflictItems: ConflictWarningItem[] = [];
        
        // Main conflict warning
        conflictItems.push({
            label: `⚠️ ${agentData.conflicts.length} Name Conflicts Detected`,
            description: 'Local agents take precedence over global ones',
            iconPath: AGENT_CONSTANTS.CONFLICT_ICON,
            contextValue: 'conflictWarning',
            tooltip: this.generateConflictSummaryTooltip(agentData.conflicts)
        });

        return conflictItems;
    }

    static enhanceAgentItemWithConflictInfo(agent: AgentItemWithLocation): vscode.TreeItem {
        const treeItem = new vscode.TreeItem(agent.label, vscode.TreeItemCollapsibleState.None);
        
        // Basic properties
        treeItem.contextValue = 'agentItem';
        treeItem.tooltip = this.generateAgentTooltip(agent);
        
        // Conflict-aware styling
        if (agent.hasConflict) {
            treeItem.description = `${agent.description} (conflict)`;
            treeItem.iconPath = new vscode.ThemeIcon('warning', new vscode.ThemeColor('problemsWarningIcon.foreground'));
        } else {
            treeItem.description = agent.description;
            treeItem.iconPath = this.getLocationIcon(agent.location);
        }

        // Add run command
        treeItem.command = {
            command: 'qcli-agents.runAgent',
            title: 'Run Agent',
            arguments: [agent.label]
        };

        return treeItem;
    }

    static createEmptyStateItem(config: EmptyStateConfig): vscode.TreeItem {
        const treeItem = new vscode.TreeItem(
            this.getEmptyStateLabel(config),
            vscode.TreeItemCollapsibleState.None
        );
        
        treeItem.description = this.getEmptyStateDescription(config);
        treeItem.contextValue = 'emptyState';
        treeItem.iconPath = new vscode.ThemeIcon('info');
        treeItem.tooltip = this.getEmptyStateTooltip(config);

        return treeItem;
    }

    static createLocationSeparator(
        location: AgentLocation, 
        agentCount: number, 
        hasConflicts: boolean = false
    ): vscode.TreeItem {
        const locationName = location === AgentLocation.Local ? 'Local' : 'Global';
        const conflictIndicator = hasConflicts ? ' ⚠️' : '';
        
        const treeItem = new vscode.TreeItem(
            `${locationName} Agents (${agentCount})${conflictIndicator}`,
            vscode.TreeItemCollapsibleState.Expanded
        );
        
        treeItem.contextValue = 'locationSeparator';
        treeItem.iconPath = new vscode.ThemeIcon('folder');
        treeItem.tooltip = this.getLocationSeparatorTooltip(location, agentCount, hasConflicts);

        return treeItem;
    }

    private static generateConflictSummaryTooltip(conflicts: any[]): string {
        const conflictCount = conflicts.length;
        const tooltip = [
            `${conflictCount} agent name conflict(s) detected:`,
            '',
            'When agents with the same name exist in both locations,',
            'the local agent takes precedence over the global one.',
            '',
            'This means the global agent will be ignored when running',
            'from this workspace.'
        ];

        return tooltip.join('\n');
    }

    private static generateAgentTooltip(agent: AgentItemWithLocation): string {
        let tooltip = `${agent.description || 'No description'}`;
        
        tooltip += `\n\nLocation: ${agent.location === AgentLocation.Local ? 'Local (workspace)' : 'Global (user-wide)'}`;
        tooltip += `\nPath: ${agent.filePath}`;
        
        if (agent.hasConflict && agent.conflictInfo) {
            tooltip += '\n\n⚠️ Name Conflict:';
            if (agent.location === AgentLocation.Local) {
                tooltip += '\nThis local agent takes precedence over the global agent with the same name.';
            } else {
                tooltip += '\nA local agent with this name exists and takes precedence over this global agent.';
            }
        }

        return tooltip;
    }

    private static getLocationIcon(location: AgentLocation): vscode.ThemeIcon {
        return location === AgentLocation.Global 
            ? AGENT_CONSTANTS.GLOBAL_ICON 
            : AGENT_CONSTANTS.DEFAULT_ICON;
    }

    private static getEmptyStateLabel(config: EmptyStateConfig): string {
        if (config.customMessage) {
            return config.customMessage;
        }

        if (config.location === AgentLocation.Local) {
            return 'No local agents';
        } else if (config.location === AgentLocation.Global) {
            return 'No global agents';
        }

        return 'No agents found';
    }

    private static getEmptyStateDescription(config: EmptyStateConfig): string {
        if (config.location === AgentLocation.Local) {
            return 'Create agents for this workspace';
        } else if (config.location === AgentLocation.Global) {
            return 'Create agents for all workspaces';
        }

        return 'Click + to create your first agent';
    }

    private static getEmptyStateTooltip(config: EmptyStateConfig): string {
        if (config.location === AgentLocation.Local) {
            return 'Local agents are stored in .amazonq/cli-agents/ and are only available in this workspace.';
        } else if (config.location === AgentLocation.Global) {
            return 'Global agents are stored in ~/.aws/amazonq/cli-agents/ and are available from any workspace.';
        }

        return 'Use the + button in the title bar to create a new agent.';
    }

    private static getLocationSeparatorTooltip(
        location: AgentLocation, 
        agentCount: number, 
        hasConflicts: boolean
    ): string {
        const locationName = location === AgentLocation.Local ? 'Local' : 'Global';
        const locationPath = location === AgentLocation.Local 
            ? '.amazonq/cli-agents/' 
            : '~/.aws/amazonq/cli-agents/';
        
        let tooltip = `${locationName} agents (${agentCount})\nStored in: ${locationPath}`;
        
        if (location === AgentLocation.Local) {
            tooltip += '\n\nLocal agents are workspace-specific and take precedence over global agents with the same name.';
        } else {
            tooltip += '\n\nGlobal agents are available from any workspace but are overridden by local agents with the same name.';
        }

        if (hasConflicts) {
            tooltip += '\n\n⚠️ Some agents have name conflicts with agents in the other location.';
        }

        return tooltip;
    }
}
