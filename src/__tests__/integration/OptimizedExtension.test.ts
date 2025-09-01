import * as vscode from 'vscode';
import { OptimizedExtension } from '../../OptimizedExtension';

// Mock VS Code API
jest.mock('vscode', () => ({
    window: {
        createTreeView: jest.fn().mockReturnValue({
            dispose: jest.fn()
        })
    },
    commands: {
        registerCommand: jest.fn().mockReturnValue({
            dispose: jest.fn()
        })
    },
    workspace: {
        workspaceFolders: [{
            uri: { fsPath: '/test/workspace' }
        }]
    },
    Disposable: jest.fn().mockImplementation((callback) => ({
        dispose: callback
    }))
}));

describe('OptimizedExtension Integration', () => {
    let extension: OptimizedExtension;
    let mockContext: vscode.ExtensionContext;

    beforeEach(() => {
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

        extension = new OptimizedExtension(mockContext);
    });

    afterEach(() => {
        if (extension) {
            extension.deactivate();
        }
    });

    describe('activation', () => {
        it('should activate successfully', async () => {
            await expect(extension.activate()).resolves.not.toThrow();
        });

        it('should not activate twice', async () => {
            await extension.activate();
            await extension.activate(); // Should not throw or cause issues
        });

        it('should register tree views during activation', async () => {
            await extension.activate();

            expect(vscode.window.createTreeView).toHaveBeenCalledWith('qcli-agents', expect.any(Object));
            expect(vscode.window.createTreeView).toHaveBeenCalledWith('qcli-context', expect.any(Object));
        });

        it('should complete activation within performance target', async () => {
            const startTime = Date.now();
            
            await extension.activate();
            
            const activationTime = Date.now() - startTime;
            expect(activationTime).toBeLessThan(1000); // Should activate within 1 second in test environment
        });
    });

    describe('deactivation', () => {
        it('should deactivate successfully', async () => {
            await extension.activate();
            
            expect(() => extension.deactivate()).not.toThrow();
        });

        it('should handle deactivation without activation', () => {
            expect(() => extension.deactivate()).not.toThrow();
        });

        it('should handle multiple deactivation calls', async () => {
            await extension.activate();
            
            extension.deactivate();
            extension.deactivate(); // Should not throw
        });
    });

    describe('resource management', () => {
        it('should properly dispose resources on deactivation', async () => {
            await extension.activate();
            
            const createTreeViewMock = vscode.window.createTreeView as jest.Mock;
            const treeViewMock = createTreeViewMock.mock.results[0]?.value;
            
            extension.deactivate();
            
            // Verify that dispose was called on created resources
            if (treeViewMock) {
                expect(treeViewMock.dispose).toHaveBeenCalled();
            }
        });
    });
});
