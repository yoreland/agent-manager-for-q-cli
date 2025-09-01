import * as vscode from 'vscode';
import { AgentCommandHandler } from './AgentCommandHandler';
import { ContextCommandHandler } from './ContextCommandHandler';
import { ILogger } from '../../shared/infrastructure/ILogger';
import { PerformanceMonitor } from '../../infrastructure/PerformanceMonitor';

export class CommandRegistry {
    private disposables: vscode.Disposable[] = [];

    constructor(
        private agentCommandHandler: AgentCommandHandler,
        private contextCommandHandler: ContextCommandHandler,
        private logger: ILogger,
        private performanceMonitor: PerformanceMonitor
    ) {}

    registerCommands(): vscode.Disposable[] {
        // Agent commands
        this.registerCommand('qcli-agents.createAgent', () => 
            this.agentCommandHandler.createAgent()
        );

        this.registerCommand('qcli-agents.openAgent', (agentItem) => 
            this.agentCommandHandler.openAgent(agentItem)
        );

        this.registerCommand('qcli-agents.deleteAgent', (agentItem) => 
            this.agentCommandHandler.deleteAgent(agentItem)
        );

        this.registerCommand('qcli-agents.refreshAgents', () => 
            this.agentCommandHandler.refreshAgents()
        );

        // Context commands
        this.registerCommand('qcli-context.addContextItem', () => 
            this.contextCommandHandler.addContextItem()
        );

        this.registerCommand('qcli-context.removeContextItem', (contextItem) => 
            this.contextCommandHandler.removeContextItem(contextItem)
        );

        this.registerCommand('qcli-context.clearContext', () => 
            this.contextCommandHandler.clearContext()
        );

        this.registerCommand('qcli-context.openContextItem', (contextItem) => 
            this.contextCommandHandler.openContextItem(contextItem)
        );

        this.registerCommand('qcli-context.refreshContext', () => 
            this.contextCommandHandler.refreshContext()
        );

        // Set current agent command
        this.registerCommand('qcli-context.setCurrentAgent', (agentName: string) => {
            this.contextCommandHandler.setCurrentAgent(agentName);
        });

        this.logger.info('Commands registered', { count: this.disposables.length });
        return this.disposables;
    }

    private registerCommand(command: string, callback: (...args: any[]) => any): void {
        const disposable = vscode.commands.registerCommand(command, async (...args) => {
            this.logger.debug('Command executed', { command, args: args.length });
            
            try {
                await this.performanceMonitor.measureAsync(`command.${command}`, async () => {
                    await callback(...args);
                });
            } catch (error) {
                this.logger.error(`Command execution failed: ${command}`, error as Error);
                vscode.window.showErrorMessage(`Command failed: ${(error as Error).message}`);
            }
        });

        this.disposables.push(disposable);
    }

    dispose(): void {
        for (const disposable of this.disposables) {
            disposable.dispose();
        }
        this.disposables = [];
        this.logger.debug('CommandRegistry disposed');
    }
}
