import * as vscode from 'vscode';
import { IAgentRepository } from '../core/agent/IAgentRepository';
import { AgentDomainService } from '../core/agent/AgentDomainService';
import { Agent } from '../core/agent/Agent';
import { Result, success, failure } from '../shared/errors/result';
import { ILogger } from '../shared/infrastructure/ILogger';
import { IVSCodeAdapter } from '../shared/infrastructure/IVSCodeAdapter';
import { FileWatcherPool } from '../infrastructure/FileWatcherPool';
import { BatchProcessor } from '../infrastructure/BatchProcessor';

export interface AgentItem {
    label: string;
    name: string;
    description: string;
    filePath: string;
    contextValue: string;
}

export class RefactoredAgentManagementService {
    private _onAgentListChanged = new vscode.EventEmitter<AgentItem[]>();
    readonly onAgentListChanged = this._onAgentListChanged.event;
    
    private fileWatcher?: vscode.Disposable;
    private batchProcessor: BatchProcessor<string, AgentItem>;
    private disposed = false;

    constructor(
        private agentRepository: IAgentRepository,
        private agentDomainService: AgentDomainService,
        private logger: ILogger,
        private vscodeAdapter: IVSCodeAdapter,
        private fileWatcherPool: FileWatcherPool
    ) {
        this.batchProcessor = new BatchProcessor(
            this.loadAgentsBatch.bind(this),
            this.logger,
            5, // batch size
            200 // delay ms
        );
        
        this.startFileWatcher();
    }

    async getAgentList(): Promise<Result<AgentItem[]>> {
        this.logger.debug('Getting agent list');
        
        const agentsResult = await this.agentRepository.findAll();
        if (!agentsResult.success) {
            return failure(agentsResult.error);
        }

        const agentItems = agentsResult.data.map(agent => this.agentToItem(agent));
        return success(agentItems);
    }

    async createNewAgent(name: string, templateName?: string): Promise<Result<Agent>> {
        this.logger.info('Creating new agent', { name, templateName });
        
        const result = await this.agentDomainService.createAgent(name, 
            templateName ? { name: templateName } : undefined
        );
        
        if (result.success) {
            await this.refreshAgentList();
            await this.vscodeAdapter.showInformationMessage(`Agent '${name}' created successfully`);
        } else {
            await this.vscodeAdapter.showErrorMessage(`Failed to create agent: ${result.error.message}`);
        }
        
        return result;
    }

    async createNewAgentInteractive(): Promise<void> {
        const name = await this.vscodeAdapter.showInputBox({
            prompt: 'Enter agent name',
            validateInput: (value) => {
                const validation = this.agentDomainService.validateAgentName(value);
                return validation.success ? undefined : validation.error.message;
            }
        });

        if (!name) return;

        const templates = ['None', 'basic', 'developer', 'documentation'];
        const selectedTemplate = await this.vscodeAdapter.showQuickPick(
            templates.map(t => ({ label: t, description: t === 'None' ? 'Empty agent' : `${t} template` })),
            { placeHolder: 'Select a template' }
        );

        if (!selectedTemplate) return;

        const templateName = selectedTemplate.label === 'None' ? undefined : selectedTemplate.label;
        await this.createNewAgent(name, templateName);
    }

    async openAgentConfigFile(agentItem: AgentItem): Promise<void> {
        this.logger.info('Opening agent config file', { name: agentItem.name });
        
        try {
            const uri = vscode.Uri.file(agentItem.filePath);
            const document = await this.vscodeAdapter.openTextDocument(uri);
            await this.vscodeAdapter.showTextDocument(document);
        } catch (error) {
            this.logger.error('Failed to open agent config file', error as Error, { name: agentItem.name });
            await this.vscodeAdapter.showErrorMessage(`Failed to open agent config: ${(error as Error).message}`);
        }
    }

    async deleteAgent(agentItem: AgentItem): Promise<void> {
        const confirmation = await this.vscodeAdapter.showWarningMessage(
            `Are you sure you want to delete agent '${agentItem.name}'?`,
            'Delete', 'Cancel'
        );

        if (confirmation !== 'Delete') return;

        const result = await this.agentDomainService.deleteAgent(agentItem.name);
        if (result.success) {
            await this.refreshAgentList();
            await this.vscodeAdapter.showInformationMessage(`Agent '${agentItem.name}' deleted successfully`);
        } else {
            await this.vscodeAdapter.showErrorMessage(`Failed to delete agent: ${result.error.message}`);
        }
    }

    async refreshAgentList(): Promise<void> {
        const result = await this.getAgentList();
        if (result.success) {
            this._onAgentListChanged.fire(result.data);
        }
    }

    private async loadAgentsBatch(names: string[]): Promise<AgentItem[]> {
        const items: AgentItem[] = [];
        
        for (const name of names) {
            try {
                const item = await this.batchProcessor.add(name);
                items.push(item);
            } catch (error) {
                this.logger.warn('Failed to load agent in batch', { name, error: (error as Error).message });
            }
        }
        
        return items;
    }

    private agentToItem(agent: Agent): AgentItem {
        return {
            label: agent.name,
            name: agent.name,
            description: agent.config.description || 'No description',
            filePath: agent.filePath,
            contextValue: 'agent'
        };
    }

    private startFileWatcher(): void {
        const workspaceFolders = this.vscodeAdapter.getWorkspaceFolders();
        if (!workspaceFolders || workspaceFolders.length === 0) return;

        const agentDir = vscode.Uri.joinPath(workspaceFolders[0].uri, '.amazonq', 'cli-agents');
        
        this.fileWatcherPool.watchDirectory(agentDir.fsPath, (event) => {
            this.logger.debug('Agent directory changed', { event });
            this.refreshAgentList();
        }).then(result => {
            if (result.success) {
                this.fileWatcher = result.data;
            }
        });
    }

    dispose(): void {
        if (this.disposed) return;
        
        this.disposed = true;
        this._onAgentListChanged.dispose();
        this.fileWatcher?.dispose();
        this.batchProcessor.dispose();
        
        this.logger.debug('AgentManagementService disposed');
    }
}
