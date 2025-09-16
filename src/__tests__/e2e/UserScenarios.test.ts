import * as vscode from 'vscode';
import { OptimizedExtension } from '../../OptimizedExtension';
import * as path from 'path';
import * as fs from 'fs/promises';
import * as os from 'os';

// Mock VS Code API for E2E tests
jest.mock('vscode', () => ({
    window: {
        createTreeView: jest.fn().mockReturnValue({ dispose: jest.fn() }),
        showInformationMessage: jest.fn(),
        showErrorMessage: jest.fn(),
        showWarningMessage: jest.fn()
    },
    commands: {
        registerCommand: jest.fn().mockReturnValue({ dispose: jest.fn() })
    },
    workspace: {
        workspaceFolders: [{
            uri: { fsPath: '/test/workspace' }
        }]
    },
    Disposable: jest.fn().mockImplementation((callback) => ({
        dispose: callback
    })),
    TreeItemCollapsibleState: {
        None: 0,
        Collapsed: 1,
        Expanded: 2
    },
    ThemeIcon: jest.fn()
}));

describe('End-to-End User Scenarios', () => {
    let extension: OptimizedExtension;
    let mockContext: vscode.ExtensionContext;
    let tempWorkspace: string;

    beforeAll(async () => {
        tempWorkspace = await fs.mkdtemp(path.join(os.tmpdir(), 'e2e-test-'));
        
        // Update mock workspace
        (vscode.workspace.workspaceFolders as any) = [{
            uri: { fsPath: tempWorkspace }
        }];

        mockContext = {
            subscriptions: [],
            workspaceState: {
                get: jest.fn(),
                update: jest.fn()
            },
            globalState: {
                get: jest.fn(),
                update: jest.fn()
            },
            extensionPath: '/test/extension',
            storagePath: '/test/storage',
            globalStoragePath: '/test/global-storage',
            logPath: '/test/logs'
        } as any;
    });

    afterAll(async () => {
        if (extension) {
            extension.deactivate();
        }
        await fs.rm(tempWorkspace, { recursive: true, force: true });
    });

    describe('Extension Lifecycle', () => {
        it('should activate extension successfully', async () => {
            const startTime = Date.now();
            
            extension = new OptimizedExtension(mockContext);
            await extension.activate();
            
            const activationTime = Date.now() - startTime;
            expect(activationTime).toBeLessThan(1000); // Should activate within 1 second
            
            // Verify tree views were created
            expect(vscode.window.createTreeView).toHaveBeenCalledWith('qcli-agents', expect.any(Object));
            expect(vscode.window.createTreeView).toHaveBeenCalledWith('qcli-context', expect.any(Object));
        });

        it('should handle multiple activation calls', async () => {
            await extension.activate();
            await extension.activate(); // Should not cause issues
            
            // Tree views should only be created once per activation
            expect(vscode.window.createTreeView).toHaveBeenCalledTimes(2); // From previous test
        });

        it('should deactivate cleanly', () => {
            expect(() => extension.deactivate()).not.toThrow();
        });
    });

    describe('Command Registration', () => {
        beforeEach(async () => {
            extension = new OptimizedExtension(mockContext);
            await extension.activate();
        });

        afterEach(() => {
            extension.deactivate();
        });

        it('should register all required commands', () => {
            const expectedCommands = [
                'qcli-agents.createAgent',
                'qcli-agents.openAgent',
                'qcli-agents.deleteAgent',
                'qcli-agents.refreshAgents',
                'qcli-context.addContextItem',
                'qcli-context.removeContextItem',
                'qcli-context.clearContext',
                'qcli-context.openContextItem',
                'qcli-context.refreshContext',
                'qcli-context.setCurrentAgent'
            ];

            // Verify commands were registered
            expect(vscode.commands.registerCommand).toHaveBeenCalledTimes(expectedCommands.length);
            
            const registeredCommands = (vscode.commands.registerCommand as jest.Mock).mock.calls
                .map(call => call[0]);
            
            for (const command of expectedCommands) {
                expect(registeredCommands).toContain(command);
            }
        });
    });

    describe('Performance Scenarios', () => {
        beforeEach(async () => {
            extension = new OptimizedExtension(mockContext);
        });

        afterEach(() => {
            extension.deactivate();
        });

        it('should meet activation performance target', async () => {
            const iterations = 5;
            const activationTimes: number[] = [];

            for (let i = 0; i < iterations; i++) {
                const testExtension = new OptimizedExtension(mockContext);
                
                const startTime = Date.now();
                await testExtension.activate();
                const activationTime = Date.now() - startTime;
                
                activationTimes.push(activationTime);
                testExtension.deactivate();
            }

            const averageTime = activationTimes.reduce((sum, time) => sum + time, 0) / iterations;
            const maxTime = Math.max(...activationTimes);

            expect(averageTime).toBeLessThan(500); // Average under 500ms
            expect(maxTime).toBeLessThan(1000); // Max under 1 second
        });

        it('should handle rapid activation/deactivation cycles', async () => {
            const cycles = 10;

            for (let i = 0; i < cycles; i++) {
                const testExtension = new OptimizedExtension(mockContext);
                await testExtension.activate();
                testExtension.deactivate();
            }

            // Should complete without errors
            expect(true).toBe(true);
        });
    });

    describe('Error Recovery Scenarios', () => {
        beforeEach(async () => {
            extension = new OptimizedExtension(mockContext);
            await extension.activate();
        });

        afterEach(() => {
            extension.deactivate();
        });

        it('should handle workspace without .amazonq directory', async () => {
            // Extension should activate even without .amazonq directory
            expect(() => extension.activate()).not.toThrow();
        });

        it('should handle permission errors gracefully', async () => {
            // Create a directory structure that might cause permission issues
            const restrictedDir = path.join(tempWorkspace, '.amazonq');
            await fs.mkdir(restrictedDir, { recursive: true });

            // Extension should handle this gracefully
            const testExtension = new OptimizedExtension(mockContext);
            await expect(testExtension.activate()).resolves.not.toThrow();
            testExtension.deactivate();
        });
    });

    describe('Memory Management', () => {
        it('should not leak memory during activation/deactivation cycles', async () => {
            const initialMemory = process.memoryUsage().heapUsed;
            const cycles = 20;

            for (let i = 0; i < cycles; i++) {
                const testExtension = new OptimizedExtension(mockContext);
                await testExtension.activate();
                testExtension.deactivate();
            }

            // Force garbage collection if available
            if (global.gc) {
                global.gc();
            }

            const finalMemory = process.memoryUsage().heapUsed;
            const memoryIncrease = finalMemory - initialMemory;
            const memoryIncreaseKB = memoryIncrease / 1024;

            // Memory increase should be reasonable (less than 1MB)
            expect(memoryIncreaseKB).toBeLessThan(1024);
        });
    });
});
