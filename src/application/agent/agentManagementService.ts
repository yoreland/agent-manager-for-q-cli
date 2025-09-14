/**
 * @fileoverview Agent Management Service for Q CLI agent operations.
 * 
 * This module provides comprehensive agent management functionality including
 * creation, validation, execution, and file operations for both local and
 * global Q CLI agents.
 * 
 * @author Agent Manager for Q CLI Extension
 * @since 0.1.0
 */

import * as vscode from 'vscode';
import * as path from 'path';
import { 
    AgentItem, 
    AgentConfig, 
    AgentCreationResult, 
    ValidationResult,
    DEFAULT_AGENT_CONFIG,
    AGENT_CONSTANTS,
    AGENT_COMMANDS
} from '../../shared/types/agent';
import { IAgentConfigService } from './agentConfigService';
import { ExtensionLogger } from '../shared/logger';
import { IErrorHandler } from '../shared/errorHandler';
import { AgentLocation } from '../../domain/agent/AgentLocationService';

/**
 * Interface for Agent Management Service operations.
 * 
 * Defines the contract for managing Q CLI agents including creation,
 * validation, execution, and file operations.
 * 
 * @interface IAgentManagementService
 */
export interface IAgentManagementService {
    /** Agent list management operations */
    getAgentList(): Promise<AgentItem[]>;
    refreshAgentList(): Promise<void>;
    
    /** Agent creation operations */
    createNewAgent(name: string, location?: AgentLocation): Promise<AgentCreationResult>;
    createNewAgentInteractive(): Promise<void>;
    validateAgentName(name: string): ValidationResult;
    
    /** Agent file operations */
    openAgentConfigFile(agent: AgentItem): Promise<void>;
    deleteAgent(agentName: string): Promise<void>;
    
    // Agent file watching
    startFileWatcher(): void;
    stopFileWatcher(): void;
    
    // Event handling
    onAgentListChanged: vscode.Event<AgentItem[]>;
    
    // Lifecycle management
    dispose(): void;
}

/**
 * Service for managing Q CLI Agent business logic and operations.
 * 
 * Provides comprehensive agent management including creation workflows,
 * validation, execution, file system watching, and event handling.
 * Supports both local (.amazonq/cli-agents/) and global (~/.aws/amazonq/cli-agents/)
 * agent locations.
 * 
 * @example
 * ```typescript
 * const service = new AgentManagementService(configService, logger, errorHandler);
 * const agents = await service.getAgentList();
 * await service.createNewAgent('my-agent', 'local');
 * ```
 */
export class AgentManagementService implements IAgentManagementService {
    private readonly agentConfigService: IAgentConfigService;
    private readonly logger: ExtensionLogger;
    private readonly errorHandler: IErrorHandler;
    private readonly disposables: vscode.Disposable[] = [];
    
    // Event emitters
    private readonly _onAgentListChanged = new vscode.EventEmitter<AgentItem[]>();
    public readonly onAgentListChanged = this._onAgentListChanged.event;
    
    // State management
    private agentItems: AgentItem[] = [];
    private fileWatcher: vscode.FileSystemWatcher | undefined;
    private isWatchingFiles = false;
    
    /**
     * Creates a new AgentManagementService instance.
     * 
     * @param agentConfigService - Service for agent configuration operations
     * @param logger - Extension logger for debugging and monitoring
     * @param errorHandler - Error handling service for graceful error recovery
     */
    constructor(agentConfigService: IAgentConfigService, logger: ExtensionLogger, errorHandler: IErrorHandler) {
        this.agentConfigService = agentConfigService;
        this.logger = logger;
        this.errorHandler = errorHandler;
        
        // Register disposables
        this.disposables.push(this._onAgentListChanged);
        
        this.logger.debug('AgentManagementService initialized');
    }

    /**
     * Get the current list of agent items
     */
    async getAgentList(): Promise<AgentItem[]> {
        try {
            this.logger.debug('Getting agent list');
            const startTime = Date.now();
            
            // Scan for agent files
            const agentFiles = await this.agentConfigService.scanAgentFiles();
            this.logger.debug(`Found ${agentFiles.length} agent files`);
            
            // Convert files to agent items with location and conflict information
            const agentItems: AgentItem[] = [];
            const agentNames = new Set<string>();
            const conflictingNames = new Set<string>();
            
            // First pass: identify conflicts
            for (const filePath of agentFiles) {
                try {
                    const config = await this.agentConfigService.readAgentConfig(filePath);
                    if (agentNames.has(config.name)) {
                        conflictingNames.add(config.name);
                    }
                    agentNames.add(config.name);
                } catch (error) {
                    // Skip invalid configs for conflict detection
                }
            }
            
            // Second pass: create agent items with conflict information
            for (const filePath of agentFiles) {
                try {
                    const config = await this.agentConfigService.readAgentConfig(filePath);
                    const isRunning = this.isAgentRunning(config.name);
                    const location = this.determineLocationFromPath(filePath);
                    const hasConflict = conflictingNames.has(config.name);
                    
                    const agentItem = this.createAgentItemFromConfig(
                        config, 
                        filePath, 
                        isRunning, 
                        location, 
                        hasConflict
                    );
                    agentItems.push(agentItem);
                } catch (error) {
                    this.logger.warn(`Failed to load agent config from ${filePath}`, error as Error);
                    // Create a placeholder item for invalid configs
                    const agentName = this.agentConfigService.extractAgentNameFromPath(filePath);
                    const invalidItem = this.createInvalidAgentItem(agentName, filePath, error as Error);
                    agentItems.push(invalidItem);
                }
            }
            
            // Sort agents by location first, then by name
            agentItems.sort((a, b) => {
                const aLocation = (a as any).location || AgentLocation.Local;
                const bLocation = (b as any).location || AgentLocation.Local;
                
                if (aLocation !== bLocation) {
                    return aLocation === AgentLocation.Local ? -1 : 1;
                }
                return a.label.localeCompare(b.label);
            });
            
            // Update internal state
            this.agentItems = agentItems;
            
            this.logger.logTiming('getAgentList', startTime);
            this.logger.debug(`Agent list retrieved with ${agentItems.length} items`);
            
            return agentItems;
        } catch (error) {
            const errorMessage = 'Failed to get agent list';
            this.logger.error(errorMessage, error as Error);
            
            // Handle file system errors with user feedback
            await this.errorHandler.handleFileSystemError(
                error as Error, 
                'scan agent directory',
                this.agentConfigService.getAgentDirectory()
            );
            
            throw new Error(`${errorMessage}: ${(error as Error).message}`);
        }
    }

    /**
     * Refresh the agent list and notify listeners
     */
    async refreshAgentList(): Promise<void> {
        try {
            this.logger.debug('Refreshing agent list');
            const agentItems = await this.getAgentList();
            
            // Notify listeners of the change
            this._onAgentListChanged.fire(agentItems);
            
            this.logger.info(`Agent list refreshed with ${agentItems.length} items`);
        } catch (error) {
            const errorMessage = 'Failed to refresh agent list';
            this.logger.error(errorMessage, error as Error);
            
            // Show error to user but don't rethrow to avoid breaking the UI
            await this.errorHandler.showErrorMessage(
                'Unable to refresh agent list. Please try again.',
                error as Error,
                ['Retry', 'Check Permissions']
            );
            
            throw error;
        }
    }

    /**
     * Create a new agent with the given name and location
     */
    async createNewAgent(name: string, location: AgentLocation = AgentLocation.Local): Promise<AgentCreationResult> {
        try {
            this.logger.logUserAction('createNewAgent', { name, location });
            const startTime = Date.now();
            
            // Validate the agent name
            const nameValidation = this.validateAgentName(name);
            if (!nameValidation.isValid) {
                // Handle validation error with detailed feedback
                await this.errorHandler.handleValidationError(nameValidation, `Agent name '${name}'`);
                
                const result: AgentCreationResult = {
                    success: false,
                    message: `Invalid agent name: ${nameValidation.errors.join(', ')}`
                };
                this.logger.warn('Agent creation failed due to invalid name', { name, errors: nameValidation.errors });
                return result;
            }
            
            // Create default configuration
            const config = this.agentConfigService.createDefaultAgentConfig(name);
            
            // Write the agent configuration file with location
            await this.agentConfigService.writeAgentConfig(name, config, location);
            
            // Create agent item with location information
            const filePath = location === AgentLocation.Local 
                ? this.agentConfigService.getAgentFilePath(name)
                : path.join(process.env.HOME || '~', '.aws', 'amazonq', 'cli-agents', `${name}.json`);
            const isRunning = this.isAgentRunning(name);
            const agentItem = this.createAgentItemFromConfig(config, filePath, isRunning, location, false);
            
            // Add to internal list
            this.agentItems.push(agentItem);
            this.agentItems.sort((a, b) => {
                const aLocation = (a as any).location || AgentLocation.Local;
                const bLocation = (b as any).location || AgentLocation.Local;
                
                if (aLocation !== bLocation) {
                    return aLocation === AgentLocation.Local ? -1 : 1;
                }
                return a.label.localeCompare(b.label);
            });
            
            // Notify listeners
            this._onAgentListChanged.fire(this.agentItems);
            
            // Show success message with helpful actions
            await this.errorHandler.showSuccessMessage(
                `Agent '${name}' created successfully in ${location} location!`,
                ['Open File', 'Create Another']
            );
            
            const result: AgentCreationResult = {
                success: true,
                message: `Agent '${name}' created successfully in ${location} location`,
                agentItem
            };
            
            this.logger.logTiming('createNewAgent', startTime);
            this.logger.info('Agent created successfully', { name, location, filePath });
            
            return result;
        } catch (error) {
            // Handle creation error with detailed feedback
            await this.errorHandler.handleAgentCreationError(error as Error, name);
            
            const result: AgentCreationResult = {
                success: false,
                message: `Failed to create agent '${name}': ${(error as Error).message}`,
                error: error as Error
            };
            
            return result;
        }
    }

    /**
     * Validate an agent name
     */
    validateAgentName(name: string): ValidationResult {
        return this.agentConfigService.validateAgentName(name);
    }

    /**
     * Start file system watcher for agent directory
     */
    startFileWatcher(): void {
        if (this.isWatchingFiles) {
            this.logger.debug('File watcher already started');
            return;
        }
        
        try {
            const agentDirectory = this.agentConfigService.getAgentDirectory();
            const watchPattern = path.join(agentDirectory, `*${AGENT_CONSTANTS.AGENT_FILE_EXTENSION}`);
            
            this.logger.debug('Starting file watcher', { pattern: watchPattern });
            
            // Create file system watcher
            this.fileWatcher = vscode.workspace.createFileSystemWatcher(
                new vscode.RelativePattern(agentDirectory, `*${AGENT_CONSTANTS.AGENT_FILE_EXTENSION}`)
            );
            
            // Handle file creation
            this.fileWatcher.onDidCreate(async (uri) => {
                this.logger.debug('Agent file created', { path: uri.fsPath });
                await this.handleFileSystemChange('created', uri.fsPath);
            });
            
            // Handle file changes
            this.fileWatcher.onDidChange(async (uri) => {
                this.logger.debug('Agent file changed', { path: uri.fsPath });
                await this.handleFileSystemChange('changed', uri.fsPath);
            });
            
            // Handle file deletion
            this.fileWatcher.onDidDelete(async (uri) => {
                this.logger.debug('Agent file deleted', { path: uri.fsPath });
                await this.handleFileSystemChange('deleted', uri.fsPath);
            });

            // Watch for terminal changes to update agent status
            vscode.window.onDidOpenTerminal((terminal) => {
                this.logger.debug(`Terminal opened: ${terminal.name}`);
                // Only refresh if it's a Q CLI terminal
                if (terminal.name.toLowerCase().includes('q cli')) {
                    setTimeout(() => this.refreshAgentList(), 500);
                }
            });

            vscode.window.onDidCloseTerminal((terminal) => {
                this.logger.debug(`Terminal closed: ${terminal.name}`);
                // Only refresh if it's a Q CLI terminal
                if (terminal.name.toLowerCase().includes('q cli')) {
                    setTimeout(() => this.refreshAgentList(), 500);
                }
            });
            
            // Register disposable
            this.disposables.push(this.fileWatcher);
            this.isWatchingFiles = true;
            
            this.logger.info('File watcher started successfully', { pattern: watchPattern });
        } catch (error) {
            const errorMessage = 'Failed to start file watcher';
            this.logger.error(errorMessage, error as Error);
            
            // Handle file watcher errors with user feedback
            this.errorHandler.handleFileSystemError(
                error as Error,
                'start file system watcher',
                this.agentConfigService.getAgentDirectory()
            ).catch(err => {
                this.logger.error('Error showing file watcher error to user', err);
            });
            
            throw new Error(`${errorMessage}: ${(error as Error).message}`);
        }
    }

    /**
     * Stop file system watcher
     */
    stopFileWatcher(): void {
        if (!this.isWatchingFiles || !this.fileWatcher) {
            this.logger.debug('File watcher not running');
            return;
        }
        
        try {
            this.logger.debug('Stopping file watcher');
            
            this.fileWatcher.dispose();
            this.fileWatcher = undefined;
            this.isWatchingFiles = false;
            
            this.logger.info('File watcher stopped successfully');
        } catch (error) {
            this.logger.error('Error stopping file watcher', error as Error);
        }
    }

    /**
     * Handle file system changes
     */
    private async handleFileSystemChange(changeType: 'created' | 'changed' | 'deleted', filePath: string): Promise<void> {
        try {
            // Validate that this is an agent file
            if (!this.agentConfigService.isValidAgentFilePath(filePath)) {
                this.logger.debug('Ignoring non-agent file change', { filePath, changeType });
                return;
            }
            
            this.logger.debug('Processing file system change', { changeType, filePath });
            
            // Debounce rapid changes
            await this.debounceRefresh();
        } catch (error) {
            this.logger.error('Error handling file system change', error as Error);
        }
    }

    /**
     * Debounce refresh operations to avoid excessive updates
     */
    private refreshTimeout?: NodeJS.Timeout;
    private async debounceRefresh(): Promise<void> {
        // Clear existing timeout
        if (this.refreshTimeout) {
            clearTimeout(this.refreshTimeout);
        }
        
        // Set new timeout
        this.refreshTimeout = setTimeout(async () => {
            try {
                await this.refreshAgentList();
            } catch (error) {
                this.logger.error('Error during debounced refresh', error as Error);
            }
        }, 500); // 500ms debounce
    }

    /**
     * Check if an agent is currently running in any terminal
     */
    private isAgentRunning(agentName: string): boolean {
        const terminals = vscode.window.terminals;
        
        const isRunning = terminals.some(terminal => {
            const terminalName = terminal.name;
            const expectedName = `Q CLI - ${agentName}`;
            return terminalName === expectedName;
        });
        
        return isRunning;
    }

    /**
     * Get appropriate icon for agent based on running status
     */
    private getAgentIcon(agentName: string): vscode.ThemeIcon {
        if (this.isAgentRunning(agentName)) {
            return new vscode.ThemeIcon('robot', new vscode.ThemeColor('charts.green'));
        }
        return AGENT_CONSTANTS.DEFAULT_ICON;
    }

    /**
     * Create an AgentItemWithLocation from an AgentConfig
     */
    private createAgentItemFromConfig(
        config: AgentConfig, 
        filePath: string, 
        isRunning?: boolean, 
        location?: AgentLocation,
        hasConflict?: boolean
    ): AgentItem {
        // Determine location from file path if not provided
        const agentLocation = location || this.determineLocationFromPath(filePath);
        
        return {
            label: config.name,
            iconPath: isRunning ? 
                new vscode.ThemeIcon('robot', new vscode.ThemeColor('charts.green')) : 
                AGENT_CONSTANTS.DEFAULT_ICON,
            contextValue: AGENT_CONSTANTS.CONTEXT_VALUES.AGENT_ITEM,
            filePath,
            config,
            collapsibleState: vscode.TreeItemCollapsibleState.None,
            command: {
                command: AGENT_COMMANDS.OPEN_AGENT,
                title: 'Open Agent Configuration',
                arguments: [{ label: config.name, filePath, config }]
            },
            // Add location information
            location: agentLocation,
            hasConflict: hasConflict || false
        } as AgentItem & { location: AgentLocation; hasConflict: boolean };
    }

    /**
     * Determine agent location from file path
     */
    private determineLocationFromPath(filePath: string): AgentLocation {
        // Check if path contains global directory pattern
        if (filePath.includes('.aws/amazonq/cli-agents')) {
            return AgentLocation.Global;
        }
        return AgentLocation.Local;
    }

    /**
     * Create an invalid agent item for files that couldn't be loaded
     */
    private createInvalidAgentItem(name: string, filePath: string, error: Error): AgentItem {
        return {
            label: `${name} (Invalid)`,
            description: `Error: ${error.message}`,
            iconPath: new vscode.ThemeIcon('error'),
            contextValue: 'invalidAgentItem',
            filePath,
            config: {
                ...DEFAULT_AGENT_CONFIG,
                name
            },
            collapsibleState: vscode.TreeItemCollapsibleState.None
        };
    }



    /**
     * Prompt user for agent name with enhanced validation and feedback
     */
    async promptForAgentName(): Promise<string | undefined> {
        let attempts = 0;
        const maxAttempts = 3;
        
        while (attempts < maxAttempts) {
            attempts++;
            
            const result = await vscode.window.showInputBox({
                prompt: attempts === 1 
                    ? 'Enter a name for the new agent' 
                    : `Enter a name for the new agent (Attempt ${attempts}/${maxAttempts})`,
                placeHolder: 'my-custom-agent',
                ignoreFocusOut: true,
                validateInput: async (value: string) => {
                    if (!value || value.trim().length === 0) {
                        return 'Agent name cannot be empty';
                    }
                    
                    const trimmedValue = value.trim();
                    
                    // Validate name format
                    const validation = this.validateAgentName(trimmedValue);
                    if (!validation.isValid) {
                        return validation.errors[0];
                    }
                    
                    // Check if name already exists
                    try {
                        const exists = await this.agentConfigService.isAgentNameExists(trimmedValue);
                        if (exists) {
                            return `Agent '${trimmedValue}' already exists. Please choose a different name.`;
                        }
                    } catch (error) {
                        this.logger.warn('Error checking agent name existence during input validation', error as Error);
                        // Don't block input, let the creation process handle this error
                    }
                    
                    return undefined;
                }
            });
            
            if (result === undefined) {
                // User cancelled
                this.logger.debug('Agent name input cancelled by user');
                return undefined;
            }
            
            const trimmedResult = result.trim();
            
            // Final validation before returning
            const finalValidation = this.validateAgentName(trimmedResult);
            if (finalValidation.isValid) {
                return trimmedResult;
            }
            
            // Show validation error and allow retry
            await this.errorHandler.handleValidationError(
                finalValidation, 
                `Agent name '${trimmedResult}'`
            );
            
            if (attempts >= maxAttempts) {
                await this.errorHandler.showErrorMessage(
                    'Maximum attempts reached. Please try again later.',
                    undefined,
                    ['Try Again', 'Cancel']
                );
                return undefined;
            }
        }
        
        return undefined;
    }

    /**
     * Create new agent with user interaction
     */
    async createNewAgentInteractive(): Promise<void> {
        try {
            this.logger.logUserAction('createNewAgentInteractive');
            
            // Prompt for agent name with enhanced validation
            const agentName = await this.promptForAgentName();
            if (!agentName) {
                this.logger.debug('Agent creation cancelled by user');
                return;
            }
            
            // Create the agent (error handling is done in createNewAgent)
            const result = await this.createNewAgent(agentName);
            
            // Handle success case with additional actions
            if (result.success && result.agentItem) {
                const action = await this.errorHandler.showSuccessMessage(
                    `Agent '${agentName}' created successfully!`,
                    ['Open File', 'Create Another', 'View in Explorer']
                );
                
                // Handle user action
                await this.handlePostCreationAction(action, result.agentItem);
            }
            // Error handling is already done in createNewAgent method
            
        } catch (error) {
            // Handle unexpected errors
            await this.errorHandler.handleAgentCreationError(error as Error);
        }
    }

    /**
     * Handle post-creation user actions
     */
    private async handlePostCreationAction(action: string | undefined, agentItem: AgentItem): Promise<void> {
        try {
            switch (action) {
                case 'Open File':
                    const document = await vscode.workspace.openTextDocument(agentItem.filePath);
                    await vscode.window.showTextDocument(document);
                    break;
                    
                case 'Create Another':
                    // Recursively call the interactive creation
                    await this.createNewAgentInteractive();
                    break;
                    
                case 'View in Explorer':
                    await vscode.commands.executeCommand('revealFileInOS', vscode.Uri.file(agentItem.filePath));
                    break;
                    
                default:
                    // No action selected, do nothing
                    break;
            }
        } catch (error) {
            this.logger.error('Error handling post-creation action', error as Error);
            await this.errorHandler.showErrorMessage(
                'Action completed, but there was an issue with the follow-up action',
                error as Error
            );
        }
    }

    /**
     * Open agent configuration file in VS Code editor
     */
    async openAgentConfigFile(agent: AgentItem): Promise<void> {
        try {
            this.logger.logUserAction('openAgentConfigFile', { agentName: agent.label, filePath: agent.filePath });
            
            // Check if file exists
            const fileExists = await this.agentConfigService.fileExists(agent.filePath);
            if (!fileExists) {
                const error = new Error(`Agent configuration file not found: ${agent.filePath}`);
                await this.errorHandler.handleFileAccessError(error, agent.filePath);
                return;
            }
            
            // Open the file in VS Code editor
            const document = await vscode.workspace.openTextDocument(agent.filePath);
            await vscode.window.showTextDocument(document, {
                preview: false, // Open in a new tab, not preview
                preserveFocus: false // Focus the editor
            });
            
            this.logger.info('Agent configuration file opened successfully', { 
                agentName: agent.label, 
                filePath: agent.filePath 
            });
            
        } catch (error) {
            const errorMessage = `Failed to open agent configuration file for '${agent.label}'`;
            this.logger.error(errorMessage, error as Error);
            
            // Handle file access errors with user feedback
            await this.errorHandler.handleFileAccessError(error as Error, agent.filePath);
            
            throw new Error(`${errorMessage}: ${(error as Error).message}`);
        }
    }

    /**
     * Delete an agent by name
     */
    async deleteAgent(agentName: string): Promise<void> {
        try {
            this.logger.logUserAction('deleteAgent', { agentName });
            
            // Find the agent in the current list to get its location
            const agents = await this.getAgentList();
            const agent = agents.find(a => a.label === agentName || a.name === agentName);
            
            if (!agent) {
                throw new Error(`Agent '${agentName}' not found`);
            }
            
            // Determine location from agent item
            const agentWithLocation = agent as AgentItem & { location?: AgentLocation };
            const location = agentWithLocation.location || AgentLocation.Local;
            
            // Delete the agent configuration file
            await this.agentConfigService.deleteAgentConfig(agentName, location);
            
            // Refresh the agent list to update the tree view
            await this.refreshAgentList();
            
            this.logger.info('Agent deleted successfully', { 
                agentName, 
                location,
                filePath: agent.filePath 
            });
            
        } catch (error) {
            const errorMessage = `Failed to delete agent '${agentName}'`;
            this.logger.error(errorMessage, error as Error);
            
            // Handle file access errors with user feedback
            await this.errorHandler.handleFileAccessError(error as Error, agentName);
            
            throw new Error(`${errorMessage}: ${(error as Error).message}`);
        }
    }

    /**
     * Get agent statistics
     */
    getAgentStatistics(): { total: number; valid: number; invalid: number } {
        const total = this.agentItems.length;
        const invalid = this.agentItems.filter(item => item.contextValue === 'invalidAgentItem').length;
        const valid = total - invalid;
        
        return { total, valid, invalid };
    }

    /**
     * Dispose of resources
     */
    dispose(): void {
        this.logger.debug('Disposing AgentManagementService');
        
        // Stop file watcher
        this.stopFileWatcher();
        
        // Clear refresh timeout
        if (this.refreshTimeout) {
            clearTimeout(this.refreshTimeout);
        }
        
        // Dispose all disposables
        this.disposables.forEach(disposable => {
            try {
                disposable.dispose();
            } catch (error) {
                this.logger.error('Error disposing resource', error as Error);
            }
        });
        
        this.disposables.length = 0;
        this.agentItems = [];
        
        this.logger.debug('AgentManagementService disposed');
    }
}