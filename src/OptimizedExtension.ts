import * as vscode from 'vscode';
import { ExtensionContainer } from './shared/container/ExtensionContainer';
import { PerformanceMonitor } from './infrastructure/PerformanceMonitor';
import { EnhancedLogger } from './shared/infrastructure/EnhancedLogger';
import { CommandRegistry } from './presentation/commands/CommandRegistry';
import { RefactoredAgentTreeProvider } from './providers/RefactoredAgentTreeProvider';
import { RefactoredContextTreeProvider } from './providers/RefactoredContextTreeProvider';

export class OptimizedExtension {
    private container: ExtensionContainer;
    private disposables: vscode.Disposable[] = [];
    private activated = false;

    constructor(context: vscode.ExtensionContext) {
        this.container = new ExtensionContainer(context);
    }

    async activate(): Promise<void> {
        if (this.activated) return;

        const logger = this.container.getServiceSync<EnhancedLogger>('logger');

        const startTime = Date.now();
        
        logger.info('Starting extension activation');

        // Register commands immediately (lightweight)
        await this.registerCommands();

        // Register tree views (lightweight)
        await this.registerTreeViews();

        // Initialize performance monitoring
        this.initializePerformanceMonitoring();

        const activationTime = Date.now() - startTime;
        
        // Log activation performance
        if (activationTime > 100) {
            logger.warn('Extension activation took longer than expected', { activationTime });
        } else {
            logger.info('Extension activated successfully', { activationTime });
        }

        logger.info('Extension activation completed');
        this.activated = true;
    }

    private async registerCommands(): Promise<void> {
        const commandRegistry = await this.container.getService<CommandRegistry>('commandRegistry');
        const commandDisposables = commandRegistry.registerCommands();
        this.disposables.push(...commandDisposables);
    }

    private async registerTreeViews(): Promise<void> {
        // Agent tree view
        const agentTreeProvider = await this.container.getService<RefactoredAgentTreeProvider>('agentTreeProvider');
        const agentTreeView = vscode.window.createTreeView('qcli-agents', {
            treeDataProvider: agentTreeProvider,
            showCollapseAll: true
        });
        this.disposables.push(agentTreeView);

        // Context tree view
        const contextTreeProvider = await this.container.getService<RefactoredContextTreeProvider>('contextTreeProvider');
        const contextTreeView = vscode.window.createTreeView('qcli-context', {
            treeDataProvider: contextTreeProvider,
            showCollapseAll: true
        });
        this.disposables.push(contextTreeView);
    }

    private initializePerformanceMonitoring(): void {
        const performanceMonitor = this.container.getServiceSync<PerformanceMonitor>('performanceMonitor');
        
        // Log performance summary every 5 minutes
        const interval = setInterval(() => {
            performanceMonitor.logSummary();
        }, 5 * 60 * 1000);

        this.disposables.push(new vscode.Disposable(() => {
            clearInterval(interval);
        }));
    }

    deactivate(): void {
        if (!this.activated) return;

        const logger = this.container.getServiceSync<EnhancedLogger>('logger');
        logger.info('Deactivating extension');

        // Dispose all resources
        for (const disposable of this.disposables) {
            try {
                disposable.dispose();
            } catch (error) {
                logger.error('Error disposing resource', error as Error);
            }
        }
        this.disposables = [];

        // Dispose container
        this.container.dispose();

        logger.info('Extension deactivated');
        this.activated = false;
    }
}

// Extension entry points
let extension: OptimizedExtension;

export async function activate(context: vscode.ExtensionContext): Promise<void> {
    extension = new OptimizedExtension(context);
    await extension.activate();
}

export function deactivate(): void {
    if (extension) {
        extension.deactivate();
    }
}
