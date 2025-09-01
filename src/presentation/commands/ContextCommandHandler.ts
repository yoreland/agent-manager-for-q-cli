import { BaseCommandHandler } from './BaseCommandHandler';
import { ContextDomainService } from '../../core/context/ContextDomainService';
import { ContextItem, ContextType } from '../../core/context/ContextItem';
import { RefactoredContextTreeProvider } from '../../providers/RefactoredContextTreeProvider';
import { ILogger } from '../../shared/infrastructure/ILogger';
import { IVSCodeAdapter } from '../../shared/infrastructure/IVSCodeAdapter';
import { PerformanceMonitor } from '../../infrastructure/PerformanceMonitor';
import { success } from '../../shared/errors/result';

export class ContextCommandHandler extends BaseCommandHandler {
    private currentAgent: string | undefined;

    constructor(
        private contextDomainService: ContextDomainService,
        private contextTreeProvider: RefactoredContextTreeProvider,
        logger: ILogger,
        vscodeAdapter: IVSCodeAdapter,
        performanceMonitor: PerformanceMonitor
    ) {
        super(logger, vscodeAdapter, performanceMonitor);
    }

    setCurrentAgent(agentName: string): void {
        this.currentAgent = agentName;
        this.contextTreeProvider.setCurrentAgent(agentName);
    }

    async addContextItem(): Promise<void> {
        if (!this.currentAgent) {
            await this.vscodeAdapter.showWarningMessage('Please select an agent first');
            return;
        }

        await this.executeCommand(
            'addContextItem',
            async () => {
                const uri = await this.vscodeAdapter.showOpenDialog({
                    canSelectFiles: true,
                    canSelectFolders: true,
                    canSelectMany: false,
                    openLabel: 'Add to Context'
                });

                if (!uri || uri.length === 0) {
                    return success(undefined);
                }

                const path = uri[0].fsPath;
                const type = await this.determineContextType(path);
                
                return this.contextDomainService.addContextItem(this.currentAgent!, path, type);
            },
            'Context item added successfully'
        );
    }

    async removeContextItem(contextItem: ContextItem): Promise<void> {
        if (!this.currentAgent) {
            await this.vscodeAdapter.showWarningMessage('No agent selected');
            return;
        }

        await this.executeCommand(
            'removeContextItem',
            async () => {
                return this.contextDomainService.removeContextItem(this.currentAgent!, contextItem.path);
            },
            'Context item removed successfully'
        );
    }

    async clearContext(): Promise<void> {
        if (!this.currentAgent) {
            await this.vscodeAdapter.showWarningMessage('No agent selected');
            return;
        }

        const confirmation = await this.vscodeAdapter.showWarningMessage(
            `Clear all context items for agent '${this.currentAgent}'?`,
            'Clear', 'Cancel'
        );

        if (confirmation !== 'Clear') {return;}

        await this.executeCommand(
            'clearContext',
            async () => {
                return this.contextDomainService.clearContext(this.currentAgent!);
            },
            'Context cleared successfully'
        );
    }

    async openContextItem(contextItem: ContextItem): Promise<void> {
        await this.executeCommand(
            'openContextItem',
            async () => {
                if (contextItem.type === ContextType.FILE) {
                    const uri = this.vscodeAdapter.createUri(contextItem.path);
                    const document = await this.vscodeAdapter.openTextDocument(uri);
                    await this.vscodeAdapter.showTextDocument(document);
                } else {
                    await this.vscodeAdapter.showInformationMessage(`Context item: ${contextItem.path}`);
                }
                return success(undefined);
            }
        );
    }

    async refreshContext(): Promise<void> {
        await this.executeCommand(
            'refreshContext',
            async () => {
                await this.contextTreeProvider.refresh();
                return success(undefined);
            },
            'Context refreshed'
        );
    }

    private async determineContextType(path: string): Promise<ContextType> {
        const stat = await this.vscodeAdapter.getFileStat(path);
        if (stat?.type === 'directory') {
            return ContextType.DIRECTORY;
        }
        return ContextType.FILE;
    }
}
