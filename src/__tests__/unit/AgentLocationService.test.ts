import { AgentLocationService, AgentLocation } from '../../core/agent/AgentLocationService';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

// Mock fs module
jest.mock('fs/promises');
const mockFs = fs as jest.Mocked<typeof fs>;

// Mock os module
jest.mock('os');
const mockOs = os as jest.Mocked<typeof os>;

// Mock path module
jest.mock('path');
const mockPath = path as jest.Mocked<typeof path>;

describe('AgentLocationService', () => {
    let service: AgentLocationService;
    const mockHomedir = '/mock/home';
    const mockCwd = '/mock/workspace';

    beforeEach(() => {
        service = new AgentLocationService();
        mockOs.homedir.mockReturnValue(mockHomedir);
        jest.spyOn(process, 'cwd').mockReturnValue(mockCwd);
        
        // Mock path.join to return predictable paths
        mockPath.join.mockImplementation((...args) => args.join('/'));
        // Mock path.basename to properly remove .json extension
        mockPath.basename.mockImplementation((filePath, ext) => {
            const fileName = filePath.split('/').pop() || filePath;
            if (ext && fileName.endsWith(ext)) {
                return fileName.slice(0, -ext.length);
            }
            return fileName;
        });
        
        jest.clearAllMocks();
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe('getLocalAgentsPath', () => {
        it('should return correct local agents path', () => {
            const result = service.getLocalAgentsPath();
            expect(result).toBe('/mock/workspace/.amazonq/cli-agents');
        });
    });

    describe('getGlobalAgentsPath', () => {
        it('should return correct global agents path', () => {
            const result = service.getGlobalAgentsPath();
            expect(result).toBe('/mock/home/.aws/amazonq/cli-agents');
        });
    });

    describe('ensureDirectoryExists', () => {
        it('should not create directory if it already exists', async () => {
            mockFs.access.mockResolvedValue(undefined);

            await service.ensureDirectoryExists(AgentLocation.Local);

            expect(mockFs.access).toHaveBeenCalledWith('/mock/workspace/.amazonq/cli-agents');
            expect(mockFs.mkdir).not.toHaveBeenCalled();
        });

        it('should create local directory if it does not exist', async () => {
            mockFs.access.mockRejectedValue(new Error('ENOENT'));
            mockFs.mkdir.mockResolvedValue(undefined);

            await service.ensureDirectoryExists(AgentLocation.Local);

            expect(mockFs.mkdir).toHaveBeenCalledWith(
                '/mock/workspace/.amazonq/cli-agents',
                { recursive: true }
            );
        });

        it('should create global directory if it does not exist', async () => {
            mockFs.access.mockRejectedValue(new Error('ENOENT'));
            mockFs.mkdir.mockResolvedValue(undefined);

            await service.ensureDirectoryExists(AgentLocation.Global);

            expect(mockFs.mkdir).toHaveBeenCalledWith(
                '/mock/home/.aws/amazonq/cli-agents',
                { recursive: true }
            );
        });
    });

    describe('resolveAgentPath', () => {
        it('should resolve local agent path correctly', () => {
            const result = service.resolveAgentPath('test-agent', AgentLocation.Local);
            expect(result).toBe('/mock/workspace/.amazonq/cli-agents/test-agent.json');
        });

        it('should resolve global agent path correctly', () => {
            const result = service.resolveAgentPath('test-agent', AgentLocation.Global);
            expect(result).toBe('/mock/home/.aws/amazonq/cli-agents/test-agent.json');
        });
    });

    describe('detectNameConflicts', () => {
        it('should detect no conflict when neither exists', async () => {
            mockFs.access.mockRejectedValue(new Error('ENOENT'));

            const result = await service.detectNameConflicts('test-agent');

            expect(result).toEqual({
                hasConflict: false,
                localExists: false,
                globalExists: false,
                recommendedAction: 'rename'
            });
        });

        it('should detect no conflict when only local exists', async () => {
            mockFs.access
                .mockResolvedValueOnce(undefined) // local exists
                .mockRejectedValueOnce(new Error('ENOENT')); // global doesn't exist

            const result = await service.detectNameConflicts('test-agent');

            expect(result).toEqual({
                hasConflict: false,
                localExists: true,
                globalExists: false,
                recommendedAction: 'use_local'
            });
        });

        it('should detect conflict when both exist', async () => {
            mockFs.access
                .mockResolvedValueOnce(undefined) // local exists
                .mockResolvedValueOnce(undefined); // global exists

            const result = await service.detectNameConflicts('test-agent');

            expect(result).toEqual({
                hasConflict: true,
                localExists: true,
                globalExists: true,
                recommendedAction: 'use_local'
            });
        });
    });

    describe('listAgentsByLocation', () => {
        it('should list agents from both locations', async () => {
            mockFs.readdir
                .mockResolvedValueOnce(['agent1.json', 'agent2.json'] as any)
                .mockResolvedValueOnce(['agent3.json', 'agent1.json'] as any);

            const result = await service.listAgentsByLocation();

            expect(result).toEqual({
                local: ['agent1', 'agent2'],
                global: ['agent3', 'agent1']
            });
        });

        it('should handle missing directories gracefully', async () => {
            mockFs.readdir.mockRejectedValue(new Error('ENOENT'));

            const result = await service.listAgentsByLocation();

            expect(result).toEqual({
                local: [],
                global: []
            });
        });

        it('should filter non-json files', async () => {
            mockFs.readdir
                .mockResolvedValueOnce(['agent1.json', 'readme.txt', 'agent2.json'] as any)
                .mockResolvedValueOnce(['agent3.json', '.DS_Store'] as any);

            const result = await service.listAgentsByLocation();

            expect(result).toEqual({
                local: ['agent1', 'agent2'],
                global: ['agent3']
            });
        });
    });
});
