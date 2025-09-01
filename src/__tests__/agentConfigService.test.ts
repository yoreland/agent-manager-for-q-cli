import * as fs from 'fs/promises';
import * as path from 'path';
import * as vscode from 'vscode';
import { AgentConfigService } from '../services/agentConfigService';
import { ExtensionLogger } from '../services/logger';
import { 
    AgentConfig, 
    DEFAULT_AGENT_CONFIG, 
    AGENT_CONSTANTS 
} from '../types/agent';

// Mock VS Code API
jest.mock('vscode', () => ({
    workspace: {
        workspaceFolders: [{
            uri: {
                fsPath: '/test/workspace'
            }
        }]
    },
    window: {
        createOutputChannel: jest.fn(() => ({
            appendLine: jest.fn(),
            show: jest.fn(),
            clear: jest.fn()
        }))
    },
    ThemeIcon: jest.fn().mockImplementation((id: string) => ({ id }))
}));

// Mock fs/promises
jest.mock('fs/promises');
const mockFs = fs as jest.Mocked<typeof fs>;

describe('AgentConfigService', () => {
    let service: AgentConfigService;
    let mockLogger: jest.Mocked<ExtensionLogger>;
    const testWorkspacePath = '/test/workspace';
    const testAgentDirectory = path.join(testWorkspacePath, AGENT_CONSTANTS.AGENT_DIRECTORY);

    beforeEach(() => {
        // Reset all mocks
        jest.clearAllMocks();

        // Ensure workspace folders are available
        (vscode.workspace as any).workspaceFolders = [{
            uri: {
                fsPath: testWorkspacePath
            }
        }];

        // Create mock logger
        mockLogger = {
            debug: jest.fn(),
            info: jest.fn(),
            warn: jest.fn(),
            error: jest.fn(),
            setLogLevel: jest.fn(),
            getLogLevel: jest.fn(),
            setDebugMode: jest.fn(),
            isDebugMode: jest.fn(),
            show: jest.fn(),
            clear: jest.fn(),
            logTiming: jest.fn(),
            logLifecycle: jest.fn(),
            logUserAction: jest.fn()
        } as any;

        const mockErrorHandler = {
            handleFileSystemError: jest.fn(),
            showErrorMessage: jest.fn(),
            showWarningMessage: jest.fn(),
            handleValidationError: jest.fn()
        } as any;

        service = new AgentConfigService(mockLogger, mockErrorHandler);
    });

    describe('constructor', () => {
        it('should initialize with workspace root', () => {
            expect(service.getAgentDirectory()).toBe(testAgentDirectory);
            expect(mockLogger.debug).toHaveBeenCalledWith('AgentConfigService initialized', {
                workspaceRoot: testWorkspacePath,
                agentDirectory: testAgentDirectory
            });
        });

        it('should throw error when no workspace folder exists', () => {
            (vscode.workspace as any).workspaceFolders = null;
            
            const mockErrorHandler = {
                handleFileSystemError: jest.fn(),
                showErrorMessage: jest.fn(),
                showWarningMessage: jest.fn(),
                handleValidationError: jest.fn()
            } as any;
            
            expect(() => new AgentConfigService(mockLogger, mockErrorHandler)).toThrow(
                'No workspace folder found. Agent management requires an open workspace.'
            );
        });
    });

    describe('ensureAgentDirectory', () => {
        it('should not create directory if it already exists', async () => {
            mockFs.access.mockResolvedValue(undefined);

            await service.ensureAgentDirectory();

            expect(mockFs.access).toHaveBeenCalledWith(testAgentDirectory);
            expect(mockFs.mkdir).not.toHaveBeenCalled();
            expect(mockLogger.debug).toHaveBeenCalledWith('Agent directory already exists', {
                path: testAgentDirectory
            });
        });

        it('should create directory if it does not exist', async () => {
            mockFs.access.mockRejectedValue(new Error('ENOENT'));
            mockFs.mkdir.mockResolvedValue(undefined);

            await service.ensureAgentDirectory();

            expect(mockFs.access).toHaveBeenCalledWith(testAgentDirectory);
            expect(mockFs.mkdir).toHaveBeenCalledWith(testAgentDirectory, { recursive: true });
            expect(mockLogger.info).toHaveBeenCalledWith('Creating agent directory', {
                path: testAgentDirectory
            });
            expect(mockLogger.info).toHaveBeenCalledWith('Agent directory created successfully');
        });

        it('should throw error if directory creation fails', async () => {
            const createError = new Error('Permission denied');
            mockFs.access.mockRejectedValue(new Error('ENOENT'));
            mockFs.mkdir.mockRejectedValue(createError);

            await expect(service.ensureAgentDirectory()).rejects.toThrow(
                `Failed to create agent directory: ${testAgentDirectory}. Permission denied`
            );

            expect(mockLogger.error).toHaveBeenCalledWith(
                `Failed to create agent directory: ${testAgentDirectory}`,
                createError
            );
        });
    });

    describe('scanAgentFiles', () => {
        it('should return agent files from directory', async () => {
            mockFs.access.mockResolvedValue(undefined);
            mockFs.readdir.mockResolvedValue(['agent1.json', 'agent2.json', 'other.txt'] as any);

            const result = await service.scanAgentFiles();

            expect(result).toEqual([
                path.join(testAgentDirectory, 'agent1.json'),
                path.join(testAgentDirectory, 'agent2.json')
            ]);
            expect(mockLogger.debug).toHaveBeenCalledWith('Scanned agent files', {
                directory: testAgentDirectory,
                fileCount: 2,
                files: result
            });
        });

        it('should handle empty directory', async () => {
            mockFs.access.mockResolvedValue(undefined);
            mockFs.readdir.mockResolvedValue([] as any);

            const result = await service.scanAgentFiles();

            expect(result).toEqual([]);
        });

        it('should throw error if scanning fails', async () => {
            const scanError = new Error('Permission denied');
            mockFs.access.mockResolvedValue(undefined);
            mockFs.readdir.mockRejectedValue(scanError);

            await expect(service.scanAgentFiles()).rejects.toThrow(
                'Failed to scan agent files: Permission denied'
            );
            expect(mockLogger.error).toHaveBeenCalledWith('Failed to scan agent files', scanError);
        });
    });

    describe('readAgentConfig', () => {
        const testFilePath = path.join(testAgentDirectory, 'test-agent.json');
        const validConfig: AgentConfig = {
            ...DEFAULT_AGENT_CONFIG,
            name: 'test-agent'
        };

        it('should read and parse valid agent config', async () => {
            mockFs.readFile.mockResolvedValue(JSON.stringify(validConfig));

            const result = await service.readAgentConfig(testFilePath);

            expect(result).toEqual(validConfig);
            expect(mockLogger.debug).toHaveBeenCalledWith('Reading agent config file', {
                filePath: testFilePath
            });
            expect(mockLogger.debug).toHaveBeenCalledWith('Agent config read successfully', {
                filePath: testFilePath,
                agentName: 'test-agent'
            });
        });

        it('should throw error for invalid JSON', async () => {
            mockFs.readFile.mockResolvedValue('invalid json');

            await expect(service.readAgentConfig(testFilePath)).rejects.toThrow(
                `Invalid JSON in agent configuration file: ${testFilePath}. Please check the JSON syntax.`
            );
        });

        it('should throw error for invalid config structure', async () => {
            const invalidConfig = { ...validConfig, name: '' };
            mockFs.readFile.mockResolvedValue(JSON.stringify(invalidConfig));

            await expect(service.readAgentConfig(testFilePath)).rejects.toThrow(
                `Invalid agent configuration in ${testFilePath}`
            );
        });

        it('should throw error if file reading fails', async () => {
            const readError = new Error('File not found');
            mockFs.readFile.mockRejectedValue(readError);

            await expect(service.readAgentConfig(testFilePath)).rejects.toThrow(
                `Failed to read agent configuration: ${testFilePath}: File not found`
            );
        });
    });

    describe('writeAgentConfig', () => {
        const testName = 'test-agent';
        const testConfig: AgentConfig = {
            ...DEFAULT_AGENT_CONFIG,
            name: testName
        };

        beforeEach(() => {
            mockFs.access.mockResolvedValue(undefined);
            mockFs.mkdir.mockResolvedValue(undefined);
            mockFs.writeFile.mockResolvedValue(undefined);
        });

        it('should write valid agent config', async () => {
            // Mock that agent doesn't exist
            mockFs.access.mockRejectedValueOnce(new Error('ENOENT'));

            await service.writeAgentConfig(testName, testConfig);

            const expectedFilePath = path.join(testAgentDirectory, `${testName}.json`);
            const expectedContent = JSON.stringify(testConfig, null, 2);

            expect(mockFs.writeFile).toHaveBeenCalledWith(expectedFilePath, expectedContent, 'utf-8');
            expect(mockLogger.info).toHaveBeenCalledWith('Agent configuration written successfully', {
                filePath: expectedFilePath,
                agentName: testName
            });
        });

        it('should throw error for invalid agent name', async () => {
            const invalidName = 'invalid name!';

            await expect(service.writeAgentConfig(invalidName, testConfig)).rejects.toThrow(
                'Invalid agent name'
            );
        });

        it('should throw error if agent already exists', async () => {
            // Mock that agent exists
            mockFs.access.mockResolvedValue(undefined);

            await expect(service.writeAgentConfig(testName, testConfig)).rejects.toThrow(
                `Agent with name '${testName}' already exists`
            );
        });

        it('should throw error for invalid config', async () => {
            const invalidConfig = { ...testConfig, tools: 'not an array' as any };
            mockFs.access.mockRejectedValueOnce(new Error('ENOENT'));

            await expect(service.writeAgentConfig(testName, invalidConfig)).rejects.toThrow(
                'Invalid agent configuration'
            );
        });
    });

    describe('deleteAgentConfig', () => {
        const testName = 'test-agent';

        it('should delete agent config file', async () => {
            mockFs.unlink.mockResolvedValue(undefined);

            await service.deleteAgentConfig(testName);

            const expectedFilePath = path.join(testAgentDirectory, `${testName}.json`);
            expect(mockFs.unlink).toHaveBeenCalledWith(expectedFilePath);
            expect(mockLogger.info).toHaveBeenCalledWith('Agent configuration deleted successfully', {
                filePath: expectedFilePath,
                agentName: testName
            });
        });

        it('should throw error if file does not exist', async () => {
            const notFoundError = new Error('ENOENT') as NodeJS.ErrnoException;
            notFoundError.code = 'ENOENT';
            mockFs.unlink.mockRejectedValue(notFoundError);

            await expect(service.deleteAgentConfig(testName)).rejects.toThrow(
                `Agent configuration file not found: ${testName}`
            );
        });

        it('should throw error if deletion fails', async () => {
            const deleteError = new Error('Permission denied');
            mockFs.unlink.mockRejectedValue(deleteError);

            await expect(service.deleteAgentConfig(testName)).rejects.toThrow(
                `Failed to delete agent configuration for '${testName}': Permission denied`
            );
        });
    });

    describe('validateAgentName', () => {
        it('should validate correct agent names', () => {
            const validNames = ['test-agent', 'agent_1', 'MyAgent', 'a', 'agent123'];

            validNames.forEach(name => {
                const result = service.validateAgentName(name);
                expect(result.isValid).toBe(true);
                expect(result.errors).toHaveLength(0);
            });
        });

        it('should reject invalid agent names', () => {
            const invalidCases = [
                { name: '', expectedError: 'Agent name is required and must be a string' },
                { name: '   ', expectedError: 'Agent name cannot be empty' },
                { name: ' test ', expectedError: 'leading or trailing whitespace' },
                { name: 'test agent', expectedError: 'can only contain letters, numbers, hyphens, and underscores' },
                { name: 'test@agent', expectedError: 'can only contain letters, numbers, hyphens, and underscores' },
                { name: 'default', expectedError: 'reserved name' },
                { name: 'a'.repeat(51), expectedError: 'no more than 50 characters long' },
                { name: 'test/agent', expectedError: 'invalid file name characters' }
            ];

            invalidCases.forEach(({ name, expectedError }) => {
                const result = service.validateAgentName(name);
                expect(result.isValid).toBe(false);
                expect(result.errors.some(error => error.toLowerCase().includes(expectedError.toLowerCase()))).toBe(true);
            });
        });

        it('should reject non-string names', () => {
            const result = service.validateAgentName(null as any);
            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('Agent name is required and must be a string');
        });
    });

    describe('validateAgentConfig', () => {
        const validConfig: AgentConfig = {
            ...DEFAULT_AGENT_CONFIG,
            name: 'test-agent'
        };

        it('should validate correct agent config', () => {
            const result = service.validateAgentConfig(validConfig);
            expect(result.isValid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        it('should reject config with missing required fields', () => {
            const invalidConfig = { ...validConfig, name: '', $schema: '' };
            const result = service.validateAgentConfig(invalidConfig);

            expect(result.isValid).toBe(false);
            expect(result.errors.some(error => error.includes('Agent name is required and must be a string'))).toBe(true);
            expect(result.errors).toContain('Schema reference ($schema) is required and must be a string');
        });

        it('should reject config with invalid field types', () => {
            const invalidConfig = {
                ...validConfig,
                tools: 'not an array',
                mcpServers: null,
                useLegacyMcpJson: 'not a boolean'
            } as any;

            const result = service.validateAgentConfig(invalidConfig);

            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('Tools must be an array');
            expect(result.errors).toContain('mcpServers must be an object');
            expect(result.errors).toContain('useLegacyMcpJson must be a boolean');
        });

        it('should warn about unknown tools', () => {
            const configWithUnknownTools = {
                ...validConfig,
                tools: [...validConfig.tools, 'unknown_tool']
            };

            const result = service.validateAgentConfig(configWithUnknownTools);

            expect(result.isValid).toBe(true);
            expect(result.warnings).toContain('Unknown tools detected: unknown_tool');
        });
    });

    describe('isAgentNameExists', () => {
        const testName = 'test-agent';

        it('should return true if agent exists', async () => {
            mockFs.access.mockResolvedValue(undefined);

            const result = await service.isAgentNameExists(testName);

            expect(result).toBe(true);
            expect(mockFs.access).toHaveBeenCalledWith(
                path.join(testAgentDirectory, `${testName}.json`)
            );
        });

        it('should return false if agent does not exist', async () => {
            mockFs.access.mockRejectedValue(new Error('ENOENT'));

            const result = await service.isAgentNameExists(testName);

            expect(result).toBe(false);
        });
    });

    describe('utility methods', () => {
        it('should create default agent config', () => {
            const name = 'test-agent';
            const config = service.createDefaultAgentConfig(name);

            expect(config.name).toBe(name);
            expect(config.$schema).toBe(DEFAULT_AGENT_CONFIG.$schema);
            expect(config.tools).toEqual(DEFAULT_AGENT_CONFIG.tools);
        });

        it('should create agent config from template with default options', () => {
            const name = 'test-agent';
            const config = service.createAgentConfigFromTemplate(name);

            expect(config.name).toBe(name);
            expect(config.$schema).toBe(AGENT_CONSTANTS.TEMPLATES.SCHEMA_URL);
            expect(config.description).toBe(AGENT_CONSTANTS.TEMPLATES.DEFAULT_DESCRIPTION);
            expect(config.tools).toEqual([
                ...AGENT_CONSTANTS.TEMPLATES.BASIC_TOOLS,
                ...AGENT_CONSTANTS.TEMPLATES.ADVANCED_TOOLS
            ]);
            expect(config.resources).toEqual(AGENT_CONSTANTS.TEMPLATES.DEFAULT_RESOURCES);
        });

        it('should create agent config from template with custom options', () => {
            const name = 'test-agent';
            const options = {
                name,
                description: 'Custom description',
                prompt: 'Custom prompt',
                additionalTools: ['custom_tool'],
                additionalResources: ['file://custom.md'],
                includeAdvancedTools: false
            };
            
            const config = service.createAgentConfigFromTemplate(name, options);

            expect(config.name).toBe(name);
            expect(config.description).toBe('Custom description');
            expect(config.prompt).toBe('Custom prompt');
            expect(config.tools).toEqual(AGENT_CONSTANTS.TEMPLATES.BASIC_TOOLS);
            expect(config.resources).toContain('file://custom.md');
        });

        it('should create minimal agent config', () => {
            const name = 'minimal-agent';
            const config = service.createMinimalAgentConfig(name);

            expect(config.name).toBe(name);
            expect(config.description).toBe(`Minimal Q CLI Agent: ${name}`);
            expect(config.tools).toEqual(['fs_read', 'thinking']);
            expect(config.resources).toEqual(['file://README.md']);
        });

        it('should create comprehensive agent config', () => {
            const name = 'comprehensive-agent';
            const config = service.createComprehensiveAgentConfig(name);

            expect(config.name).toBe(name);
            expect(config.description).toBe(`Comprehensive Q CLI Agent: ${name}`);
            expect(config.tools).toEqual([
                ...AGENT_CONSTANTS.TEMPLATES.BASIC_TOOLS,
                ...AGENT_CONSTANTS.TEMPLATES.ADVANCED_TOOLS
            ]);
            expect(config.resources).toEqual([
                ...AGENT_CONSTANTS.TEMPLATES.DEFAULT_RESOURCES,
                ...AGENT_CONSTANTS.TEMPLATES.COMMON_RESOURCES
            ]);
        });

        it('should validate tool correctly', () => {
            expect(service.isValidTool('fs_read')).toBe(true);
            expect(service.isValidTool('thinking')).toBe(true);
            expect(service.isValidTool('invalid_tool')).toBe(false);
        });

        it('should get template suggestions based on agent name', () => {
            const testSuggestions = service.getTemplateSuggestions('test-agent');
            expect(testSuggestions).toHaveLength(2); // test-specific + default
            expect(testSuggestions[0]?.description).toContain('Testing and debugging');
            
            const awsSuggestions = service.getTemplateSuggestions('aws-helper');
            expect(awsSuggestions).toHaveLength(2); // aws-specific + default
            expect(awsSuggestions[0]?.description).toContain('AWS and cloud operations');
            
            const docSuggestions = service.getTemplateSuggestions('doc-writer');
            expect(docSuggestions).toHaveLength(2); // doc-specific + default
            expect(docSuggestions[0]?.description).toContain('Documentation and writing');
        });

        it('should validate template options', () => {
            const validOptions = {
                name: 'valid-agent',
                description: 'Valid description',
                additionalTools: ['fs_read'],
                additionalResources: ['file://test.md']
            };
            
            const result = service.validateTemplateOptions(validOptions);
            expect(result.isValid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        it('should detect invalid template options', () => {
            const invalidOptions = {
                name: 'invalid name!', // Invalid characters
                additionalResources: ['', '   '] // Empty resources
            };
            
            const result = service.validateTemplateOptions(invalidOptions);
            expect(result.isValid).toBe(false);
            expect(result.errors.length).toBeGreaterThan(0);
        });

        it('should get agent file path', () => {
            const name = 'test-agent';
            const filePath = service.getAgentFilePath(name);

            expect(filePath).toBe(path.join(testAgentDirectory, `${name}.json`));
        });

        it('should extract agent name from path', () => {
            const filePath = path.join(testAgentDirectory, 'test-agent.json');
            const name = service.extractAgentNameFromPath(filePath);

            expect(name).toBe('test-agent');
        });

        it('should validate agent file path', () => {
            const validPath = path.join(testAgentDirectory, 'test-agent.json');
            const invalidPath = path.join('/other/directory', 'test-agent.json');

            expect(service.isValidAgentFilePath(validPath)).toBe(true);
            expect(service.isValidAgentFilePath(invalidPath)).toBe(false);
        });
    });
});