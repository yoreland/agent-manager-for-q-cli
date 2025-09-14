import { AgentConfig } from './Agent';

export class AgentConfigBuilder {
    private config: Partial<AgentConfig> = {};

    static create(name: string): AgentConfigBuilder {
        const builder = new AgentConfigBuilder();
        builder.config = {
            $schema: 'https://json.schemastore.org/amazon-q-developer-cli-agent.json',
            name,
            description: '',
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
        return builder;
    }

    withDescription(description: string): AgentConfigBuilder {
        this.config.description = description;
        return this;
    }

    withPrompt(prompt: string | null): AgentConfigBuilder {
        this.config.prompt = prompt;
        return this;
    }

    withTools(tools: string[]): AgentConfigBuilder {
        this.config.tools = [...tools];
        return this;
    }

    withAllowedTools(allowedTools: string[]): AgentConfigBuilder {
        this.config.allowedTools = [...allowedTools];
        return this;
    }

    withResources(resources: string[]): AgentConfigBuilder {
        this.config.resources = [...resources];
        return this;
    }

    withMcpServers(mcpServers: Record<string, any>): AgentConfigBuilder {
        this.config.mcpServers = { ...mcpServers };
        return this;
    }

    withToolAliases(toolAliases: Record<string, string>): AgentConfigBuilder {
        this.config.toolAliases = { ...toolAliases };
        return this;
    }

    withHooks(hooks: Record<string, any>): AgentConfigBuilder {
        this.config.hooks = { ...hooks };
        return this;
    }

    withToolsSettings(toolsSettings: Record<string, any>): AgentConfigBuilder {
        this.config.toolsSettings = { ...toolsSettings };
        return this;
    }

    withLegacyMcpJson(useLegacyMcpJson: boolean): AgentConfigBuilder {
        this.config.useLegacyMcpJson = useLegacyMcpJson;
        return this;
    }

    build(): AgentConfig {
        if (!this.config.name) {
            throw new Error('Agent name is required');
        }

        return {
            $schema: this.config.$schema!,
            name: this.config.name,
            description: this.config.description || '',
            prompt: this.config.prompt || null,
            mcpServers: this.config.mcpServers || {},
            tools: this.config.tools || [],
            toolAliases: this.config.toolAliases || {},
            allowedTools: this.config.allowedTools || [],
            resources: this.config.resources || [],
            hooks: this.config.hooks || {},
            toolsSettings: this.config.toolsSettings || {},
            useLegacyMcpJson: this.config.useLegacyMcpJson || false
        };
    }
}
