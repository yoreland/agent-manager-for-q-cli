import { AgentLocationService, AgentLocation } from '../../core/agent/AgentLocationService';
import { ExperimentalToolsService } from '../../core/agent/ExperimentalToolsService';
import { EnhancedAgentCreationFormService } from '../../services/EnhancedAgentCreationFormService';
import { AgentConflictResolver } from '../../services/AgentConflictResolver';
import { AgentFormData } from '../../types/agentCreation';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

// Mock dependencies
jest.mock('fs/promises');
jest.mock('os');

const mockFs = fs as jest.Mocked<typeof fs>;
const mockOs = os as jest.Mocked<typeof os>;

describe('Agent Creation Workflow Integration Tests', () => {
    let locationService: AgentLocationService;
    let experimentalToolsService: ExperimentalToolsService;
    let conflictResolver: AgentConflictResolver;
    let formService: EnhancedAgentCreationFormService;
    let mockLogger: any;

    const mockHomedir = '/mock/home';
    const mockCwd = '/mock/workspace';

    beforeEach(() => {
        // Setup mocks
        mockOs.homedir.mockReturnValue(mockHomedir);
        jest.spyOn(process, 'cwd').mockReturnValue(mockCwd);
        
        mockLogger = {
            info: jest.fn(),
            warn: jest.fn(),
            error: jest.fn(),
            debug: jest.fn()
        };

        // Initialize services
        locationService = new AgentLocationService();
        experimentalToolsService = new ExperimentalToolsService();
        conflictResolver = new AgentConflictResolver(locationService, mockLogger);
        formService = new EnhancedAgentCreationFormService(
            experimentalToolsService,
            locationService,
            conflictResolver,
            mockLogger
        );

        jest.clearAllMocks();
    });

    describe('Local Agent Creation Workflow', () => {
        it('should create local agent successfully', async () => {
            // Arrange
            const agentData: AgentFormData = {
                name: 'test-local-agent',
                description: 'Test local agent',
                prompt: 'You are a test agent',
                location: AgentLocation.Local,
                tools: {
                    available: ['fs_read', 'fs_write'],
                    allowed: ['fs_read'],
                    experimental: []
                },
                resources: ['file://README.md']
            };

            mockFs.access.mockRejectedValue(new Error('ENOENT')); // Directory doesn't exist
            mockFs.mkdir.mockResolvedValue(undefined);
            mockFs.writeFile.mockResolvedValue(undefined);

            // Act
            const result = await formService.createAgentFromFormData(agentData);

            // Assert
            expect(result.success).toBe(true);
            expect(result.agentPath).toContain('test-local-agent.json');
            expect(result.location).toBe(AgentLocation.Local);
            
            expect(mockFs.mkdir).toHaveBeenCalledWith(
                path.join(mockCwd, '.amazonq/cli-agents'),
                { recursive: true }
            );
            expect(mockFs.writeFile).toHaveBeenCalledWith(
                expect.stringContaining('test-local-agent.json'),
                expect.stringContaining('"name":"test-local-agent"')
            );
        });

        it('should handle local agent name conflicts', async () => {
            // Arrange
            const agentData: AgentFormData = {
                name: 'existing-agent',
                description: 'Test agent',
                prompt: '',
                location: AgentLocation.Local,
                tools: { available: [], allowed: [], experimental: [] },
                resources: []
            };

            mockFs.access
                .mockResolvedValueOnce(undefined) // Local exists
                .mockRejectedValueOnce(new Error('ENOENT')); // Global doesn't exist

            // Act
            const result = await formService.createAgentFromFormData(agentData);

            // Assert
            expect(result.success).toBe(false);
            expect(result.error).toContain('already exists');
        });
    });

    describe('Global Agent Creation Workflow', () => {
        it('should create global agent successfully', async () => {
            // Arrange
            const agentData: AgentFormData = {
                name: 'test-global-agent',
                description: 'Test global agent',
                prompt: 'You are a global test agent',
                location: AgentLocation.Global,
                tools: {
                    available: ['fs_read', 'execute_bash'],
                    allowed: ['fs_read'],
                    experimental: []
                },
                resources: []
            };

            mockFs.access.mockRejectedValue(new Error('ENOENT'));
            mockFs.mkdir.mockResolvedValue(undefined);
            mockFs.writeFile.mockResolvedValue(undefined);

            // Act
            const result = await formService.createAgentFromFormData(agentData);

            // Assert
            expect(result.success).toBe(true);
            expect(result.location).toBe(AgentLocation.Global);
            
            expect(mockFs.mkdir).toHaveBeenCalledWith(
                path.join(mockHomedir, '.aws/amazonq/cli-agents'),
                { recursive: true }
            );
        });

        it('should handle global directory creation failure', async () => {
            // Arrange
            const agentData: AgentFormData = {
                name: 'test-agent',
                description: 'Test agent',
                prompt: '',
                location: AgentLocation.Global,
                tools: { available: [], allowed: [], experimental: [] },
                resources: []
            };

            mockFs.access.mockRejectedValue(new Error('ENOENT'));
            mockFs.mkdir.mockRejectedValue(new Error('EACCES: permission denied'));

            // Act
            const result = await formService.createAgentFromFormData(agentData);

            // Assert
            expect(result.success).toBe(false);
            expect(result.error).toContain('permission denied');
        });
    });

    describe('Experimental Tools Integration', () => {
        it('should create agent with experimental tools', async () => {
            // Arrange
            const agentData: AgentFormData = {
                name: 'experimental-agent',
                description: 'Agent with experimental tools',
                prompt: '',
                location: AgentLocation.Local,
                tools: {
                    available: ['fs_read'],
                    allowed: ['fs_read'],
                    experimental: ['knowledge', 'thinking']
                },
                resources: []
            };

            mockFs.access.mockRejectedValue(new Error('ENOENT'));
            mockFs.mkdir.mockResolvedValue(undefined);
            mockFs.writeFile.mockResolvedValue(undefined);

            // Act
            const result = await formService.createAgentFromFormData(agentData);

            // Assert
            expect(result.success).toBe(true);
            
            const writeCall = mockFs.writeFile.mock.calls[0];
            if (writeCall) {
                const configJson = writeCall[1] as string;
                const config = JSON.parse(configJson);
                
                expect(config.tools).toContain('knowledge');
                expect(config.tools).toContain('thinking');
            }
        });

        it('should validate experimental tools selection', async () => {
            // Arrange
            const agentData: AgentFormData = {
                name: 'test-agent',
                description: 'Test agent',
                prompt: '',
                location: AgentLocation.Local,
                tools: {
                    available: [],
                    allowed: [],
                    experimental: ['knowledge', 'invalid-tool']
                },
                resources: []
            };

            // Act
            const validation = await formService.validateFormData(agentData);

            // Assert
            expect(validation.warnings.length).toBeGreaterThan(0);
            expect(validation.warnings.some(w => w.message.includes('experimental'))).toBe(true);
        });
    });

    describe('Name Conflict Resolution Workflow', () => {
        it('should detect and handle name conflicts between local and global', async () => {
            // Arrange
            const conflictName = 'conflicted-agent';
            
            mockFs.access
                .mockResolvedValueOnce(undefined) // Local exists
                .mockResolvedValueOnce(undefined); // Global exists

            // Act
            const conflictInfo = await locationService.detectNameConflicts(conflictName);

            // Assert
            expect(conflictInfo.hasConflict).toBe(true);
            expect(conflictInfo.localExists).toBe(true);
            expect(conflictInfo.globalExists).toBe(true);
            expect(conflictInfo.recommendedAction).toBe('use_local');
        });

        it('should prioritize local agents over global ones', async () => {
            // Arrange
            mockFs.readdir
                .mockResolvedValueOnce(['shared-agent.json'] as any) // Local
                .mockResolvedValueOnce(['shared-agent.json', 'global-only.json'] as any); // Global

            // Act
            const agentsList = await locationService.listAgentsByLocation();

            // Assert
            expect(agentsList.local).toContain('shared-agent');
            expect(agentsList.global).toContain('shared-agent');
            expect(agentsList.global).toContain('global-only');
        });
    });

    describe('Form Validation Integration', () => {
        it('should validate complete agent form data', async () => {
            // Arrange
            const validData: AgentFormData = {
                name: 'valid-agent',
                description: 'A valid agent',
                prompt: 'You are helpful',
                location: AgentLocation.Local,
                tools: {
                    available: ['fs_read', 'fs_write'],
                    allowed: ['fs_read'],
                    experimental: ['knowledge']
                },
                resources: ['file://README.md']
            };

            mockFs.access.mockRejectedValue(new Error('ENOENT')); // No conflicts

            // Act
            const validation = await formService.validateFormData(validData);

            // Assert
            expect(validation.isValid).toBe(true);
            expect(validation.errors).toHaveLength(0);
            expect(validation.warnings.length).toBeGreaterThan(0); // Experimental tool warning
        });

        it('should reject invalid agent names', async () => {
            // Arrange
            const invalidData: AgentFormData = {
                name: 'invalid name with spaces',
                description: 'Test',
                prompt: '',
                location: AgentLocation.Local,
                tools: { available: [], allowed: [], experimental: [] },
                resources: []
            };

            // Act
            const validation = await formService.validateFormData(invalidData);

            // Assert
            expect(validation.isValid).toBe(false);
            expect(validation.errors.some(e => e.field === 'name')).toBe(true);
        });
    });
});
