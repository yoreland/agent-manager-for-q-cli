import { ConfigurationValidator } from '../../../shared/validation/ConfigurationValidator';

describe('ConfigurationValidator Integration', () => {
    const validConfig = {
        $schema: 'https://example.com/schema.json',
        name: 'test-agent',
        description: 'Test agent description',
        prompt: 'Test prompt',
        tools: ['tool1', 'tool2'],
        allowedTools: ['tool1', 'tool2', 'tool3'],
        resources: ['file://test.txt'],
        mcpServers: {
            server1: { command: 'test' }
        },
        toolAliases: {
            alias1: 'tool1'
        },
        hooks: {},
        toolsSettings: {},
        useLegacyMcpJson: false
    };

    describe('validateAgentConfig', () => {
        it('should validate a complete valid configuration', () => {
            const result = ConfigurationValidator.validateAgentConfig(validConfig);

            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data.name).toBe('test-agent');
                expect(result.data.description).toBe('Test agent description');
                expect(result.data.tools).toEqual(['tool1', 'tool2']);
            }
        });

        it('should reject invalid configuration object', () => {
            const result = ConfigurationValidator.validateAgentConfig('not an object');

            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error.message).toContain('must be an object');
            }
        });

        it('should reject missing required fields', () => {
            const invalidConfig = {
                $schema: 'https://example.com/schema.json'
                // missing name and description
            };

            const result = ConfigurationValidator.validateAgentConfig(invalidConfig);

            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error.message).toContain('name is required');
                expect(result.error.message).toContain('description is required');
            }
        });

        it('should reject invalid agent name', () => {
            const invalidConfig = {
                ...validConfig,
                name: 'invalid name with spaces!'
            };

            const result = ConfigurationValidator.validateAgentConfig(invalidConfig);

            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error.message).toContain('can only contain letters, numbers, hyphens, and underscores');
            }
        });

        it('should reject invalid tools array', () => {
            const invalidConfig = {
                ...validConfig,
                tools: ['valid-tool', 123, 'another-tool']
            };

            const result = ConfigurationValidator.validateAgentConfig(invalidConfig);

            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error.message).toContain('All tools must be strings');
            }
        });

        it('should reject duplicate tools', () => {
            const invalidConfig = {
                ...validConfig,
                tools: ['tool1', 'tool2', 'tool1']
            };

            const result = ConfigurationValidator.validateAgentConfig(invalidConfig);

            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error.message).toContain('Duplicate tools are not allowed');
            }
        });

        it('should handle null prompt', () => {
            const configWithNullPrompt = {
                ...validConfig,
                prompt: null
            };

            const result = ConfigurationValidator.validateAgentConfig(configWithNullPrompt);

            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data.prompt).toBeNull();
            }
        });
    });

    describe('validatePartialAgentConfig', () => {
        it('should validate partial configuration', () => {
            const partialConfig = {
                name: 'updated-agent',
                description: 'Updated description'
            };

            const result = ConfigurationValidator.validatePartialAgentConfig(partialConfig);

            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data.name).toBe('updated-agent');
                expect(result.data.description).toBe('Updated description');
                expect(result.data.tools).toBeUndefined();
            }
        });

        it('should reject invalid partial fields', () => {
            const partialConfig = {
                name: 'invalid name!',
                tools: ['valid-tool', 123]
            };

            const result = ConfigurationValidator.validatePartialAgentConfig(partialConfig);

            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error.message).toContain('can only contain letters, numbers, hyphens, and underscores');
                expect(result.error.message).toContain('All tools must be strings');
            }
        });
    });

    describe('validateConfigurationFile', () => {
        it('should validate JSON configuration file', () => {
            const jsonContent = JSON.stringify(validConfig);

            const result = ConfigurationValidator.validateConfigurationFile(jsonContent);

            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data.name).toBe('test-agent');
            }
        });

        it('should reject invalid JSON', () => {
            const invalidJson = '{ "name": "test", invalid json }';

            const result = ConfigurationValidator.validateConfigurationFile(invalidJson);

            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error.message).toContain('must be valid JSON');
            }
        });

        it('should reject valid JSON with invalid configuration', () => {
            const invalidConfig = JSON.stringify({
                name: 'invalid name!'
            });

            const result = ConfigurationValidator.validateConfigurationFile(invalidConfig);

            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error.message).toContain('Configuration validation failed');
            }
        });
    });

    describe('getValidationSummary', () => {
        it('should provide validation summary for valid config', () => {
            const summary = ConfigurationValidator.getValidationSummary(validConfig);

            expect(summary.isValid).toBe(true);
            expect(summary.errors).toHaveLength(0);
            expect(summary.warnings).toHaveLength(0);
        });

        it('should provide validation summary for invalid config', () => {
            const invalidConfig = {
                name: 'invalid name!'
            };

            const summary = ConfigurationValidator.getValidationSummary(invalidConfig);

            expect(summary.isValid).toBe(false);
            expect(summary.errors.length).toBeGreaterThan(0);
        });

        it('should provide warnings for incomplete config', () => {
            const incompleteConfig = {
                ...validConfig,
                tools: [],
                resources: [],
                description: ''
            };

            const summary = ConfigurationValidator.getValidationSummary(incompleteConfig);

            expect(summary.warnings).toContain('No tools specified - agent may have limited functionality');
            expect(summary.warnings).toContain('No resources specified - agent will have no context');
            expect(summary.warnings).toContain('Missing or empty description');
        });
    });
});
