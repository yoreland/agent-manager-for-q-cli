import { AgentCreationFormService } from '../../services/agentCreationFormService';
import { ExtensionLogger } from '../../services/logger';
import { AgentFormData } from '../../types/agentCreation';
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

// Mock dependencies
jest.mock('vscode');
jest.mock('fs');
jest.mock('path');

describe('AgentCreationFormService', () => {
    let service: AgentCreationFormService;
    let mockLogger: jest.Mocked<ExtensionLogger>;

    beforeEach(() => {
        mockLogger = {
            info: jest.fn(),
            error: jest.fn(),
            debug: jest.fn(),
            warn: jest.fn()
        } as any;
        
        service = new AgentCreationFormService(mockLogger);
    });

    describe('getDefaultFormData', () => {
        it('should return default form data with correct structure', () => {
            const defaultData = service.getDefaultFormData();
            
            expect(defaultData).toEqual({
                name: '',
                description: '',
                prompt: '',
                tools: {
                    available: expect.arrayContaining(['fs_read', 'fs_write', 'execute_bash']),
                    allowed: ['fs_read']
                },
                resources: [
                    'file://AmazonQ.md',
                    'file://README.md',
                    'file://.amazonq/rules/**/*.md'
                ]
            });
        });

        it('should include all built-in tools in available tools', () => {
            const defaultData = service.getDefaultFormData();
            
            expect(defaultData.tools.available).toHaveLength(9);
            expect(defaultData.tools.available).toContain('fs_read');
            expect(defaultData.tools.available).toContain('use_aws');
            expect(defaultData.tools.available).toContain('knowledge');
        });
    });

    describe('validateFormData', () => {
        let validFormData: AgentFormData;

        beforeEach(() => {
            validFormData = {
                name: 'test-agent',
                description: 'Test agent',
                prompt: 'Test prompt',
                tools: {
                    available: ['fs_read', 'fs_write'],
                    allowed: ['fs_read']
                },
                resources: ['file://test.md']
            };
        });

        it('should validate correct form data', () => {
            const result = service.validateFormData(validFormData);
            
            expect(result.isValid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        it('should reject empty agent name', () => {
            validFormData.name = '';
            
            const result = service.validateFormData(validFormData);
            
            expect(result.isValid).toBe(false);
            expect(result.errors).toContainEqual({
                field: 'name',
                message: 'Agent name is required'
            });
        });

        it('should reject invalid agent name characters', () => {
            validFormData.name = 'test agent!';
            
            const result = service.validateFormData(validFormData);
            
            expect(result.isValid).toBe(false);
            expect(result.errors).toContainEqual({
                field: 'name',
                message: 'Agent name can only contain letters, numbers, hyphens, and underscores'
            });
        });

        it('should reject allowed tools not in available tools', () => {
            validFormData.tools.allowed = ['fs_write'];
            validFormData.tools.available = ['fs_read'];
            
            const result = service.validateFormData(validFormData);
            
            expect(result.isValid).toBe(false);
            expect(result.errors).toContainEqual({
                field: 'tools',
                message: 'Allowed tool "fs_write" must be in available tools'
            });
        });

        it('should reject resources without file:// prefix', () => {
            validFormData.resources = ['test.md'];
            
            const result = service.validateFormData(validFormData);
            
            expect(result.isValid).toBe(false);
            expect(result.errors).toContainEqual({
                field: 'resources',
                message: 'Resource 1 must start with "file://"'
            });
        });

        it('should warn about duplicate resources', () => {
            validFormData.resources = ['file://test.md', 'file://test.md'];
            
            const result = service.validateFormData(validFormData);
            
            expect(result.warnings).toContainEqual({
                field: 'resources',
                message: 'Duplicate resource: file://test.md'
            });
        });
    });

    describe('getAvailableTools', () => {
        it('should return all built-in tools', () => {
            const tools = service.getAvailableTools();
            
            expect(tools).toHaveLength(9);
            expect(tools[0]).toHaveProperty('name');
            expect(tools[0]).toHaveProperty('displayName');
            expect(tools[0]).toHaveProperty('description');
            expect(tools[0]).toHaveProperty('category');
            expect(tools[0]).toHaveProperty('defaultAllowed');
        });

        it('should return tools with correct categories', () => {
            const tools = service.getAvailableTools();
            const categories = tools.map(t => t.category);
            
            expect(categories).toContain('filesystem');
            expect(categories).toContain('execution');
            expect(categories).toContain('aws');
            expect(categories).toContain('utility');
            expect(categories).toContain('development');
        });
    });

    describe('createAgentFromFormData', () => {
        let validFormData: AgentFormData;
        let mockWorkspaceFolder: any;

        beforeEach(() => {
            validFormData = {
                name: 'test-agent',
                description: 'Test agent',
                prompt: 'Test prompt',
                tools: {
                    available: ['fs_read', 'fs_write'],
                    allowed: ['fs_read']
                },
                resources: ['file://test.md']
            };

            mockWorkspaceFolder = {
                uri: { fsPath: '/test/workspace' }
            };

            (vscode.workspace as any).workspaceFolders = [mockWorkspaceFolder];
            (fs.existsSync as jest.Mock).mockReturnValue(false);
            (fs.mkdirSync as jest.Mock).mockImplementation();
            (fs.writeFileSync as jest.Mock).mockImplementation();
            (path.join as jest.Mock).mockImplementation((...args) => args.join('/'));
            (path.relative as jest.Mock).mockReturnValue('.amazonq/cli-agents/test-agent.json');
            (vscode.commands.executeCommand as jest.Mock).mockResolvedValue(undefined);
        });

        it('should create agent successfully', async () => {
            const result = await service.createAgentFromFormData(validFormData);
            
            expect(result.success).toBe(true);
            expect(result.agentPath).toBe('.amazonq/cli-agents/test-agent.json');
            expect(fs.writeFileSync).toHaveBeenCalled();
            expect(vscode.commands.executeCommand).toHaveBeenCalledWith('qcli-agents.refreshTree');
        });

        it('should fail when no workspace folder exists', async () => {
            (vscode.workspace as any).workspaceFolders = undefined;
            
            const result = await service.createAgentFromFormData(validFormData);
            
            expect(result.success).toBe(false);
            expect(result.error).toBe('No workspace folder found');
        });

        it('should fail when agent already exists', async () => {
            (fs.existsSync as jest.Mock).mockReturnValue(true);
            
            const result = await service.createAgentFromFormData(validFormData);
            
            expect(result.success).toBe(false);
            expect(result.error).toBe('Agent "test-agent" already exists');
        });

        it('should create directory if it does not exist', async () => {
            (fs.existsSync as jest.Mock)
                .mockReturnValueOnce(false) // Directory doesn't exist
                .mockReturnValueOnce(false); // Agent file doesn't exist
            
            await service.createAgentFromFormData(validFormData);
            
            expect(fs.mkdirSync).toHaveBeenCalledWith('/test/workspace/.amazonq/cli-agents', { recursive: true });
        });

        it('should write correct agent configuration', async () => {
            await service.createAgentFromFormData(validFormData);
            
            const writeCall = (fs.writeFileSync as jest.Mock).mock.calls[0];
            const configJson = writeCall[1];
            const config = JSON.parse(configJson);
            
            expect(config).toEqual({
                $schema: "https://raw.githubusercontent.com/aws/amazon-q-developer-cli/refs/heads/main/schemas/agent-v1.json",
                name: 'test-agent',
                description: 'Test agent',
                prompt: 'Test prompt',
                mcpServers: {},
                tools: ['fs_read', 'fs_write'],
                toolAliases: {},
                allowedTools: ['fs_read'],
                toolsSettings: {},
                resources: ['file://test.md'],
                hooks: {},
                useLegacyMcpJson: true
            });
        });
    });
});
