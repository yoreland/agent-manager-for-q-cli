import { AgentConfigBuilder } from '../../../../core/agent/AgentConfigBuilder';

describe('AgentConfigBuilder', () => {
    describe('create', () => {
        it('should create builder with default config', () => {
            const builder = AgentConfigBuilder.create('test-agent');
            const config = builder.build();

            expect(config.name).toBe('test-agent');
            expect(config.$schema).toBe('https://json.schemastore.org/amazon-q-developer-cli-agent.json');
            expect(config.description).toBe('');
            expect(config.tools).toEqual([]);
            expect(config.allowedTools).toEqual([]);
            expect(config.resources).toEqual([]);
        });
    });

    describe('builder methods', () => {
        let builder: AgentConfigBuilder;

        beforeEach(() => {
            builder = AgentConfigBuilder.create('test-agent');
        });

        it('should set description', () => {
            const config = builder
                .withDescription('Test description')
                .build();

            expect(config.description).toBe('Test description');
        });

        it('should set prompt', () => {
            const config = builder
                .withPrompt('Test prompt')
                .build();

            expect(config.prompt).toBe('Test prompt');
        });

        it('should set tools', () => {
            const tools = ['filesystem', 'terminal'];
            const config = builder
                .withTools(tools)
                .build();

            expect(config.tools).toEqual(tools);
            expect(config.tools).not.toBe(tools); // Should be a copy
        });

        it('should set allowed tools', () => {
            const allowedTools = ['filesystem'];
            const config = builder
                .withAllowedTools(allowedTools)
                .build();

            expect(config.allowedTools).toEqual(allowedTools);
        });

        it('should set resources', () => {
            const resources = ['src/**/*', 'package.json'];
            const config = builder
                .withResources(resources)
                .build();

            expect(config.resources).toEqual(resources);
        });

        it('should set MCP servers', () => {
            const mcpServers = { server1: { command: 'test' } };
            const config = builder
                .withMcpServers(mcpServers)
                .build();

            expect(config.mcpServers).toEqual(mcpServers);
            expect(config.mcpServers).not.toBe(mcpServers); // Should be a copy
        });

        it('should set tool aliases', () => {
            const toolAliases = { fs: 'filesystem' };
            const config = builder
                .withToolAliases(toolAliases)
                .build();

            expect(config.toolAliases).toEqual(toolAliases);
        });

        it('should set hooks', () => {
            const hooks = { preRun: 'echo "starting"' };
            const config = builder
                .withHooks(hooks)
                .build();

            expect(config.hooks).toEqual(hooks);
        });

        it('should set tools settings', () => {
            const toolsSettings = { filesystem: { maxFiles: 100 } };
            const config = builder
                .withToolsSettings(toolsSettings)
                .build();

            expect(config.toolsSettings).toEqual(toolsSettings);
        });

        it('should set legacy MCP JSON flag', () => {
            const config = builder
                .withLegacyMcpJson(true)
                .build();

            expect(config.useLegacyMcpJson).toBe(true);
        });

        it('should chain methods', () => {
            const config = builder
                .withDescription('Chained description')
                .withTools(['filesystem'])
                .withAllowedTools(['filesystem'])
                .withPrompt('Chained prompt')
                .build();

            expect(config.description).toBe('Chained description');
            expect(config.tools).toEqual(['filesystem']);
            expect(config.allowedTools).toEqual(['filesystem']);
            expect(config.prompt).toBe('Chained prompt');
        });
    });

    describe('build', () => {
        it('should throw error if name is missing', () => {
            const builder = new (AgentConfigBuilder as any)();
            builder.config = {}; // Empty config without name

            expect(() => builder.build()).toThrow('Agent name is required');
        });
    });
});
