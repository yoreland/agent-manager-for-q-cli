import * as path from 'path';
import { IAgentRepository } from '../../domain/agent/IAgentRepository';
import { Agent, AgentConfig } from '../../domain/agent/Agent';
import { IFileSystemAdapter } from '../vscode/IFileSystemAdapter';
import { ILogger } from '../vscode/ILogger';
import { Result, success, failure } from '../../shared/errors/result';

export class FileSystemAgentRepository implements IAgentRepository {
    private readonly agentDirectory = '.amazonq/cli-agents';

    constructor(
        private fileSystem: IFileSystemAdapter,
        private logger: ILogger,
        private workspaceRoot: string
    ) {}

    async findAll(): Promise<Result<Agent[]>> {
        const agentDirPath = path.join(this.workspaceRoot, this.agentDirectory);
        
        const dirResult = await this.fileSystem.readDirectory(agentDirPath);
        if (!dirResult.success) {
            this.logger.warn('Failed to read agent directory', { path: agentDirPath, error: dirResult.error.message });
            return success([]); // Return empty array if directory doesn't exist
        }

        const agents: Agent[] = [];
        const jsonFiles = dirResult.data.filter(file => file.endsWith('.json'));

        for (const file of jsonFiles) {
            const filePath = path.join(agentDirPath, file);
            const agentResult = await this.loadAgentFromFile(filePath);
            if (agentResult.success && agentResult.data) {
                agents.push(agentResult.data);
            } else {
                this.logger.warn('Failed to load agent', { file, error: agentResult.success ? 'Agent is null' : agentResult.error.message });
            }
        }

        return success(agents);
    }

    async findByName(name: string): Promise<Result<Agent | null>> {
        const filePath = this.getAgentFilePath(name);
        
        const existsResult = await this.fileSystem.exists(filePath);
        if (!existsResult.success) {
            return failure(existsResult.error);
        }
        if (!existsResult.data) {
            return success(null);
        }

        return this.loadAgentFromFile(filePath);
    }

    async save(agent: Agent): Promise<Result<void>> {
        const filePath = this.getAgentFilePath(agent.name);
        const dirPath = path.dirname(filePath);

        // Ensure directory exists
        const ensureDirResult = await this.fileSystem.ensureDirectory(dirPath);
        if (!ensureDirResult.success) {
            return failure(ensureDirResult.error);
        }

        // Write agent config
        const content = JSON.stringify(agent.config, null, 2);
        const writeResult = await this.fileSystem.writeFile(filePath, content);
        if (!writeResult.success) {
            return failure(writeResult.error);
        }

        this.logger.info('Agent saved', { name: agent.name, path: filePath });
        return success(undefined);
    }

    async delete(name: string): Promise<Result<void>> {
        const filePath = this.getAgentFilePath(name);
        
        const deleteResult = await this.fileSystem.deleteFile(filePath);
        if (!deleteResult.success) {
            return failure(deleteResult.error);
        }

        this.logger.info('Agent deleted', { name, path: filePath });
        return success(undefined);
    }

    async exists(name: string): Promise<Result<boolean>> {
        const filePath = this.getAgentFilePath(name);
        return this.fileSystem.exists(filePath);
    }

    private async loadAgentFromFile(filePath: string): Promise<Result<Agent | null>> {
        const readResult = await this.fileSystem.readFile(filePath);
        if (!readResult.success) {
            return failure(readResult.error);
        }

        try {
            const config: AgentConfig = JSON.parse(readResult.data);
            const agentResult = Agent.create(config.name, filePath, config);
            if (!agentResult.success) {
                return failure(agentResult.error);
            }

            return success(agentResult.data);
        } catch (error) {
            return failure(new Error(`Invalid JSON in agent file: ${filePath}`));
        }
    }

    private getAgentFilePath(name: string): string {
        return path.join(this.workspaceRoot, this.agentDirectory, `${name}.json`);
    }
}
