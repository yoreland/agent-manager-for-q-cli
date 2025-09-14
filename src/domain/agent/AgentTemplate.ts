export interface AgentTemplate {
    name: string;
    description?: string;
    prompt?: string;
    tools?: string[];
    allowedTools?: string[];
    resources?: string[];
    mcpServers?: Record<string, any>;
    toolsSettings?: Record<string, any>;
}

export const BUILT_IN_TEMPLATES: AgentTemplate[] = [
    {
        name: 'basic',
        description: 'Basic agent template',
        tools: ['filesystem', 'terminal'],
        allowedTools: ['filesystem', 'terminal']
    },
    {
        name: 'developer',
        description: 'Developer-focused agent template',
        tools: ['filesystem', 'terminal', 'git', 'npm'],
        allowedTools: ['filesystem', 'terminal', 'git', 'npm'],
        resources: ['src/**/*', 'package.json', 'README.md']
    },
    {
        name: 'documentation',
        description: 'Documentation writing agent template',
        tools: ['filesystem'],
        allowedTools: ['filesystem'],
        resources: ['docs/**/*', '*.md', 'README.md']
    }
];
