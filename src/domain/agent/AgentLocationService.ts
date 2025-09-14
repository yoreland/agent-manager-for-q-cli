import * as path from 'path';
import * as fs from 'fs/promises';
import * as os from 'os';
import * as vscode from 'vscode';

export enum AgentLocation {
    Local = 'local',
    Global = 'global'
}

export interface AgentConflictInfo {
    hasConflict: boolean;
    localExists: boolean;
    globalExists: boolean;
    recommendedAction: 'use_local' | 'use_global' | 'rename';
}

export interface IAgentLocationService {
    getLocalAgentsPath(): string;
    getGlobalAgentsPath(): string;
    hasWorkspace(): boolean;
    ensureDirectoryExists(location: AgentLocation): Promise<void>;
    resolveAgentPath(name: string, location: AgentLocation): string;
    detectNameConflicts(name: string): Promise<AgentConflictInfo>;
    listAgentsByLocation(): Promise<{ local: string[], global: string[] }>;
}

export class AgentLocationService implements IAgentLocationService {
    private readonly LOCAL_AGENTS_DIR = '.amazonq/cli-agents';
    private readonly GLOBAL_AGENTS_DIR = path.join('.aws', 'amazonq', 'cli-agents');

    getLocalAgentsPath(): string {
        // Use VS Code workspace path instead of process.cwd()
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders || workspaceFolders.length === 0) {
            throw new Error('No workspace folder found. Local agent management requires an open workspace.');
        }
        
        return path.join(workspaceFolders[0].uri.fsPath, this.LOCAL_AGENTS_DIR);
    }

    hasWorkspace(): boolean {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        return !!(workspaceFolders && workspaceFolders.length > 0);
    }

    getGlobalAgentsPath(): string {
        return path.join(os.homedir(), this.GLOBAL_AGENTS_DIR);
    }

    async ensureDirectoryExists(location: AgentLocation): Promise<void> {
        const dirPath = location === AgentLocation.Local 
            ? this.getLocalAgentsPath() 
            : this.getGlobalAgentsPath();
        
        try {
            await fs.access(dirPath);
        } catch {
            await fs.mkdir(dirPath, { recursive: true });
        }
    }

    resolveAgentPath(name: string, location: AgentLocation): string {
        const basePath = location === AgentLocation.Local 
            ? this.getLocalAgentsPath() 
            : this.getGlobalAgentsPath();
        return path.join(basePath, `${name}.json`);
    }

    async detectNameConflicts(name: string): Promise<AgentConflictInfo> {
        const localPath = this.resolveAgentPath(name, AgentLocation.Local);
        const globalPath = this.resolveAgentPath(name, AgentLocation.Global);

        const [localExists, globalExists] = await Promise.all([
            this.fileExists(localPath),
            this.fileExists(globalPath)
        ]);

        const hasConflict = localExists && globalExists;
        let recommendedAction: 'use_local' | 'use_global' | 'rename' = 'use_local';

        if (hasConflict) {
            recommendedAction = 'use_local'; // Local takes precedence
        } else if (!localExists && !globalExists) {
            recommendedAction = 'rename';
        }

        return {
            hasConflict,
            localExists,
            globalExists,
            recommendedAction
        };
    }

    async listAgentsByLocation(): Promise<{ local: string[], global: string[] }> {
        const [localAgents, globalAgents] = await Promise.all([
            this.getAgentsInDirectory(this.getLocalAgentsPath()),
            this.getAgentsInDirectory(this.getGlobalAgentsPath())
        ]);

        return { local: localAgents, global: globalAgents };
    }

    private async fileExists(filePath: string): Promise<boolean> {
        try {
            await fs.access(filePath);
            return true;
        } catch {
            return false;
        }
    }

    private async getAgentsInDirectory(dirPath: string): Promise<string[]> {
        try {
            const files = await fs.readdir(dirPath);
            return files
                .filter(file => file.endsWith('.json'))
                .map(file => path.basename(file, '.json'));
        } catch {
            return [];
        }
    }
}
