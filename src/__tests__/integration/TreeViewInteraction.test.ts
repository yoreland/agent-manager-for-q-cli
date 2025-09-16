import { EnhancedAgentTreeProvider } from '../../providers/EnhancedAgentTreeProvider';
import { EnhancedAgentManagementService } from '../../services/EnhancedAgentManagementService';
import { AgentConflictResolver } from '../../services/AgentConflictResolver';
import { AgentLocationService, AgentLocation } from '../../core/agent/AgentLocationService';
import { TreeViewUIHelper } from '../../providers/TreeViewUIHelper';
import * as vscode from 'vscode';

// Mock vscode
jest.mock('vscode', () => ({
    TreeItem: jest.fn().mockImplementation((label, collapsibleState) => ({
        label,
        collapsibleState,
        contextValue: undefined,
        iconPath: undefined,
        tooltip: undefined,
        command: undefined,
        description: undefined
    })),
    TreeItemCollapsibleState: {
        None: 0,
        Collapsed: 1,
        Expanded: 2
    },
    ThemeIcon: jest.fn().mockImplementation((id, color) => ({ id, color })),
    ThemeColor: jest.fn().mockImplementation((id) => ({ id })),
    EventEmitter: jest.fn().mockImplementation(() => ({
        event: jest.fn(),
        fire: jest.fn(),
        dispose: jest.fn()
    }))
}));

describe('Tree View Interaction Integration Tests', () => {
    let treeProvider: EnhancedAgentTreeProvider;
    let managementService: EnhancedAgentManagementService;
    let conflictResolver: AgentConflictResolver;
    let locationService: AgentLocationService;
    let mockLogger: any;

    beforeEach(() => {
        mockLogger = {
            info: jest.fn(),
            warn: jest.fn(),
            error: jest.fn(),
            debug: jest.fn()
        };

        locationService = new AgentLocationService();
        conflictResolver = new AgentConflictResolver(locationService, mockLogger);
        managementService = new EnhancedAgentManagementService(locationService, mockLogger);
        treeProvider = new EnhancedAgentTreeProvider(managementService, conflictResolver, mockLogger);

        jest.clearAllMocks();
    });

    describe('Location-based Tree Structure', () => {
        it('should display local and global agent sections', async () => {
            // Arrange
            const mockAgentData = {
                local: [
                    {
                        label: 'local-agent',
                        description: 'Local test agent',
                        iconPath: new vscode.ThemeIcon('robot'),
                        contextValue: 'agentItem',
                        filePath: '/local/path/local-agent.json',
                        config: {
                            $schema: 'test',
                            name: 'local-agent',
                            description: 'Local test agent',
                            prompt: '',
                            mcpServers: {},
                            tools: [],
                            toolAliases: {},
                            allowedTools: [],
                            resources: [],
                            hooks: {},
                            toolsSettings: {},
                            useLegacyMcpJson: false
                        },
                        location: AgentLocation.Local,
                        hasConflict: false
                    }
                ],
                global: [
                    {
                        label: 'global-agent',
                        description: 'Global test agent',
                        iconPath: new vscode.ThemeIcon('globe'),
                        contextValue: 'agentItem',
                        filePath: '/global/path/global-agent.json',
                        config: {
                            $schema: 'test',
                            name: 'global-agent',
                            description: 'Global test agent',
                            prompt: '',
                            mcpServers: {},
                            tools: [],
                            toolAliases: {},
                            allowedTools: [],
                            resources: [],
                            hooks: {},
                            toolsSettings: {},
                            useLegacyMcpJson: false
                        },
                        location: AgentLocation.Global,
                        hasConflict: false
                    }
                ],
                conflicts: []
            };

            jest.spyOn(managementService, 'getAgentsByLocation').mockResolvedValue({
                success: true,
                data: mockAgentData
            } as any);

            // Act
            const rootItems = await treeProvider.getChildren();

            // Assert
            expect(rootItems).toHaveLength(2);
        });

        it('should show conflict warnings when name conflicts exist', async () => {
            // Arrange
            const mockAgentData = {
                local: [],
                global: [],
                conflicts: [
                    {
                        hasConflict: true,
                        localExists: true,
                        globalExists: true,
                        recommendedAction: 'use_local' as const
                    }
                ]
            };

            jest.spyOn(managementService, 'getAgentsByLocation').mockResolvedValue({
                success: true,
                data: mockAgentData
            } as any);

            // Act
            const rootItems = await treeProvider.getChildren();

            // Assert
            expect(rootItems).toHaveLength(3); // 2 sections + 1 conflict warning
        });
    });

    describe('Empty State Handling', () => {
        it('should show appropriate empty state for local agents', async () => {
            // Arrange
            const mockAgentData = {
                local: [],
                global: [],
                conflicts: []
            };

            jest.spyOn(managementService, 'getAgentsByLocation').mockResolvedValue({
                success: true,
                data: mockAgentData
            } as any);

            const localSection = {
                label: 'Local Agents (0)',
                contextValue: 'locationSeparator',
                collapsibleState: vscode.TreeItemCollapsibleState.Expanded,
                children: []
            };

            // Act
            const children = await treeProvider.getChildren(localSection as any);

            // Assert
            expect(children).toHaveLength(1);
        });

        it('should show global empty state message', async () => {
            // Arrange
            const emptyStateItem = TreeViewUIHelper.createEmptyStateItem({
                location: AgentLocation.Global
            });

            // Act & Assert
            expect(emptyStateItem.label).toBe('No global agents');
            expect(emptyStateItem.description).toBe('Create agents for all workspaces');
        });
    });

    describe('Location Separator Styling', () => {
        it('should create local agents separator with correct styling', () => {
            // Act
            const separator = TreeViewUIHelper.createLocationSeparator(
                AgentLocation.Local,
                3,
                false
            );

            // Assert
            expect(separator.label).toBe('Local Agents (3)');
            expect(separator.contextValue).toBe('locationSeparator');
        });

        it('should create global agents separator with conflict indicator', () => {
            // Act
            const separator = TreeViewUIHelper.createLocationSeparator(
                AgentLocation.Global,
                2,
                true
            );

            // Assert
            expect(separator.label).toBe('Global Agents (2) ⚠️');
        });
    });
});
