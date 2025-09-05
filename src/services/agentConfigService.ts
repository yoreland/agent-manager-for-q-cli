import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs/promises';
import { 
    AgentConfig, 
    ValidationResult, 
    DEFAULT_AGENT_CONFIG, 
    AGENT_CONSTANTS,
    AgentTemplateOptions
} from '../types/agent';
import { ExtensionLogger } from './logger';
import { IErrorHandler } from './errorHandler';
import { AgentLocationService, AgentLocation, IAgentLocationService } from '../core/agent/AgentLocationService';

/**
 * Interface for Agent Configuration Service
 */
export interface IAgentConfigService {
    // Directory management
    ensureAgentDirectory(): Promise<void>;
    getAgentDirectory(): string;
    
    // Agent file management
    scanAgentFiles(): Promise<string[]>;
    readAgentConfig(filePath: string): Promise<AgentConfig>;
    writeAgentConfig(name: string, config: AgentConfig, location?: AgentLocation): Promise<void>;
    deleteAgentConfig(name: string, location?: AgentLocation): Promise<void>;
    
    // Validation
    validateAgentConfig(config: AgentConfig, options?: { skipReservedNameCheck?: boolean }): ValidationResult;
    isAgentNameExists(name: string): Promise<boolean>;
    validateAgentName(name: string, skipReservedNameCheck?: boolean): ValidationResult;
    
    // Utility methods
    createDefaultAgentConfig(name: string): AgentConfig;
    createAgentConfigFromTemplate(name: string, options?: Partial<AgentTemplateOptions>): AgentConfig;
    createMinimalAgentConfig(name: string): AgentConfig;
    createComprehensiveAgentConfig(name: string): AgentConfig;
    getAgentFilePath(name: string): string;
    extractAgentNameFromPath(filePath: string): string;
    isValidAgentFilePath(filePath: string): boolean;
    fileExists(filePath: string): Promise<boolean>;
    
    // Template-related methods
    isValidTool(tool: string): boolean;
    getTemplateSuggestions(name: string): AgentTemplateOptions[];
    validateTemplateOptions(options: Partial<AgentTemplateOptions>): ValidationResult;
}

/**
 * Service for managing Q CLI Agent configuration files
 * Handles reading, writing, and validation of agent configuration files
 */
export class AgentConfigService implements IAgentConfigService {
    private readonly logger: ExtensionLogger;
    private readonly errorHandler: IErrorHandler;
    private readonly locationService: IAgentLocationService;
    private readonly workspaceRoot: string;
    private readonly agentDirectoryPath: string;

    constructor(logger: ExtensionLogger, errorHandler: IErrorHandler, locationService?: IAgentLocationService) {
        this.logger = logger;
        this.errorHandler = errorHandler;
        this.locationService = locationService || new AgentLocationService();
        
        // Get workspace root
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders || workspaceFolders.length === 0) {
            // No workspace - only global agents will be available
            this.workspaceRoot = '';
            this.agentDirectoryPath = '';
            this.logger.info('No workspace found - only global agents will be available');
        } else {
            this.workspaceRoot = workspaceFolders[0]!.uri.fsPath;
            this.agentDirectoryPath = path.join(this.workspaceRoot, AGENT_CONSTANTS.AGENT_DIRECTORY);
            
            this.logger.debug('AgentConfigService initialized', {
                workspaceRoot: this.workspaceRoot,
                agentDirectory: this.agentDirectoryPath
            });
        }
    }

    /**
     * Ensure the agent directory exists, create if it doesn't
     */
    async ensureAgentDirectory(): Promise<void> {
        // Skip if no workspace (only global agents available)
        if (!this.agentDirectoryPath) {
            this.logger.debug('No workspace - skipping local agent directory creation');
            return;
        }
        
        try {
            await fs.access(this.agentDirectoryPath);
            this.logger.debug('Agent directory already exists', { path: this.agentDirectoryPath });
        } catch (error) {
            this.logger.info('Creating agent directory', { path: this.agentDirectoryPath });
            try {
                await fs.mkdir(this.agentDirectoryPath, { recursive: true });
                this.logger.info('Agent directory created successfully');
            } catch (createError) {
                const errorMessage = `Failed to create agent directory: ${this.agentDirectoryPath}`;
                this.logger.error(errorMessage, createError as Error);
                
                // Handle directory creation error with user feedback
                await this.errorHandler.handleFileSystemError(
                    createError as Error,
                    'create agent directory',
                    this.agentDirectoryPath
                );
                
                throw new Error(`${errorMessage}. ${(createError as Error).message}`);
            }
        }
    }

    /**
     * Get the agent directory path
     */
    getAgentDirectory(): string {
        return this.agentDirectoryPath;
    }

    /**
     * Scan for agent configuration files in both local and global directories
     */
    async scanAgentFiles(): Promise<string[]> {
        try {
            // Ensure both directories exist
            await this.ensureAgentDirectory();
            await this.locationService.ensureDirectoryExists(AgentLocation.Global);
            
            // Get agent files from both locations
            const { local: localAgents, global: globalAgents } = await this.locationService.listAgentsByLocation();
            
            // Convert agent names to full file paths
            const localPaths = localAgents.map(name => 
                this.locationService.resolveAgentPath(name, AgentLocation.Local)
            );
            const globalPaths = globalAgents.map(name => 
                this.locationService.resolveAgentPath(name, AgentLocation.Global)
            );
            
            const allAgentFiles = [...localPaths, ...globalPaths];
            
            this.logger.debug('Scanned agent files from both locations', { 
                localDirectory: this.locationService.getLocalAgentsPath(),
                globalDirectory: this.locationService.getGlobalAgentsPath(),
                localCount: localPaths.length,
                globalCount: globalPaths.length,
                totalCount: allAgentFiles.length,
                files: allAgentFiles 
            });
            
            return allAgentFiles;
        } catch (error) {
            const errorMessage = 'Failed to scan agent files';
            this.logger.error(errorMessage, error as Error);
            
            // Handle scan error with user feedback
            await this.errorHandler.handleFileSystemError(
                error as Error,
                'scan agent files',
                'agent directories'
            );
            
            throw new Error(`${errorMessage}: ${(error as Error).message}`);
        }
    }

    /**
     * Read and parse an agent configuration file
     */
    async readAgentConfig(filePath: string): Promise<AgentConfig> {
        try {
            this.logger.debug('Reading agent config file', { filePath });
            
            const fileContent = await fs.readFile(filePath, 'utf-8');
            const config = JSON.parse(fileContent) as AgentConfig;
            
            // Validate the configuration (skip reserved name check for existing files)
            const validation = this.validateAgentConfig(config, { skipReservedNameCheck: true });
            if (!validation.isValid) {
                const errorMessage = `Invalid agent configuration in ${filePath}`;
                this.logger.warn(errorMessage, { errors: validation.errors });
                throw new Error(`${errorMessage}: ${validation.errors.join(', ')}`);
            }
            
            this.logger.debug('Agent config read successfully', { 
                filePath, 
                agentName: config.name 
            });
            
            return config;
        } catch (error) {
            if (error instanceof SyntaxError) {
                const errorMessage = `Invalid JSON in agent configuration file: ${filePath}`;
                this.logger.error(errorMessage, error);
                
                // Handle JSON parsing error
                await this.errorHandler.showErrorMessage(
                    `Agent configuration file contains invalid JSON: ${path.basename(filePath)}`,
                    error,
                    ['Open File', 'Validate JSON']
                );
                
                throw new Error(`${errorMessage}. Please check the JSON syntax.`);
            }
            
            const errorMessage = `Failed to read agent configuration: ${filePath}`;
            this.logger.error(errorMessage, error as Error);
            
            // Handle file read error
            await this.errorHandler.handleFileSystemError(
                error as Error,
                'read agent configuration',
                filePath
            );
            
            throw new Error(`${errorMessage}: ${(error as Error).message}`);
        }
    }

    /**
     * Write an agent configuration file
     */
    async writeAgentConfig(name: string, config: AgentConfig, location: AgentLocation = AgentLocation.Local): Promise<void> {
        try {
            // Validate agent name
            const nameValidation = this.validateAgentName(name);
            if (!nameValidation.isValid) {
                throw new Error(`Invalid agent name: ${nameValidation.errors.join(', ')}`);
            }
            
            // Check for name conflicts
            const conflictInfo = await this.locationService.detectNameConflicts(name);
            if (conflictInfo.hasConflict) {
                this.logger.warn(`Agent name conflict detected for '${name}'`, conflictInfo);
            }
            
            // Ensure the config name matches the provided name
            config.name = name;
            
            // Validate the configuration
            const configValidation = this.validateAgentConfig(config);
            if (!configValidation.isValid) {
                throw new Error(`Invalid agent configuration: ${configValidation.errors.join(', ')}`);
            }
            
            // Ensure target directory exists
            await this.locationService.ensureDirectoryExists(location);
            
            const filePath = this.locationService.resolveAgentPath(name, location);
            const jsonContent = JSON.stringify(config, null, 2);
            
            this.logger.debug('Writing agent config file', { filePath, agentName: name, location });
            
            await fs.writeFile(filePath, jsonContent, 'utf-8');
            
            this.logger.info('Agent configuration written successfully', { 
                filePath, 
                agentName: name 
            });
        } catch (error) {
            const errorMessage = `Failed to write agent configuration for '${name}'`;
            this.logger.error(errorMessage, error as Error);
            
            // Handle file write error with user feedback
            const filePath = path.join(this.agentDirectoryPath, `${name}${AGENT_CONSTANTS.AGENT_FILE_EXTENSION}`);
            await this.errorHandler.handleFileSystemError(
                error as Error,
                'write agent configuration',
                filePath
            );
            
            throw new Error(`${errorMessage}: ${(error as Error).message}`);
        }
    }

    /**
     * Delete an agent configuration file
     */
    async deleteAgentConfig(name: string, location?: AgentLocation): Promise<void> {
        try {
            let filePath: string;
            
            if (location) {
                filePath = this.locationService.resolveAgentPath(name, location);
            } else {
                // Try local first, then global
                const localPath = this.locationService.resolveAgentPath(name, 'local');
                const globalPath = this.locationService.resolveAgentPath(name, 'global');
                
                if (await this.fileExists(localPath)) {
                    filePath = localPath;
                } else if (await this.fileExists(globalPath)) {
                    filePath = globalPath;
                } else {
                    throw new Error(`Agent configuration file not found: ${name}`);
                }
            }
            
            this.logger.debug('Deleting agent config file', { filePath, agentName: name });
            
            await fs.unlink(filePath);
            
            this.logger.info('Agent configuration deleted successfully', { 
                filePath, 
                agentName: name 
            });
        } catch (error) {
            if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
                const errorMessage = `Agent configuration file not found: ${name}`;
                this.logger.warn(errorMessage);
                
                await this.errorHandler.showWarningMessage(
                    `Agent '${name}' does not exist or has already been deleted.`
                );
                
                throw new Error(errorMessage);
            }
            
            const errorMessage = `Failed to delete agent configuration for '${name}'`;
            this.logger.error(errorMessage, error as Error);
            
            // Handle file delete error with user feedback
            await this.errorHandler.handleFileSystemError(
                error as Error,
                'delete agent configuration',
                filePath
            );
            
            throw new Error(`${errorMessage}: ${(error as Error).message}`);
        }
    }

    /**
     * Validate an agent configuration object
     */
    validateAgentConfig(config: AgentConfig, options?: { skipReservedNameCheck?: boolean }): ValidationResult {
        const errors: string[] = [];
        const warnings: string[] = [];

        // Check required fields
        if (!config.name || typeof config.name !== 'string') {
            errors.push('Agent name is required and must be a string');
        } else {
            const nameValidation = this.validateAgentName(config.name, options?.skipReservedNameCheck);
            if (!nameValidation.isValid) {
                errors.push(...nameValidation.errors);
            }
        }

        // Schema is optional for backward compatibility with existing agent files
        if (config.$schema && typeof config.$schema !== 'string') {
            errors.push('Schema reference ($schema) must be a string if provided');
        }

        if (typeof config.description !== 'string') {
            errors.push('Description must be a string');
        }

        // Validate tools array
        if (!Array.isArray(config.tools)) {
            errors.push('Tools must be an array');
        } else {
            const validTools = [
                'fs_read', 'fs_write', 'execute_bash', 'use_aws', 
                'gh_issue', 'knowledge', 'thinking'
            ];
            const invalidTools = config.tools.filter(tool => 
                typeof tool !== 'string' || !validTools.includes(tool)
            );
            if (invalidTools.length > 0) {
                warnings.push(`Unknown tools detected: ${invalidTools.join(', ')}`);
            }
        }

        // Validate allowedTools array
        if (!Array.isArray(config.allowedTools)) {
            errors.push('AllowedTools must be an array');
        }

        // Validate resources array
        if (!Array.isArray(config.resources)) {
            errors.push('Resources must be an array');
        } else {
            const invalidResources = config.resources.filter(resource => 
                typeof resource !== 'string'
            );
            if (invalidResources.length > 0) {
                errors.push('All resources must be strings');
            }
        }

        // Validate objects
        if (typeof config.mcpServers !== 'object' || config.mcpServers === null) {
            errors.push('mcpServers must be an object');
        }

        if (typeof config.toolAliases !== 'object' || config.toolAliases === null) {
            errors.push('toolAliases must be an object');
        }

        if (typeof config.hooks !== 'object' || config.hooks === null) {
            errors.push('hooks must be an object');
        }

        if (typeof config.toolsSettings !== 'object' || config.toolsSettings === null) {
            errors.push('toolsSettings must be an object');
        }

        // Validate boolean fields
        if (typeof config.useLegacyMcpJson !== 'boolean') {
            errors.push('useLegacyMcpJson must be a boolean');
        }

        // Validate prompt (can be string or null)
        if (config.prompt !== null && typeof config.prompt !== 'string') {
            errors.push('prompt must be a string or null');
        }

        const result: ValidationResult = {
            isValid: errors.length === 0,
            errors
        };

        if (warnings.length > 0) {
            result.warnings = warnings;
        }

        this.logger.debug('Agent config validation completed', {
            isValid: result.isValid,
            errorCount: errors.length,
            warningCount: warnings.length
        });

        return result;
    }

    /**
     * Check if an agent with the given name already exists
     */
    async isAgentNameExists(name: string): Promise<boolean> {
        try {
            const filePath = path.join(this.agentDirectoryPath, `${name}${AGENT_CONSTANTS.AGENT_FILE_EXTENSION}`);
            await fs.access(filePath);
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Validate an agent name
     */
    validateAgentName(name: string, skipReservedNameCheck?: boolean): ValidationResult {
        const errors: string[] = [];

        // Check if name is provided
        if (!name || typeof name !== 'string') {
            errors.push('Agent name is required and must be a string');
            return { isValid: false, errors };
        }

        // Trim whitespace
        const trimmedName = name.trim();
        if (trimmedName !== name) {
            errors.push('Agent name cannot have leading or trailing whitespace');
        }

        if (trimmedName.length === 0) {
            errors.push('Agent name cannot be empty');
        }

        // Check length constraints
        if (trimmedName.length < AGENT_CONSTANTS.MIN_AGENT_NAME_LENGTH) {
            errors.push(`Agent name must be at least ${AGENT_CONSTANTS.MIN_AGENT_NAME_LENGTH} character(s) long`);
        }

        if (trimmedName.length > AGENT_CONSTANTS.MAX_AGENT_NAME_LENGTH) {
            errors.push(`Agent name must be no more than ${AGENT_CONSTANTS.MAX_AGENT_NAME_LENGTH} characters long`);
        }

        // Check valid characters
        if (!AGENT_CONSTANTS.VALID_NAME_PATTERN.test(trimmedName)) {
            errors.push('Agent name can only contain letters, numbers, hyphens, and underscores');
        }

        // Check reserved names (skip if requested)
        if (!skipReservedNameCheck && AGENT_CONSTANTS.RESERVED_NAMES.includes(trimmedName.toLowerCase() as any)) {
            errors.push(`'${trimmedName}' is a reserved name and cannot be used`);
        }

        // Check for invalid file name characters (additional safety)
        const invalidChars = /[<>:"/\\|?*]/;
        if (invalidChars.test(trimmedName)) {
            errors.push('Agent name contains invalid file name characters');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Create a default agent configuration with the given name
     */
    createDefaultAgentConfig(name: string): AgentConfig {
        return this.createAgentConfigFromTemplate(name);
    }

    /**
     * Create an agent configuration from template with customization options
     */
    createAgentConfigFromTemplate(name: string, options?: Partial<AgentTemplateOptions>): AgentConfig {
        // Start with the default configuration
        const config: AgentConfig = {
            ...DEFAULT_AGENT_CONFIG,
            name: name
        };

        // Apply customizations if provided
        if (options) {
            // Custom description
            if (options.description) {
                config.description = options.description;
            }

            // Custom prompt
            if (options.prompt !== undefined) {
                config.prompt = options.prompt;
            }

            // Tool customizations
            if (options.includeAllTools) {
                config.tools = this.getAllAvailableTools();
            } else if (options.includeAdvancedTools === false) {
                config.tools = this.getBasicTools();
            } else if (options.additionalTools && options.additionalTools.length > 0) {
                const uniqueTools = new Set([...config.tools, ...options.additionalTools]);
                config.tools = Array.from(uniqueTools);
            }

            // Resource customizations
            if (options.additionalResources && options.additionalResources.length > 0) {
                const uniqueResources = new Set([...config.resources, ...options.additionalResources]);
                config.resources = Array.from(uniqueResources);
            }
        }

        // Ensure the agent name is properly set in the configuration
        config.name = name;

        this.logger.debug('Created agent config from template', {
            agentName: name,
            toolCount: config.tools.length,
            resourceCount: config.resources.length,
            hasCustomDescription: !!options?.description,
            hasCustomPrompt: options?.prompt !== undefined
        });

        return config;
    }

    /**
     * Get all available tools for Q CLI agents
     */
    private getAllAvailableTools(): string[] {
        return [
            ...AGENT_CONSTANTS.TEMPLATES.BASIC_TOOLS,
            ...AGENT_CONSTANTS.TEMPLATES.ADVANCED_TOOLS
        ];
    }

    /**
     * Get basic tools for Q CLI agents (without advanced features)
     */
    private getBasicTools(): string[] {
        return [...AGENT_CONSTANTS.TEMPLATES.BASIC_TOOLS];
    }

    /**
     * Create a minimal agent configuration for testing or simple use cases
     */
    createMinimalAgentConfig(name: string): AgentConfig {
        return {
            $schema: AGENT_CONSTANTS.TEMPLATES.SCHEMA_URL,
            name: name,
            description: `Minimal Q CLI Agent: ${name}`,
            prompt: null,
            mcpServers: {},
            tools: ['fs_read', 'thinking'],
            toolAliases: {},
            allowedTools: ['fs_read'],
            resources: ['file://README.md'],
            hooks: {},
            toolsSettings: {},
            useLegacyMcpJson: true
        };
    }

    /**
     * Create a comprehensive agent configuration with all available features
     */
    createComprehensiveAgentConfig(name: string): AgentConfig {
        return {
            $schema: AGENT_CONSTANTS.TEMPLATES.SCHEMA_URL,
            name: name,
            description: `Comprehensive Q CLI Agent: ${name}`,
            prompt: null,
            mcpServers: {},
            tools: this.getAllAvailableTools(),
            toolAliases: {},
            allowedTools: ['fs_read', 'fs_write', 'execute_bash'],
            resources: [
                ...AGENT_CONSTANTS.TEMPLATES.DEFAULT_RESOURCES,
                ...AGENT_CONSTANTS.TEMPLATES.COMMON_RESOURCES
            ],
            hooks: {},
            toolsSettings: {},
            useLegacyMcpJson: true
        };
    }

    /**
     * Get agent file path from name
     */
    getAgentFilePath(name: string): string {
        return path.join(this.agentDirectoryPath, `${name}${AGENT_CONSTANTS.AGENT_FILE_EXTENSION}`);
    }

    /**
     * Extract agent name from file path
     */
    extractAgentNameFromPath(filePath: string): string {
        const fileName = path.basename(filePath, AGENT_CONSTANTS.AGENT_FILE_EXTENSION);
        return fileName;
    }

    /**
     * Check if a file path is a valid agent configuration file
     */
    isValidAgentFilePath(filePath: string): boolean {
        const fileName = path.basename(filePath);
        return fileName.endsWith(AGENT_CONSTANTS.AGENT_FILE_EXTENSION) &&
               path.dirname(filePath) === this.agentDirectoryPath;
    }

    /**
     * Validate that a tool is supported by Q CLI
     */
    isValidTool(tool: string): boolean {
        const allTools = this.getAllAvailableTools();
        return allTools.includes(tool);
    }

    /**
     * Get template suggestions based on agent name or purpose
     */
    getTemplateSuggestions(name: string): AgentTemplateOptions[] {
        const suggestions: AgentTemplateOptions[] = [];
        const lowerName = name.toLowerCase();

        // Suggest based on common naming patterns
        if (lowerName.includes('test') || lowerName.includes('debug')) {
            suggestions.push({
                name,
                description: `Testing and debugging agent: ${name}`,
                includeAdvancedTools: false,
                additionalResources: ['file://test/**/*', 'file://**/*.test.*']
            });
        }

        if (lowerName.includes('aws') || lowerName.includes('cloud')) {
            suggestions.push({
                name,
                description: `AWS and cloud operations agent: ${name}`,
                includeAdvancedTools: true,
                additionalTools: ['use_aws'],
                additionalResources: ['file://infrastructure/**/*', 'file://**/*.yml', 'file://**/*.yaml']
            });
        }

        if (lowerName.includes('doc') || lowerName.includes('write')) {
            suggestions.push({
                name,
                description: `Documentation and writing agent: ${name}`,
                includeAdvancedTools: false,
                additionalResources: ['file://docs/**/*', 'file://**/*.md', 'file://**/*.txt']
            });
        }

        // Always provide a default suggestion
        suggestions.push({
            name,
            description: `General purpose agent: ${name}`,
            includeAdvancedTools: true
        });

        return suggestions;
    }

    /**
     * Check if a file exists at the given path
     */
    async fileExists(filePath: string): Promise<boolean> {
        try {
            await fs.access(filePath);
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Validate template options
     */
    validateTemplateOptions(options: Partial<AgentTemplateOptions>): ValidationResult {
        const errors: string[] = [];
        const warnings: string[] = [];

        if (options.name) {
            const nameValidation = this.validateAgentName(options.name);
            if (!nameValidation.isValid) {
                errors.push(...nameValidation.errors);
            }
        }

        if (options.additionalTools) {
            const invalidTools = options.additionalTools.filter(tool => !this.isValidTool(tool));
            if (invalidTools.length > 0) {
                warnings.push(`Unknown tools will be included: ${invalidTools.join(', ')}`);
            }
        }

        if (options.additionalResources) {
            const invalidResources = options.additionalResources.filter(resource => 
                typeof resource !== 'string' || resource.trim().length === 0
            );
            if (invalidResources.length > 0) {
                errors.push('All additional resources must be non-empty strings');
            }
        }

        const result: ValidationResult = {
            isValid: errors.length === 0,
            errors
        };

        if (warnings.length > 0) {
            result.warnings = warnings;
        }

        return result;
    }
}