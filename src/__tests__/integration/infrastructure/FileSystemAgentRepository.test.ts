import { FileSystemAgentRepository } from '../../../infrastructure/repositories/FileSystemAgentRepository';
import { Agent } from '../../../core/agent/Agent';
import { IFileSystemAdapter } from '../../../shared/infrastructure/IFileSystemAdapter';
import { ILogger } from '../../../shared/infrastructure/ILogger';
import { success, failure } from '../../../shared/errors/result';

describe('FileSystemAgentRepository Integration', () => {
    let repository: FileSystemAgentRepository;
    let mockFileSystem: jest.Mocked<IFileSystemAdapter>;
    let mockLogger: jest.Mocked<ILogger>;
    const workspaceRoot = '/test/workspace';

    beforeEach(() => {
        mockFileSystem = {
            readFile: jest.fn(),
            writeFile: jest.fn(),
            deleteFile: jest.fn(),
            exists: jest.fn(),
            ensureDirectory: jest.fn(),
            readDirectory: jest.fn(),
            watchFile: jest.fn(),
            watchDirectory: jest.fn()
        };

        mockLogger = {
            debug: jest.fn(),
            info: jest.fn(),
            warn: jest.fn(),
            error: jest.fn(),
            setLogLevel: jest.fn(),
            getLogLevel: jest.fn(),
            dispose: jest.fn()
        };

        repository = new FileSystemAgentRepository(mockFileSystem, mockLogger, workspaceRoot);
    });

    describe('findAll', () => {
        it('should return empty array when directory does not exist', async () => {
            mockFileSystem.readDirectory.mockResolvedValue(failure(new Error('Directory not found')));

            const result = await repository.findAll();

            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data).toEqual([]);
            }
        });

        it('should load all valid agents from directory', async () => {
            const agentConfig = {
                $schema: 'https://json.schemastore.org/amazon-q-developer-cli-agent.json',
                name: 'test-agent',
                description: 'Test agent',
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

            mockFileSystem.readDirectory.mockResolvedValue(success(['test-agent.json', 'other.txt']));
            mockFileSystem.readFile.mockResolvedValue(success(JSON.stringify(agentConfig)));

            const result = await repository.findAll();

            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data).toHaveLength(1);
                expect(result.data[0]?.name).toBe('test-agent');
            }
        });

        it('should skip invalid agent files', async () => {
            mockFileSystem.readDirectory.mockResolvedValue(success(['valid.json', 'invalid.json']));
            mockFileSystem.readFile
                .mockResolvedValueOnce(success('{"$schema": "https://json.schemastore.org/amazon-q-developer-cli-agent.json", "name": "valid", "description": "Valid agent", "prompt": null, "mcpServers": {}, "tools": [], "toolAliases": {}, "allowedTools": [], "resources": [], "hooks": {}, "toolsSettings": {}, "useLegacyMcpJson": false}'))
                .mockResolvedValueOnce(success('invalid json'));

            const result = await repository.findAll();

            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data).toHaveLength(1); // Only valid agent should be loaded
                expect(result.data[0]?.name).toBe('valid');
            }
            expect(mockLogger.warn).toHaveBeenCalledTimes(1); // Only invalid file should warn
        });
    });

    describe('findByName', () => {
        it('should return agent when found', async () => {
            const agentConfig = {
                $schema: 'https://json.schemastore.org/amazon-q-developer-cli-agent.json',
                name: 'test-agent',
                description: 'Test agent',
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

            mockFileSystem.exists.mockResolvedValue(success(true));
            mockFileSystem.readFile.mockResolvedValue(success(JSON.stringify(agentConfig)));

            const result = await repository.findByName('test-agent');

            expect(result.success).toBe(true);
            if (result.success && result.data) {
                expect(result.data.name).toBe('test-agent');
            }
        });

        it('should return null when agent not found', async () => {
            mockFileSystem.exists.mockResolvedValue(success(false));

            const result = await repository.findByName('nonexistent');

            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data).toBeNull();
            }
        });
    });

    describe('save', () => {
        it('should save agent successfully', async () => {
            const agentResult = Agent.create('test-agent', '/path/to/agent.json');
            expect(agentResult.success).toBe(true);
            
            if (agentResult.success) {
                const agent = agentResult.data;
                mockFileSystem.ensureDirectory.mockResolvedValue(success(undefined));
                mockFileSystem.writeFile.mockResolvedValue(success(undefined));

                const result = await repository.save(agent);

                expect(result.success).toBe(true);
                expect(mockFileSystem.ensureDirectory).toHaveBeenCalled();
                expect(mockFileSystem.writeFile).toHaveBeenCalledWith(
                    expect.stringContaining('test-agent.json'),
                    expect.stringContaining('"name": "test-agent"')
                );
            }
        });
    });

    describe('delete', () => {
        it('should delete agent successfully', async () => {
            mockFileSystem.deleteFile.mockResolvedValue(success(undefined));

            const result = await repository.delete('test-agent');

            expect(result.success).toBe(true);
            expect(mockFileSystem.deleteFile).toHaveBeenCalledWith(
                expect.stringContaining('test-agent.json')
            );
        });
    });

    describe('exists', () => {
        it('should check if agent exists', async () => {
            mockFileSystem.exists.mockResolvedValue(success(true));

            const result = await repository.exists('test-agent');

            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data).toBe(true);
            }
        });
    });
});
