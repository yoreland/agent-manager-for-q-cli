import * as path from 'path';
import { IContextRepository } from '../../domain/context/IContextRepository';
import { ContextItem, ContextType } from '../../shared/types/context';
import { IFileSystemAdapter } from '../vscode/IFileSystemAdapter';
import { ILogger } from '../vscode/ILogger';
import { Result, success, failure } from '../../shared/errors/result';

export class FileSystemContextRepository implements IContextRepository {
    private readonly agentDirectory = '.amazonq/cli-agents';

    constructor(
        private fileSystem: IFileSystemAdapter,
        private logger: ILogger,
        private workspaceRoot: string
    ) {}

    async getContextItems(agentName: string): Promise<Result<ContextItem[]>> {
        const configResult = await this.loadAgentConfig(agentName);
        if (!configResult.success) {
            return failure(configResult.error);
        }

        const config = configResult.data;
        const contextItems: ContextItem[] = [];

        // Convert resources to context items
        for (const resource of config.resources || []) {
            const type = this.determineContextType(resource);
            const itemResult = ContextItem.create(resource, type);
            if (itemResult.success) {
                contextItems.push(itemResult.data);
            } else {
                this.logger.warn('Invalid context item', { resource, error: itemResult.error.message });
            }
        }

        return success(contextItems);
    }

    async addContextItem(agentName: string, item: ContextItem): Promise<Result<void>> {
        const configResult = await this.loadAgentConfig(agentName);
        if (!configResult.success) {
            return failure(configResult.error);
        }

        const config = configResult.data;
        const resources = config.resources || [];

        // Check if item already exists
        if (resources.includes(item.path)) {
            return failure(new Error(`Context item '${item.path}' already exists`));
        }

        // Add new resource
        const updatedConfig = {
            ...config,
            resources: [...resources, item.path]
        };

        return this.saveAgentConfig(agentName, updatedConfig);
    }

    async removeContextItem(agentName: string, path: string): Promise<Result<void>> {
        const configResult = await this.loadAgentConfig(agentName);
        if (!configResult.success) {
            return failure(configResult.error);
        }

        const config = configResult.data;
        const resources = config.resources || [];

        // Check if item exists
        if (!resources.includes(path)) {
            return failure(new Error(`Context item '${path}' not found`));
        }

        // Remove resource
        const updatedConfig = {
            ...config,
            resources: resources.filter(r => r !== path)
        };

        return this.saveAgentConfig(agentName, updatedConfig);
    }

    async clearContext(agentName: string): Promise<Result<void>> {
        const configResult = await this.loadAgentConfig(agentName);
        if (!configResult.success) {
            return failure(configResult.error);
        }

        const config = configResult.data;
        const updatedConfig = {
            ...config,
            resources: []
        };

        return this.saveAgentConfig(agentName, updatedConfig);
    }

    async hasContextItem(agentName: string, path: string): Promise<Result<boolean>> {
        const configResult = await this.loadAgentConfig(agentName);
        if (!configResult.success) {
            return failure(configResult.error);
        }

        const config = configResult.data;
        const resources = config.resources || [];
        return success(resources.includes(path));
    }

    private async loadAgentConfig(agentName: string): Promise<Result<any>> {
        const filePath = this.getAgentFilePath(agentName);
        
        const existsResult = await this.fileSystem.exists(filePath);
        if (!existsResult.success) {
            return failure(existsResult.error);
        }
        if (!existsResult.data) {
            return failure(new Error(`Agent '${agentName}' not found`));
        }

        const readResult = await this.fileSystem.readFile(filePath);
        if (!readResult.success) {
            return failure(readResult.error);
        }

        try {
            const config = JSON.parse(readResult.data);
            return success(config);
        } catch (error) {
            return failure(new Error(`Invalid JSON in agent file: ${filePath}`));
        }
    }

    private async saveAgentConfig(agentName: string, config: any): Promise<Result<void>> {
        const filePath = this.getAgentFilePath(agentName);
        const content = JSON.stringify(config, null, 2);
        
        const writeResult = await this.fileSystem.writeFile(filePath, content);
        if (!writeResult.success) {
            return failure(writeResult.error);
        }

        this.logger.info('Agent config updated', { name: agentName, path: filePath });
        return success(undefined);
    }

    private determineContextType(resource: string): ContextType {
        if (resource.includes('*') || resource.includes('?') || resource.includes('[')) {
            return ContextType.GLOB_PATTERN;
        }
        if (resource.endsWith('/')) {
            return ContextType.DIRECTORY;
        }
        return ContextType.FILE;
    }

    private getAgentFilePath(name: string): string {
        return path.join(this.workspaceRoot, this.agentDirectory, `${name}.json`);
    }
}
