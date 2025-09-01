import { BaseCommandHandler } from './BaseCommandHandler';
import { RefactoredAgentConfigService } from '../../services/RefactoredAgentConfigService';
import { RefactoredAgentManagementService, AgentItem } from '../../services/RefactoredAgentManagementService';
import { ILogger } from '../../shared/infrastructure/ILogger';
import { IVSCodeAdapter } from '../../shared/infrastructure/IVSCodeAdapter';
import { PerformanceMonitor } from '../../infrastructure/PerformanceMonitor';
import { success } from '../../shared/errors/result';

export class AgentCommandHandler extends BaseCommandHandler {
    constructor(
        private agentConfigService: RefactoredAgentConfigService,
        private agentManagementService: RefactoredAgentManagementService,
        logger: ILogger,
        vscodeAdapter: IVSCodeAdapter,
        performanceMonitor: PerformanceMonitor
    ) {
        super(logger, vscodeAdapter, performanceMonitor);
    }

    async createAgent(): Promise<void> {
        await this.executeCommand(
            'createAgent',
            async () => {
                await this.agentManagementService.createNewAgentInteractive();
                return success(undefined);
            }
        );
    }

    async openAgent(agentItem: AgentItem): Promise<void> {
        await this.executeCommand(
            'openAgent',
            async () => {
                await this.agentManagementService.openAgentConfigFile(agentItem);
                return success(undefined);
            }
        );
    }

    async deleteAgent(agentItem: AgentItem): Promise<void> {
        await this.executeCommand(
            'deleteAgent',
            async () => {
                await this.agentManagementService.deleteAgent(agentItem);
                return success(undefined);
            }
        );
    }

    async refreshAgents(): Promise<void> {
        await this.executeCommand(
            'refreshAgents',
            async () => {
                await this.agentManagementService.refreshAgentList();
                return success(undefined);
            },
            'Agent list refreshed'
        );
    }

    async validateAgentName(name: string): Promise<void> {
        const validation = this.agentConfigService.validateAgentName(name);
        if (!validation.success) {
            await this.vscodeAdapter.showErrorMessage(`Invalid agent name: ${validation.error.message}`);
        }
    }
}
