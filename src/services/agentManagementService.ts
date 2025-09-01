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
} from '../types/agent';
import { IAgentConfigService } from './agentConfigService';
import { ExtensionLogger } from './logger';
import { IErrorHandler } from './errorHandler';

/**
 * Interface for Agent Management Service
 */
export interface IAgentManagementService {
    // Agent list management
    getAgentList(): Promise<AgentItem[]>;
    refreshAgentList(): Promise<void>;
    
    // Agent creation
    createNewAgent(name: string): Promise<AgentCreationResult>;
    createNewAgentInteractive(): Promise<void>;
    validateAgentName(name: string): ValidationResult;
    
    // Agent file operations
    openAgentConfigFile(agent: AgentItem): Promise<void>;
    
    // Agent file watching
    startFileWatcher(): void;
    stopFileWatcher(): void;
    
    // Event handling
    onAgentListChanged: vscode.Event<AgentItem[]>;
    
    // Lifecycle management
    dispose(): void;
}

/**
 * Service for managing Q CLI Agent business logic
 * Handles agent list management, creation workflows, and file system watching
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
            
            // Convert files to agent items
            const agentItems: AgentItem[] = [];
            
            for (const filePath of agentFiles) {
                try {
                    const config = await this.agentConfigService.readAgentConfig(filePath);
                    const agentItem = this.createAgentItemFromConfig(config, filePath);
                    agentItems.push(agentItem);
                } catch (error) {
                    this.logger.warn(`Failed to load agent config from ${filePath}`, error as Error);
                    // Create a placeholder item for invalid configs
                    const agentName = this.agentConfigService.extractAgentNameFromPath(filePath);
                    const invalidItem = this.createInvalidAgentItem(agentName, filePath, error as Error);
                    agentItems.push(invalidItem);
                }
            }
            
            // Sort agents by name
            agentItems.sort((a, b) => a.label.localeCompare(b.label));
            
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
     * Create a new agent with the given name
     */
    async createNewAgent(name: string): Promise<AgentCreationResult> {
        try {
            this.logger.logUserAction('createNewAgent', { name });
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
            
            // Check if agent already exists
            const exists = await this.agentConfigService.isAgentNameExists(name);
            if (exists) {
                const error = new Error(`Agent '${name}' already exists`);
                await this.errorHandler.handleAgentCreationError(error, name);
                
                const result: AgentCreationResult = {
                    success: false,
                    message: `Agent '${name}' already exists`
                };
                this.logger.warn('Agent creation failed - already exists', { name });
                return result;
            }
            
            // Create default configuration
            const config = this.agentConfigService.createDefaultAgentConfig(name);
            
            // Write the agent configuration file
            await this.agentConfigService.writeAgentConfig(name, config);
            
            // Create agent item
            const filePath = this.agentConfigService.getAgentFilePath(name);
            const agentItem = this.createAgentItemFromConfig(config, filePath);
            
            // Add to internal list
            this.agentItems.push(agentItem);
            this.agentItems.sort((a, b) => a.label.localeCompare(b.label));
            
            // Notify listeners
            this._onAgentListChanged.fire(this.agentItems);
            
            // Show success message with helpful actions
            await this.errorHandler.showSuccessMessage(
                `Agent '${name}' created successfully!`,
                ['Open File', 'Create Another']
            );
            
            const result: AgentCreationResult = {
                success: true,
                message: `Agent '${name}' created successfully`,
                agentItem
            };
            
            this.logger.logTiming('createNewAgent', startTime);
            this.logger.info('Agent created successfully', { name, filePath });
            
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
     * Create an AgentItem from an AgentConfig
     */
    private createAgentItemFromConfig(config: AgentConfig, filePath: string): AgentItem {
        return {
            label: config.name,
            description: config.description || 'Q CLI Agent',
            iconPath: AGENT_CONSTANTS.DEFAULT_ICON,
            contextValue: AGENT_CONSTANTS.CONTEXT_VALUES.AGENT_ITEM,
            filePath,
            config,
            collapsibleState: vscode.TreeItemCollapsibleState.None,
            command: {
                command: AGENT_COMMANDS.OPEN_AGENT,
                title: 'Open Agent Configuration',
                arguments: [{ label: config.name, filePath, config }]
            }
        };
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