export interface ExperimentalTool {
    name: string;
    displayName: string;
    description: string;
    isExperimental: true;
    warningLevel: 'info' | 'warning' | 'caution';
    stabilityNote: string;
    features: string[];
    usage?: string[];
}

export interface IExperimentalToolsService {
    getExperimentalTools(): ExperimentalTool[];
    isExperimentalTool(toolName: string): boolean;
    getExperimentalToolInfo(toolName: string): ExperimentalTool | null;
    getWarningMessage(): string;
}

export class ExperimentalToolsService implements IExperimentalToolsService {
    private readonly experimentalTools: ExperimentalTool[] = [
        {
            name: 'knowledge',
            displayName: 'Knowledge Base',
            description: 'Store and retrieve information across chat sessions with semantic search',
            isExperimental: true,
            warningLevel: 'warning',
            stabilityNote: 'Persistent context storage feature in active development',
            features: [
                'Semantic search capabilities',
                'Persistent knowledge base across sessions',
                'File and directory indexing',
                'Context retrieval optimization'
            ],
            usage: [
                '/knowledge add <path>',
                '/knowledge show',
                '/knowledge search <query>',
                '/knowledge remove <path>'
            ]
        },
        {
            name: 'thinking',
            displayName: 'Thinking Process',
            description: 'Internal reasoning mechanism for complex multi-step problems',
            isExperimental: true,
            warningLevel: 'info',
            stabilityNote: 'Reasoning transparency feature may change behavior',
            features: [
                'Step-by-step reasoning display',
                'Complex problem breakdown',
                'Decision-making transparency',
                'Debugging assistance'
            ]
        },
        {
            name: 'todo_list',
            displayName: 'TODO List Manager',
            description: 'Create and manage TODO lists for tracking multi-step tasks',
            isExperimental: true,
            warningLevel: 'caution',
            stabilityNote: 'Task management interface under active development',
            features: [
                'Multi-step task tracking',
                'Task completion monitoring',
                'Context preservation',
                'Progress visualization'
            ],
            usage: [
                'create - Create new TODO list',
                'complete - Mark tasks as completed',
                'add - Add new tasks',
                'remove - Remove tasks'
            ]
        }
    ];

    getExperimentalTools(): ExperimentalTool[] {
        return [...this.experimentalTools];
    }

    isExperimentalTool(toolName: string): boolean {
        return this.experimentalTools.some(tool => tool.name === toolName);
    }

    getExperimentalToolInfo(toolName: string): ExperimentalTool | null {
        return this.experimentalTools.find(tool => tool.name === toolName) || null;
    }

    getWarningMessage(): string {
        return 'Experimental features are in active development and may change or be removed at any time. Use with caution in production workflows.';
    }
}
