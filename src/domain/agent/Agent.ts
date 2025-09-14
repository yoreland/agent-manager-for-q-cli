import { Result, success, failure } from '../../shared/errors/result';

export class Agent {
    constructor(
        public readonly name: string,
        public readonly config: AgentConfig,
        public readonly filePath: string
    ) {}

    validate(): ValidationResult {
        const errors: string[] = [];

        if (!this.name || this.name.trim().length === 0) {
            errors.push('Agent name is required');
        }

        if (this.name !== this.config.name) {
            errors.push('Agent name must match config name');
        }

        if (!this.config.description || this.config.description.trim().length === 0) {
            errors.push('Agent description is required');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    updateConfig(updates: Partial<AgentConfig>): Agent {
        const newConfig = { ...this.config, ...updates };
        return new Agent(this.name, newConfig, this.filePath);
    }

    static create(name: string, filePath: string, config?: Partial<AgentConfig>): Result<Agent> {
        if (!name || name.trim().length === 0) {
            return failure(new Error('Agent name is required'));
        }

        const defaultConfig: AgentConfig = {
            $schema: 'https://json.schemastore.org/amazon-q-developer-cli-agent.json',
            name,
            description: `${name} agent`,
            prompt: null,
            mcpServers: {},
            tools: [],
            toolAliases: {},
            allowedTools: [],
            resources: [],
            hooks: {},
            toolsSettings: {},
            useLegacyMcpJson: false
        };

        const finalConfig = { ...defaultConfig, ...config, name };
        const agent = new Agent(name, finalConfig, filePath);
        
        const validation = agent.validate();
        if (!validation.isValid) {
            return failure(new Error(`Invalid agent: ${validation.errors.join(', ')}`));
        }

        return success(agent);
    }
}

export interface AgentConfig {
    $schema: string;
    name: string;
    description: string;
    prompt: string | null;
    mcpServers: Record<string, any>;
    tools: string[];
    toolAliases: Record<string, string>;
    allowedTools: string[];
    resources: string[];
    hooks: Record<string, any>;
    toolsSettings: Record<string, any>;
    useLegacyMcpJson: boolean;
}

export interface ValidationResult {
    isValid: boolean;
    errors: string[];
}
