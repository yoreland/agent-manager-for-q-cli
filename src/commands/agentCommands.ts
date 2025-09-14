
/**
 * @fileoverview Agent-related command implementations for VS Code commands.
 * 
 * This module provides command handlers for agent operations including
 * creation, execution, and management. Integrates with VS Code's command
 * palette and tree view context menus.
 * 
 * @author Agent Manager for Q CLI Extension
 * @since 0.1.0
 */

import { ExtensionLogger } from '../services/logger';
import { IAgentManagementService } from '../services/agentManagementService';
import { IErrorHandler } from '../services/errorHandler';

/**
 * Agent-related command implementations.
 * 
 * Provides command handlers for agent operations that can be invoked
 * from VS Code's command palette, tree view context menus, or keyboard
 * shortcuts. Includes error handling and logging for all operations.
 * 
 * @example
 * ```typescript
 * const commands = new AgentCommands(agentService, logger, errorHandler);
 * await commands.createAgent();
 * ```
 */
export class AgentCommands {
    /**
     * Creates a new AgentCommands instance.
     * 
     * @param agentManagementService - Service for agent operations
     * @param logger - Extension logger for command tracking
     * @param errorHandler - Error handler for graceful error recovery
     */
    constructor(
        private readonly agentManagementService: IAgentManagementService,
        private readonly logger: ExtensionLogger,
        private readonly errorHandler: IErrorHandler
    ) {}

    /**
     * Creates a new agent using the interactive creation workflow.
     * 
     * Opens the agent creation webview and guides the user through
     * the agent configuration process with validation and error handling.
     * 
     * @returns Promise that resolves when agent creation is complete
     * @throws {Error} When agent creation fails
     */
    async createAgent(): Promise<void> {
        try {
            this.logger.logUserAction('Create Agent command executed');
            
            // Use the interactive agent creation method
            await this.agentManagementService.createNewAgentInteractive();
            
        } catch (error) {
            const commandError = error as Error;
            this.logger.error('Failed to execute create agent command', commandError);
            
            // Use enhanced error handler for command errors
            await this.errorHandler.handleAgentCreationError(commandError);
        }
    }

    /**
     * Refresh agent tree command implementation
     */
    async refreshAgentTree(): Promise<void> {
        try {
            this.logger.logUserAction('Refresh agent tree command executed');
            const startTime = Date.now();
            
            await this.agentManagementService.refreshAgentList();
            
            this.logger.logTiming('Agent tree view refresh', startTime);
        } catch (error) {
            const commandError = error as Error;
            this.logger.error('Failed to refresh agent tree', commandError);
            
            // Use enhanced error handler for refresh errors
            await this.errorHandler.showErrorMessage(
                'Failed to refresh agent list. Please check your workspace and try again.',
                commandError,
                ['Retry', 'Check Permissions', 'Open Settings']
            );
        }
    }

    /**
     * Open agent configuration file command implementation
     */
    async openAgentFile(agentItem: any): Promise<void> {
        try {
            this.logger.logUserAction('Open agent file command executed', { agentName: agentItem?.label });
            
            if (!agentItem) {
                await this.errorHandler.showErrorMessage('No agent selected to open');
                return;
            }
            
            // Use the agent management service to open the file
            await this.agentManagementService.openAgentConfigFile(agentItem);
            
        } catch (error) {
            const commandError = error as Error;
            this.logger.error('Failed to open agent file', commandError);
            
            // Error handling is already done in the management service
            // Just log the command failure
        }
    }
}