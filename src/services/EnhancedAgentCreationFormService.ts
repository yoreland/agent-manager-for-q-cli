import { AgentFormData, BuiltInTool, FormValidationResult, AgentCreationResult, ToolSection } from '../types/agentCreation';
import { AgentLocation } from '../types/agent';
import { ExperimentalToolsService } from '../core/agent/ExperimentalToolsService';
import { AgentLocationService } from '../core/agent/AgentLocationService';
import { AgentConflictResolver } from './AgentConflictResolver';
import { ILogger } from '../shared/infrastructure/ILogger';
import * as fs from 'fs/promises';

export class EnhancedAgentCreationFormService {
    private standardTools: BuiltInTool[] = [
        {
            name: 'fs_read',
            displayName: 'File System Read',
            description: 'Read files, directories, and images',
            category: 'filesystem',
            defaultAllowed: true
        },
        {
            name: 'fs_write',
            displayName: 'File System Write',
            description: 'Create and edit files',
            category: 'filesystem',
            defaultAllowed: false
        },
        {
            name: 'execute_bash',
            displayName: 'Execute Bash',
            description: 'Execute shell commands',
            category: 'execution',
            defaultAllowed: false
        },
        {
            name: 'use_aws',
            displayName: 'AWS CLI',
            description: 'Make AWS CLI API calls',
            category: 'aws',
            defaultAllowed: false
        },
        {
            name: 'introspect',
            displayName: 'Q CLI Information',
            description: 'Provide information about Q CLI capabilities',
            category: 'utility',
            defaultAllowed: true
        }
    ];

    constructor(
        private experimentalToolsService: ExperimentalToolsService,
        private agentLocationService: AgentLocationService,
        private conflictResolver: AgentConflictResolver,
        private logger: ILogger
    ) {}

    getDefaultFormData(): AgentFormData {
        return {
            name: '',
            description: '',
            prompt: '',
            location: AgentLocation.Local,
            tools: {
                available: [...this.standardTools.map(t => t.name)],
                allowed: this.standardTools.filter(t => t.defaultAllowed).map(t => t.name),
                experimental: []
            },
            resources: []
        };
    }

    getToolSections(): ToolSection[] {
        const experimentalTools = this.experimentalToolsService.getExperimentalTools();
        
        return [
            {
                title: 'Standard Tools',
                tools: this.standardTools,
                isExperimental: false
            },
            {
                title: 'Experimental Tools',
                tools: experimentalTools.map(tool => ({
                    name: tool.name,
                    displayName: tool.displayName,
                    description: tool.description,
                    category: 'experimental' as const,
                    defaultAllowed: false,
                    isExperimental: true
                })),
                isExperimental: true,
                warningMessage: this.experimentalToolsService.getWarningMessage()
            }
        ];
    }

    async validateFormData(data: AgentFormData): Promise<FormValidationResult> {
        const errors: { field: keyof AgentFormData; message: string }[] = [];
        const warnings: { field: keyof AgentFormData; message: string }[] = [];

        // Name validation
        if (!data.name || data.name.trim().length === 0) {
            errors.push({ field: 'name', message: 'Agent name is required' });
        } else if (!/^[a-zA-Z0-9_-]+$/.test(data.name)) {
            errors.push({ field: 'name', message: 'Agent name can only contain letters, numbers, hyphens, and underscores' });
        }

        // Location-specific validation
        if (data.location === AgentLocation.Global) {
            try {
                await this.agentLocationService.ensureDirectoryExists(AgentLocation.Global);
            } catch (error) {
                errors.push({ field: 'name', message: 'Cannot create global agent directory. Check permissions.' });
            }
        }

        // Conflict validation
        if (data.name) {
            const conflictInfo = await this.agentLocationService.detectNameConflicts(data.name);
            if (conflictInfo.hasConflict) {
                if (data.location === AgentLocation.Local && conflictInfo.localExists) {
                    errors.push({ field: 'name', message: `Local agent '${data.name}' already exists` });
                } else if (data.location === AgentLocation.Global && conflictInfo.globalExists) {
                    errors.push({ field: 'name', message: `Global agent '${data.name}' already exists` });
                } else if (conflictInfo.hasConflict) {
                    warnings.push({ field: 'name', message: `Agent '${data.name}' exists in other location. ${data.location === AgentLocation.Local ? 'Local will take precedence.' : 'Local version will take precedence.'}` });
                }
            }
        }

        // Experimental tools validation
        if (data.tools.experimental.length > 0) {
            warnings.push({ 
                field: 'tools', 
                message: `Selected ${data.tools.experimental.length} experimental tool(s). These features may change or be removed.` 
            });
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings
        };
    }

    async createAgentFromFormData(data: AgentFormData): Promise<AgentCreationResult> {
        try {
            // Validate first
            const validation = await this.validateFormData(data);
            if (!validation.isValid) {
                return {
                    success: false,
                    error: validation.errors.map(e => e.message).join(', ')
                };
            }

            // Handle conflicts if any
            const resolution = await this.conflictResolver.resolveConflictForCreation(data.name, data.location);
            if (resolution.action === 'cancel') {
                return { success: false, error: 'Agent creation cancelled' };
            }

            const finalName = resolution.newName || data.name;
            const finalLocation = resolution.action === 'use_global' ? AgentLocation.Global : AgentLocation.Local;

            // Ensure directory exists
            await this.agentLocationService.ensureDirectoryExists(finalLocation);

            // Create agent configuration
            const config = this.buildAgentConfig(data, finalName);
            const agentPath = this.agentLocationService.resolveAgentPath(finalName, finalLocation);

            await fs.writeFile(agentPath, JSON.stringify(config, null, 2));

            this.logger.info(`Created ${finalLocation} agent: ${finalName}`);

            return {
                success: true,
                agentPath,
                location: finalLocation
            };

        } catch (error) {
            this.logger.error('Failed to create agent', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error occurred'
            };
        }
    }

    private buildAgentConfig(data: AgentFormData, name: string): any {
        const allTools = [...data.tools.available, ...data.tools.experimental];
        
        return {
            $schema: 'https://raw.githubusercontent.com/aws/amazon-q-developer-cli/refs/heads/main/schemas/agent-v1.json',
            name,
            description: data.description || 'Custom Q CLI Agent',
            prompt: data.prompt || null,
            mcpServers: {},
            tools: allTools,
            toolAliases: {},
            allowedTools: data.tools.allowed,
            resources: data.resources,
            hooks: {},
            toolsSettings: {},
            useLegacyMcpJson: true
        };
    }

    getExperimentalToolInfo(toolName: string) {
        return this.experimentalToolsService.getExperimentalToolInfo(toolName);
    }

    async validateLocation(location: AgentLocation): Promise<{ isValid: boolean; message?: string }> {
        try {
            if (location === AgentLocation.Global) {
                await this.agentLocationService.ensureDirectoryExists(AgentLocation.Global);
            }
            return { isValid: true };
        } catch (error) {
            return {
                isValid: false,
                message: `Cannot access ${location} agent directory. Check permissions.`
            };
        }
    }
}
