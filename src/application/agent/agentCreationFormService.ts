import { AgentFormData, BuiltInTool, FormValidationResult, AgentCreationResult, ToolSection } from '../../shared/types/agentCreation';
import { AgentLocation } from '../../domain/agent/AgentLocationService';
import { ExtensionLogger } from '../shared/logger';
import { ExperimentalToolsService, IExperimentalToolsService } from '../../domain/agent/ExperimentalToolsService';
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export interface IAgentCreationFormService {
    getDefaultFormData(): AgentFormData;
    validateFormData(data: AgentFormData): FormValidationResult;
    createAgentFromFormData(data: AgentFormData, location?: AgentLocation): Promise<AgentCreationResult>;
    getAvailableTools(): BuiltInTool[];
    getToolSections(): ToolSection[];
}

const BUILT_IN_TOOLS: BuiltInTool[] = [
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
        name: 'knowledge',
        displayName: 'Knowledge Base',
        description: 'Store and retrieve information across sessions',
        category: 'experimental',
        defaultAllowed: false,
        isExperimental: true
    },
    {
        name: 'thinking',
        displayName: 'Thinking',
        description: 'Internal reasoning mechanism',
        category: 'experimental',
        defaultAllowed: false,
        isExperimental: true
    },
    {
        name: 'todo_list',
        displayName: 'TODO List',
        description: 'Create and manage TODO lists',
        category: 'experimental',
        defaultAllowed: false,
        isExperimental: true
    },
    {
        name: 'introspect',
        displayName: 'Introspect',
        description: 'Q CLI capabilities and documentation',
        category: 'utility',
        defaultAllowed: false
    },
    {
        name: 'report_issue',
        displayName: 'Report Issue',
        description: 'Open GitHub issue template',
        category: 'utility',
        defaultAllowed: false
    }
];

export class AgentCreationFormService implements IAgentCreationFormService {
    private experimentalToolsService: IExperimentalToolsService;
    
    constructor(private readonly logger: ExtensionLogger) {
        this.experimentalToolsService = new ExperimentalToolsService();
    }

    getDefaultFormData(): AgentFormData {
        return {
            name: '',
            description: '',
            prompt: '',
            location: 'local' as AgentLocation,
            tools: {
                available: BUILT_IN_TOOLS.map(tool => tool.name),
                allowed: BUILT_IN_TOOLS.filter(tool => tool.defaultAllowed).map(tool => tool.name),
                experimental: []
            },
            resources: [
                'file://AmazonQ.md',
                'file://README.md',
                'file://.amazonq/rules/**/*.md'
            ]
        };
    }

    validateFormData(data: AgentFormData): FormValidationResult {
        const errors: FormValidationResult['errors'] = [];
        const warnings: FormValidationResult['warnings'] = [];

        // Validate name
        if (!data.name.trim()) {
            errors.push({ field: 'name', message: 'Agent name is required' });
        } else if (!/^[a-zA-Z0-9_-]+$/.test(data.name)) {
            errors.push({ field: 'name', message: 'Agent name can only contain letters, numbers, hyphens, and underscores' });
        } else {
            // Check if agent already exists
            const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
            if (workspaceFolder) {
                const agentPath = path.join(workspaceFolder.uri.fsPath, '.amazonq', 'cli-agents', `${data.name}.json`);
                if (fs.existsSync(agentPath)) {
                    errors.push({ field: 'name', message: `Agent "${data.name}" already exists` });
                }
            }
        }

        // Validate tools
        data.tools.allowed.forEach(allowedTool => {
            if (!data.tools.available.includes(allowedTool)) {
                errors.push({ field: 'tools', message: `Allowed tool "${allowedTool}" must be in available tools` });
            }
        });

        // Validate resources
        const seenResources = new Set<string>();
        data.resources.forEach((resource, index) => {
            if (!resource.startsWith('file://')) {
                errors.push({ field: 'resources', message: `Resource ${index + 1} must start with "file://"` });
            }
            if (seenResources.has(resource)) {
                warnings.push({ field: 'resources', message: `Duplicate resource: ${resource}` });
            }
            seenResources.add(resource);
        });

        return {
            isValid: errors.length === 0,
            errors,
            warnings
        };
    }

    async createAgentFromFormData(data: AgentFormData, location: AgentLocation = AgentLocation.Local): Promise<AgentCreationResult> {
        try {
            this.logger.info('Creating agent from form data', { name: data.name, location });
            
            // Get workspace folder
            const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
            if (!workspaceFolder) {
                throw new Error('No workspace folder found');
            }
            
            // Determine target directory based on location
            let agentDirectory: string;
            if (location === AgentLocation.Global) {
                const os = require('os');
                agentDirectory = path.join(os.homedir(), '.aws', 'amazonq', 'cli-agents');
            } else {
                agentDirectory = path.join(workspaceFolder.uri.fsPath, '.amazonq', 'cli-agents');
            }
            
            // Ensure directory exists
            await fs.promises.mkdir(agentDirectory, { recursive: true });
            
            // Create agent configuration
            const agentConfig = {
                $schema: "https://raw.githubusercontent.com/aws/amazon-q-developer-cli/refs/heads/main/schemas/agent-v1.json",
                name: data.name,
                description: data.description,
                prompt: data.prompt,
                mcpServers: {},
                tools: data.tools.available,
                toolAliases: {},
                allowedTools: data.tools.allowed,
                toolsSettings: {},
                resources: data.resources,
                hooks: {},
                useLegacyMcpJson: true
            };
            
            // Agent directory is already determined and created above
            
            // Create agent file
            const agentPath = path.join(agentDirectory, `${data.name}.json`);
            
            // Check if agent already exists
            if (fs.existsSync(agentPath)) {
                throw new Error(`Agent "${data.name}" already exists in ${location} location`);
            }
            
            // Write agent configuration
            fs.writeFileSync(agentPath, JSON.stringify(agentConfig, null, 2));
            
            this.logger.info('Agent created successfully', { agentPath });
            
            // Refresh tree view
            await vscode.commands.executeCommand('qcli-agents.refreshTree');
            
            return {
                success: true,
                agentPath: path.relative(workspaceFolder.uri.fsPath, agentPath)
            };
        } catch (error) {
            this.logger.error('Failed to create agent', error as Error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }

    getAvailableTools(): BuiltInTool[] {
        return [...BUILT_IN_TOOLS];
    }

    getToolSections(): ToolSection[] {
        const standardTools = BUILT_IN_TOOLS.filter(tool => !tool.isExperimental);
        const experimentalTools = BUILT_IN_TOOLS.filter(tool => tool.isExperimental);

        return [
            {
                title: 'Standard Tools',
                tools: standardTools,
                isExperimental: false
            },
            {
                title: 'Experimental Tools',
                tools: experimentalTools,
                isExperimental: true,
                warningMessage: this.experimentalToolsService.getWarningMessage()
            }
        ];
    }
}
