/**
 * @fileoverview Main extension entry point for Agent Manager for Q CLI.
 * 
 * This module handles VS Code extension lifecycle, command registration,
 * and initialization of core services including agent management,
 * tree providers, and webview panels.
 * 
 * @author Agent Manager for Q CLI Extension
 * @since 0.1.0
 */

import * as vscode from 'vscode';
import { ExtensionState, LogLevel } from './shared/types/extension';
import { ExtensionLogger } from './application/shared/logger';
import { PerformanceMonitor } from './shared/utils/performance';
import { CompatibilityService, ISafeExtensionContext } from './application/shared/compatibilityService';
import { ErrorHandler } from './application/shared/errorHandler';
import { PromptZService } from './infrastructure/promptz/PromptZService';
import { PromptZSyncCommand } from './presentation/commands/promptz-sync';
// ContextTreeProvider and ContextPanel are now lazy-loaded for better performance

/** Global extension state container */
let extensionState: ExtensionState | undefined;

/** Compatibility service for cross-IDE support */
let compatibilityService: CompatibilityService | undefined;

/** Safe context wrapper for extension operations */
let safeContext: ISafeExtensionContext | undefined;

/** Global error handler instance */
let errorHandler: ErrorHandler | undefined;

/**
 * Activates the VS Code extension.
 * 
 * Called when the extension is first activated. Initializes core services,
 * registers commands, and sets up tree providers. Optimized for fast
 * activation (target < 100ms).
 * 
 * @param context - VS Code extension context
 * @returns Promise that resolves when activation is complete
 * 
 * @example
 * ```typescript
 * // Called automatically by VS Code
 * await activate(context);
 * ```
 */
export async function activate(context: vscode.ExtensionContext): Promise<void> {
    // Start performance monitoring
    const performanceMonitor = PerformanceMonitor.getInstance();
    performanceMonitor.startActivationTracking();
    
    const startTime = Date.now();
    
    try {
        // Initialize compatibility service first
        compatibilityService = new CompatibilityService({
            enableFallbacks: true,
            logCompatibilityIssues: isDebugMode(),
            strictMode: false
        });

        // Create safe extension context
        safeContext = compatibilityService.createSafeContext(context);
        
        // Log IDE detection results
        const ideInfo = compatibilityService.getIDEInfo();
        
        // Initialize minimal required components synchronously
        const outputChannel = vscode.window.createOutputChannel('Agent Manager for Q CLI');
        const logger = new ExtensionLogger(
            outputChannel, 
            getLogLevel(), 
            isDebugMode(), 
            getShowOutputOnError(), 
            getLogToConsole()
        );
        
        // Initialize error handler
        errorHandler = new ErrorHandler(logger);
        
        // Log compatibility information
        logger.logLifecycle(`Extension activation started on ${ideInfo.type} IDE`);
        if (ideInfo.knownLimitations.length > 0) {
            logger.logCompatibility(`Known limitations for ${ideInfo.type}: ${ideInfo.knownLimitations.join(', ')}`);
        }
        
        // Initialize extension state with minimal data
        extensionState = {
            isActivated: false,
            contextItems: [],
            outputChannel,
            logger,
            extensionContext: context,
            debugMode: isDebugMode()
        };

        // Register the output channel for disposal
        context.subscriptions.push(outputChannel);

        // Register essential components synchronously for fast activation
        if (safeContext) {
            registerCoreCommands(safeContext, logger);
            registerConfigurationChangeListener(safeContext, logger);
        } else {
            throw new Error('Failed to create safe extension context');
        }

        // Mark extension as activated early
        extensionState.isActivated = true;
        
        // Record performance metrics
        const metrics = performanceMonitor.endActivationTracking();
        logger.logLifecycle('Extension core activation completed', { 
            activationTime: `${metrics.activationTime}ms`,
            memoryUsed: `${Math.round(metrics.memoryUsage.heapUsed / 1024 / 1024)}MB`
        });

        // Check performance requirements
        const perfCheck = performanceMonitor.checkPerformanceRequirements();
        if (!perfCheck.activationTimeOk) {
            logger.warn(`Activation time (${perfCheck.details.activationTime}ms) exceeds target (${perfCheck.details.activationTimeTarget}ms)`);
        }

        // Defer non-critical initialization to avoid blocking activation
        setImmediate(() => {
            initializeNonCriticalComponents(context, logger, startTime);
        });

    } catch (error) {
        const activationError = error as Error;
        
        // Use error handler if available, otherwise fallback to basic error handling
        if (errorHandler && safeContext) {
            errorHandler.handleActivationError(activationError, safeContext);
        } else {
            const errorMessage = `Failed to activate Agent Manager for Q CLI extension: ${activationError.message}`;
            
            // Log error details
            if (extensionState?.logger) {
                extensionState.logger.error(errorMessage, activationError);
            } else {
                console.error(errorMessage, activationError);
            }

            // Show user-friendly error message
            vscode.window.showErrorMessage(
                'Agent Manager for Q CLI extension failed to activate. Check the output panel for details.',
                'Show Output'
            ).then(selection => {
                if (selection === 'Show Output' && extensionState?.outputChannel) {
                    extensionState.outputChannel.show();
                }
            });

            // Re-throw to prevent partial activation
            throw activationError;
        }
    }
}

/**
 * Deactivates the VS Code extension.
 * 
 * Called when the extension is being deactivated. Performs cleanup
 * of all resources, disposes services, and prevents memory leaks.
 * 
 * @returns void
 * 
 * @example
 * ```typescript
 * // Called automatically by VS Code
 * deactivate();
 * ```
 */
export function deactivate(): void {
    if (extensionState?.logger) {
        extensionState.logger.logLifecycle('Extension deactivation started');
    }

    // Clean up resources to prevent memory leaks
    if (extensionState) {
        extensionState.isActivated = false;
        
        // Clear context items array
        extensionState.contextItems = [];
        
        // Dispose of tree providers if they exist
        if (extensionState.contextTreeProvider && typeof extensionState.contextTreeProvider.dispose === 'function') {
            extensionState.contextTreeProvider.dispose();
        }
        
        if (extensionState.agentTreeProvider && typeof extensionState.agentTreeProvider.dispose === 'function') {
            extensionState.agentTreeProvider.dispose();
        }
        
        // Dispose of services if they exist
        if (extensionState.contextResourceService && typeof extensionState.contextResourceService.dispose === 'function') {
            extensionState.contextResourceService.dispose();
        }
        
        // Clear any cached data
        clearCachedData();
        
        // Output channel will be disposed automatically by VS Code
        extensionState.logger.logLifecycle('Extension deactivation completed');
    }

    // Clean up performance monitor
    const performanceMonitor = PerformanceMonitor.getInstance();
    performanceMonitor.dispose();

    // Clear global state
    extensionState = undefined;
    
    // Force garbage collection if available (development only)
    if (global.gc && process.env['NODE_ENV'] !== 'production') {
        global.gc();
    }
}

/**
 * Register core commands that must be available immediately
 * Optimized for fast registration during activation
 */
function registerCoreCommands(context: ISafeExtensionContext, logger: ExtensionLogger): void {
    try {
        // Register the main command to focus Agent Manager for Q CLI tree view
        const openContextManagerCommand = vscode.commands.registerCommand(
            'qcli-agent.openAgentManager',
            async () => {
                try {
                    logger.logUserAction('Focus Agent Manager for Q CLI command executed');
                    
                    // Focus the Agent Manager for Q CLI tree view
                    await vscode.commands.executeCommand('qcli-context-tree.focus');
                    
                    // Show success message to user
                    vscode.window.showInformationMessage('Agent Manager for Q CLI에 포커스했습니다!');
                    
                    logger.info('Agent Manager for Q CLI tree view focused successfully');
                } catch (error) {
                    const commandError = error as Error;
                    logger.error('Failed to focus Agent Manager for Q CLI tree view', commandError);
                    
                    vscode.window.showErrorMessage(
                        `Failed to focus Agent Manager for Q CLI: ${commandError.message}`
                    );
                }
            }
        );

        // Register Agent management commands
        const createAgentCommand = vscode.commands.registerCommand(
            'qcli-agents.createAgent',
            async () => {
                try {
                    logger.logUserAction('Create Agent command executed');
                    
                    // Import and create wizard webview provider
                    const { WizardWebviewProvider } = await import('./presentation/tree-providers/wizardWebviewProvider');
                    const wizardProvider = new WizardWebviewProvider(context, logger);
                    
                    // Show the wizard
                    await wizardProvider.showWizard();
                    
                    logger.info('Agent creation wizard opened successfully');
                } catch (error) {
                    const commandError = error as Error;
                    logger.error('Failed to open agent creation wizard', commandError);
                    
                    vscode.window.showErrorMessage(
                        `Failed to open agent creation wizard: ${commandError.message}`
                    );
                }
            }
        );

        // Register PromptZ sync command
        const promptzService = new PromptZService();
        const promptzSyncCommand = vscode.commands.registerCommand(
            'qcli-agents.syncFromPromptz',
            async () => {
                try {
                    logger.logUserAction('PromptZ sync command executed');
                    const { AgentConfigService } = await import('./application/agent/agentConfigService');
                    const { ErrorHandler } = await import('./application/shared/errorHandler');
                    const errorHandler = new ErrorHandler(logger);
                    const agentConfigService = new AgentConfigService(logger, errorHandler);
                    const syncCommand = new PromptZSyncCommand(promptzService, agentConfigService);
                    await syncCommand.execute();
                } catch (error) {
                    logger.error('PromptZ sync failed', error as Error);
                    vscode.window.showErrorMessage(`PromptZ sync failed: ${(error as Error).message}`);
                }
            }
        );

        // Register open agent command
        const openAgentCommand = vscode.commands.registerCommand(
            'qcli-agents.openAgent',
            async (agentItem: any) => {
                try {
                    logger.logUserAction('Open Agent command executed', { agentName: agentItem?.label });
                    
                    if (!agentItem) {
                        await errorHandler!.showErrorMessage('No agent selected to open');
                        return;
                    }
                    
                    // Get the agent management service from extension state
                    if (!extensionState?.agentTreeProvider) {
                        await errorHandler!.showWarningMessage(
                            'Agent management is still initializing. Please try again in a moment.',
                            ['Retry']
                        );
                        return;
                    }
                    
                    // Get the agent management service from the tree provider
                    const agentManagementService = (extensionState.agentTreeProvider as any).agentManagementService;
                    if (!agentManagementService) {
                        throw new Error('Agent management service not available');
                    }
                    
                    // Open the agent configuration file
                    await agentManagementService.openAgentConfigFile(agentItem);
                    
                } catch (error) {
                    const commandError = error as Error;
                    logger.error('Failed to open agent file', commandError);
                    
                    // Error handling is already done in the management service
                    // Just log the command failure
                }
            }
        );

        // Register delete agent command
        const deleteAgentCommand = vscode.commands.registerCommand(
            'qcli-agents.deleteAgent',
            async (agentItem: any) => {
                try {
                    logger.logUserAction('Delete Agent command executed', { agentName: agentItem?.label });
                    
                    if (!agentItem) {
                        await errorHandler!.showErrorMessage('No agent selected to delete');
                        return;
                    }
                    
                    const agentName = agentItem.label || agentItem.agentItem?.label;
                    if (!agentName) {
                        await errorHandler!.showErrorMessage('Invalid agent item: missing name');
                        return;
                    }
                    
                    // Confirm deletion
                    const confirmation = await vscode.window.showWarningMessage(
                        `Are you sure you want to delete the agent "${agentName}"?`,
                        { modal: true },
                        'Delete'
                    );
                    
                    if (confirmation !== 'Delete') {
                        return;
                    }
                    
                    // Get agent management service from tree provider
                    const agentManagementService = (extensionState.agentTreeProvider as any).agentManagementService;
                    if (!agentManagementService) {
                        throw new Error('Agent management service not available');
                    }
                    
                    // Delete the agent
                    await agentManagementService.deleteAgent(agentName);
                    
                    // Refresh the tree view
                    extensionState.agentTreeProvider.refresh();
                    
                    vscode.window.showInformationMessage(`Agent "${agentName}" deleted successfully`);
                    
                } catch (error) {
                    logger.error('Failed to delete agent', error as Error);
                    await errorHandler!.handleError(error as Error, 'Failed to delete agent');
                }
            }
        );

        // Register run agent command
        const runAgentCommand = vscode.commands.registerCommand(
            'qcli-agents.runAgent',
            async (agentItem: any) => {
                try {
                    logger.logUserAction('Run Agent command executed', { agentName: agentItem?.label });
                    
                    if (!agentItem) {
                        await errorHandler!.showErrorMessage('No agent selected to run');
                        return;
                    }
                    
                    const agentName = agentItem.label || agentItem.agentItem?.label;
                    if (!agentName) {
                        await errorHandler!.showErrorMessage('Agent name not found');
                        return;
                    }
                    
                    // Create or get terminal
                    const terminal = vscode.window.createTerminal({
                        name: `Q CLI - ${agentName}`,
                        shellPath: process.env.SHELL || '/bin/bash'
                    });
                    terminal.show();
                    
                    // Send command immediately - VS Code handles timing
                    terminal.sendText(`q chat --agent "${agentName}"`);
                    
                    // Refresh to show green icon after a short delay
                    setTimeout(() => {
                        if (extensionState?.agentTreeProvider) {
                            const agentManagementService = (extensionState.agentTreeProvider as any).agentManagementService;
                            if (agentManagementService) {
                                agentManagementService.refreshAgentList();
                            }
                        }
                    }, 100);
                    
                } catch (error) {
                    const commandError = error as Error;
                    logger.error('Failed to run agent', commandError);
                    await errorHandler!.showErrorMessage(`Failed to run agent: ${commandError.message}`);
                }
            }
        );

        // Register select agent command (for firing selection events)
        const selectAgentCommand = vscode.commands.registerCommand(
            'qcli-agents.selectAgent',
            async (agentItem: any) => {
                try {
                    logger.info(`SELECT_AGENT command triggered for: ${agentItem?.name || agentItem?.label || 'unknown'}`);
                    
                    if (!agentItem) {
                        logger.warn('No agent item provided to select command');
                        return;
                    }
                    
                    // Call selectAgent method on the tree provider to fire selection event
                    if (extensionState?.agentTreeProvider) {
                        logger.info('Calling selectAgent on agentTreeProvider');
                        (extensionState.agentTreeProvider as any).selectAgent(agentItem);
                        logger.info('selectAgent method called successfully');
                    } else {
                        logger.error('agentTreeProvider not available in extensionState');
                    }
                    
                } catch (error) {
                    const commandError = error as Error;
                    logger.error('Failed to select agent', commandError);
                    await errorHandler!.showErrorMessage(`Failed to select agent: ${commandError.message}`);
                }
            }
        );

        // Add commands to subscriptions for proper cleanup
        context.original.subscriptions.push(openContextManagerCommand);
        context.original.subscriptions.push(createAgentCommand);
        context.original.subscriptions.push(openAgentCommand);
        context.original.subscriptions.push(deleteAgentCommand);
        context.original.subscriptions.push(runAgentCommand);
        context.original.subscriptions.push(selectAgentCommand);
        
        logger.debug('Core commands registered successfully');
    } catch (error) {
        const registrationError = error as Error;
        logger.error('Failed to register core commands', registrationError);
        throw new Error(`Core command registration failed: ${registrationError.message}`);
    }
}



/**
 * Get the current log level from VS Code configuration
 */
function getLogLevel(): LogLevel {
    const config = vscode.workspace.getConfiguration('qcli-context');
    const logLevelString = config.get<string>('logLevel', 'info').toLowerCase();
    
    switch (logLevelString) {
        case 'debug':
            return LogLevel.DEBUG;
        case 'info':
            return LogLevel.INFO;
        case 'warn':
            return LogLevel.WARN;
        case 'error':
            return LogLevel.ERROR;
        default:
            return LogLevel.INFO;
    }
}

/**
 * Check if debug mode is enabled
 */
function isDebugMode(): boolean {
    const config = vscode.workspace.getConfiguration('qcli-context');
    return config.get<boolean>('enableDebugMode', false);
}

/**
 * Check if output should be shown on error
 */
function getShowOutputOnError(): boolean {
    const config = vscode.workspace.getConfiguration('qcli-context');
    return config.get<boolean>('showOutputOnError', true);
}

/**
 * Check if logging to console is enabled
 */
function getLogToConsole(): boolean {
    const config = vscode.workspace.getConfiguration('qcli-context');
    return config.get<boolean>('logToConsole', false);
}



// Webview panel serializer removed - using tree view only

/**
 * Register configuration change listener to update logger settings dynamically
 */
function registerConfigurationChangeListener(context: ISafeExtensionContext, logger: ExtensionLogger): void {
    try {
        const configChangeListener = vscode.workspace.onDidChangeConfiguration(event => {
            if (event.affectsConfiguration('qcli-context.logLevel')) {
                const newLogLevel = getLogLevel();
                logger.setLogLevel(newLogLevel);
                logger.info(`Log level updated to: ${LogLevel[newLogLevel]}`);
            }
            
            if (event.affectsConfiguration('qcli-context.enableDebugMode')) {
                const newDebugMode = isDebugMode();
                logger.setDebugMode(newDebugMode);
                logger.info(`Debug mode ${newDebugMode ? 'enabled' : 'disabled'}`);
            }
            
            if (event.affectsConfiguration('qcli-context.showOutputOnError') || 
                event.affectsConfiguration('qcli-context.logToConsole')) {
                logger.updateConfiguration({
                    showOutputOnError: getShowOutputOnError(),
                    logToConsole: getLogToConsole()
                });
            }
        });

        context.original.subscriptions.push(configChangeListener);
        logger.debug('Configuration change listener registered successfully');
    } catch (error) {
        const listenerError = error as Error;
        logger.error('Failed to register configuration change listener', listenerError);
        // Don't throw here as this is not critical for basic functionality
    }
}

/**
 * Initialize non-critical components asynchronously to avoid blocking activation
 * This includes tree view provider and webview serializer
 */
async function initializeNonCriticalComponents(
    context: vscode.ExtensionContext, 
    logger: ExtensionLogger, 
    activationStartTime: number
): Promise<void> {
    try {
        const initStartTime = Date.now();
        
        // Initialize tree view provider with lazy loading
        await initializeTreeViewProvider(context, logger);
        
        // Webview panel serializer removed - using tree view only
        
        const initTime = Date.now() - initStartTime;
        const totalTime = Date.now() - activationStartTime;
        
        logger.logLifecycle('Non-critical components initialized', { 
            initTime: `${initTime}ms`, 
            totalActivationTime: `${totalTime}ms` 
        });
        
        // Show success message only in debug mode and only after full initialization
        if (isDebugMode()) {
            vscode.window.showInformationMessage(
                `Agent Manager for Q CLI activated in ${totalTime}ms`
            );
        }
        
    } catch (error) {
        const initError = error as Error;
        logger.error('Failed to initialize non-critical components', initError);
        // Don't throw here as core functionality should still work
    }
}

/**
 * Initialize tree view providers with lazy loading
 */
async function initializeTreeViewProvider(context: vscode.ExtensionContext, logger: ExtensionLogger): Promise<void> {
    try {
        // Initialize Agent Tree View
        await initializeAgentTreeView(context, logger);
        
        // Initialize Context Tree View
        await initializeContextTreeView(context, logger);

        logger.debug('All tree view providers initialized successfully');
    } catch (error) {
        const registrationError = error as Error;
        logger.error('Failed to initialize tree view providers', registrationError);
        throw new Error(`Tree view provider initialization failed: ${registrationError.message}`);
    }
}

/**
 * Initialize Agent tree view provider
 */
async function initializeAgentTreeView(context: vscode.ExtensionContext, logger: ExtensionLogger): Promise<void> {
    try {
        // Import the required classes
        const { AgentTreeProvider } = await import('./presentation/tree-providers/agentTreeProvider');
        const { AgentManagementService } = await import('./application/agent/agentManagementService');
        const { AgentConfigService } = await import('./application/agent/agentConfigService');
        const { AgentLocationService } = await import('./domain/agent/AgentLocationService');
        
        // Create the agent location service
        const locationService = new AgentLocationService();
        
        // Create the agent config service with error handler and location service
        const agentConfigService = new AgentConfigService(logger, errorHandler!, locationService);
        
        // Ensure agent directory exists during initialization
        await agentConfigService.ensureAgentDirectory();
        logger.info('Agent directory ensured during extension activation');
        
        // Create the agent management service with error handler
        const agentManagementService = new AgentManagementService(agentConfigService, logger, errorHandler!);
        
        // Create the agent tree provider
        const agentTreeProvider = new AgentTreeProvider(agentManagementService, logger);
        
        // Register the tree data provider with VS Code
        const agentTreeView = vscode.window.createTreeView('qcli-agents-tree', {
            treeDataProvider: agentTreeProvider,
            showCollapseAll: true
        });

        // Listen for tree selection changes to fire agent selection events
        agentTreeView.onDidChangeSelection(e => {
            if (e.selection && e.selection.length > 0) {
                const selectedItem = e.selection[0];
                logger.info(`Agent tree selection changed: ${selectedItem?.label || 'unknown'}`);
                
                // Check if it's an agent item (not separator or create button)
                if (selectedItem && 'config' in selectedItem && selectedItem.config) {
                    logger.info(`Firing selection event for agent: ${selectedItem.config.name}`);
                    agentTreeProvider.handleAgentSelection(selectedItem as any);
                }
            }
        });

        // Add tree view to subscriptions for proper cleanup
        context.subscriptions.push(agentTreeView);

        // Store the tree provider in extension state for later use
        if (extensionState) {
            extensionState.agentTreeProvider = agentTreeProvider;
        }

        // Start file watcher for automatic updates
        agentManagementService.startFileWatcher();

        // Register agent tree view commands with enhanced error handling
        const refreshAgentCommand = vscode.commands.registerCommand('qcli-agents.refreshTree', async () => {
            try {
                logger.logUserAction('Refresh agent tree command executed');
                const startTime = Date.now();
                await agentManagementService.refreshAgentList();
                logger.logTiming('Agent tree view refresh', startTime);
            } catch (error) {
                const commandError = error as Error;
                logger.error('Failed to refresh agent tree', commandError);
                
                // Use enhanced error handler for refresh errors
                await errorHandler!.showErrorMessage(
                    'Failed to refresh agent list. Please check your workspace and try again.',
                    commandError,
                    ['Retry', 'Check Permissions', 'Open Settings']
                );
            }
        });

        context.subscriptions.push(refreshAgentCommand);

        logger.debug('Agent tree view provider initialized successfully');
    } catch (error) {
        const registrationError = error as Error;
        logger.error('Failed to initialize agent tree view provider', registrationError);
        throw new Error(`Agent tree view provider initialization failed: ${registrationError.message}`);
    }
}

/**
 * Initialize Context tree view provider
 */
async function initializeContextTreeView(context: vscode.ExtensionContext, logger: ExtensionLogger): Promise<void> {
    try {
        // Import required services and providers
        const { ContextTreeProvider } = await import('./presentation/tree-providers/contextTreeProvider');
        const { ContextResourceService } = await import('./application/context/contextResourceService');
        
        // Initialize ContextResourceService
        const contextResourceService = new ContextResourceService(logger);
        
        // Get AgentTreeProvider for event subscription
        const agentTreeProvider = extensionState?.agentTreeProvider;
        
        // Create the context tree provider with service integration
        const contextTreeProvider = new ContextTreeProvider(
            contextResourceService,
            logger,
            agentTreeProvider
        );
        
        // Register the tree data provider with VS Code
        const contextTreeView = vscode.window.createTreeView('qcli-context-tree', {
            treeDataProvider: contextTreeProvider,
            showCollapseAll: true
        });

        // Add tree view to subscriptions for proper cleanup
        context.subscriptions.push(contextTreeView);

        // Store providers in extension state for later use
        if (extensionState) {
            extensionState.contextTreeProvider = contextTreeProvider;
            extensionState.contextResourceService = contextResourceService;
        }

        // Register context tree view commands
        const refreshContextCommand = vscode.commands.registerCommand('qcli-context.refreshTree', () => {
            logger.logUserAction('Refresh context tree command executed');
            const startTime = Date.now();
            contextTreeProvider.refresh();
            logger.logTiming('Context tree view refresh', startTime);
        });

        // Register context resource commands
        const { ContextResourceCommands } = await import('./presentation/commands/contextResourceCommands');
        const contextResourceCommands = new ContextResourceCommands(logger);

        const openFileCommand = vscode.commands.registerCommand('qcli-context.openFile', 
            (item: any) => contextResourceCommands.openFile(item));
        
        const revealInExplorerCommand = vscode.commands.registerCommand('qcli-context.revealInExplorer', 
            (item: any) => contextResourceCommands.revealInExplorer(item));
        
        const copyPathCommand = vscode.commands.registerCommand('qcli-context.copyPath', 
            (item: any) => contextResourceCommands.copyPath(item));
        
        const copyRelativePathCommand = vscode.commands.registerCommand('qcli-context.copyRelativePath', 
            (item: any) => contextResourceCommands.copyRelativePath(item));
        
        const searchFilesCommand = vscode.commands.registerCommand('qcli-context.searchFiles', 
            () => contextResourceCommands.searchFiles(contextTreeProvider));

        const clearSearchCommand = vscode.commands.registerCommand('qcli-context.clearSearch',
            () => {
                contextTreeProvider.clearSearchFilter();
                vscode.window.showInformationMessage('Search filter cleared');
            });

        const refreshResourcesCommand = vscode.commands.registerCommand('qcli-context.refreshResources',
            async () => {
                try {
                    // Clear cache and refresh
                    if (extensionState?.contextResourceService) {
                        (extensionState.contextResourceService as any).resourceCache?.clear();
                    }
                    contextTreeProvider.refresh();
                    vscode.window.showInformationMessage('Resources refreshed');
                } catch (error) {
                    logger.error('Failed to refresh resources', error as Error);
                    vscode.window.showErrorMessage('Failed to refresh resources');
                }
            });

        context.subscriptions.push(
            refreshContextCommand,
            openFileCommand,
            revealInExplorerCommand,
            copyPathCommand,
            copyRelativePathCommand,
            searchFilesCommand,
            clearSearchCommand,
            refreshResourcesCommand
        );

        logger.debug('Context tree view provider initialized successfully');
    } catch (error) {
        const registrationError = error as Error;
        logger.error('Failed to initialize context tree view provider', registrationError);
        throw new Error(`Context tree view provider initialization failed: ${registrationError.message}`);
    }
}

/**
 * Clear cached data to free memory
 */
function clearCachedData(): void {
    // Clear any module-level caches or static data
    // This helps prevent memory leaks during deactivation
    
    // Clear context items if they exist
    if (extensionState?.contextItems) {
        extensionState.contextItems.length = 0;
    }
    
    // Clear any other cached data structures here
    // (Add more as the extension grows)
}

/**
 * Get the current extension state (for use by other modules)
 * Optimized to avoid unnecessary object creation
 */
export function getExtensionState(): ExtensionState | undefined {
    return extensionState;
}

/**
 * Check if extension is fully initialized (including non-critical components)
 */
export function isExtensionFullyInitialized(): boolean {
    return extensionState?.isActivated === true && 
           extensionState?.contextTreeProvider !== undefined &&
           extensionState?.agentTreeProvider !== undefined;
}
