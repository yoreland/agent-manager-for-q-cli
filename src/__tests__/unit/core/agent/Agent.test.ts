import { Agent, AgentConfig } from '../../../../core/agent/Agent';

describe('Agent', () => {
    const mockConfig: AgentConfig = {
        $schema: 'https://json.schemastore.org/amazon-q-developer-cli-agent.json',
        name: 'test-agent',
        description: 'Test agent description',
        prompt: null,
        mcpServers: {},
        tools: ['filesystem'],
        toolAliases: {},
        allowedTools: ['filesystem'],
        resources: [],
        hooks: {},
        toolsSettings: {},
        useLegacyMcpJson: false
    };

    describe('constructor', () => {
        it('should create agent with valid properties', () => {
            const agent = new Agent('test-agent', mockConfig, '/path/to/agent.json');

            expect(agent.name).toBe('test-agent');
            expect(agent.config).toBe(mockConfig);
            expect(agent.filePath).toBe('/path/to/agent.json');
        });
    });

    describe('validate', () => {
        it('should return valid for correct agent', () => {
            const agent = new Agent('test-agent', mockConfig, '/path/to/agent.json');

            const result = agent.validate();

            expect(result.isValid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        it('should return invalid for empty name', () => {
            const invalidConfig = { ...mockConfig, name: '' };
            const agent = new Agent('', invalidConfig, '/path/to/agent.json');

            const result = agent.validate();

            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('Agent name is required');
        });

        it('should return invalid for mismatched names', () => {
            const invalidConfig = { ...mockConfig, name: 'different-name' };
            const agent = new Agent('test-agent', invalidConfig, '/path/to/agent.json');

            const result = agent.validate();

            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('Agent name must match config name');
        });

        it('should return invalid for empty description', () => {
            const invalidConfig = { ...mockConfig, description: '' };
            const agent = new Agent('test-agent', invalidConfig, '/path/to/agent.json');

            const result = agent.validate();

            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('Agent description is required');
        });
    });

    describe('updateConfig', () => {
        it('should return new agent with updated config', () => {
            const agent = new Agent('test-agent', mockConfig, '/path/to/agent.json');
            const updates = { description: 'Updated description' };

            const updatedAgent = agent.updateConfig(updates);

            expect(updatedAgent).not.toBe(agent);
            expect(updatedAgent.config.description).toBe('Updated description');
            expect(updatedAgent.name).toBe(agent.name);
            expect(updatedAgent.filePath).toBe(agent.filePath);
        });
    });

    describe('create', () => {
        it('should create valid agent with default config', () => {
            const result = Agent.create('test-agent', '/path/to/agent.json');

            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data.name).toBe('test-agent');
                expect(result.data.config.name).toBe('test-agent');
                expect(result.data.filePath).toBe('/path/to/agent.json');
            }
        });

        it('should create agent with custom config', () => {
            const customConfig = { description: 'Custom description' };
            const result = Agent.create('test-agent', '/path/to/agent.json', customConfig);

            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data.config.description).toBe('Custom description');
            }
        });

        it('should fail for empty name', () => {
            const result = Agent.create('', '/path/to/agent.json');

            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error.message).toBe('Agent name is required');
            }
        });

        it('should fail for invalid config', () => {
            const invalidConfig = { description: '' };
            const result = Agent.create('test-agent', '/path/to/agent.json', invalidConfig);

            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error.message).toContain('Invalid agent');
            }
        });
    });
});
