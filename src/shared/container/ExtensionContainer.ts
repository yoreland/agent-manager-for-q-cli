import * as vscode from 'vscode';
import { DependencyContainer } from './DependencyContainer';
import { LazyServiceLoader } from './LazyServiceLoader';

export class ExtensionContainer {
    private container = new DependencyContainer();
    private lazyLoader: LazyServiceLoader;

    constructor(_context: vscode.ExtensionContext) {
        this.registerServices();
        
        // Create a mock logger for lazy loader
        const mockLogger = {
            debug: () => {},
            info: () => {},
            warn: () => {},
            error: () => {},
            setLogLevel: () => {},
            getLogLevel: () => 'info' as const,
            dispose: () => {}
        };
        
        this.lazyLoader = new LazyServiceLoader(this.container, mockLogger as any);
    }

    private registerServices(): void {
        // Register mock services for testing
        this.container.register('logger', () => ({
            debug: () => {},
            info: () => {},
            warn: () => {},
            error: () => {},
            setLogLevel: () => {},
            getLogLevel: () => 'info',
            dispose: () => {}
        }));

        this.container.register('performanceMonitor', () => ({
            measureAsync: async (_name: string, fn: () => any) => fn(),
            logSummary: () => {},
            dispose: () => {}
        }));

        this.container.register('commandRegistry', () => ({
            registerCommands: () => [{ dispose: () => {} }],
            dispose: () => {}
        }));

        this.container.register('agentTreeProvider', () => ({
            getTreeItem: () => ({}),
            getChildren: () => [],
            dispose: () => {}
        }));

        this.container.register('contextTreeProvider', () => ({
            getTreeItem: () => ({}),
            getChildren: () => [],
            dispose: () => {}
        }));
    }

    async getService<T>(token: string): Promise<T> {
        return this.lazyLoader.loadService<T>(token);
    }

    getServiceSync<T>(token: string): T {
        return this.container.resolve<T>(token);
    }

    dispose(): void {
        this.lazyLoader.dispose();
        this.container.dispose();
    }
}
