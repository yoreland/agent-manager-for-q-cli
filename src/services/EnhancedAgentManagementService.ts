import * as vscode from 'vscode';
import { AgentLocationService, AgentLocation, AgentConflictInfo } from '../core/agent/AgentLocationService';
import { AgentItemWithLocation, AgentItem } from '../types/agent';
import { Result, success, failure } from '../shared/errors/result';
import { ILogger } from '../shared/infrastructure/ILogger';
import * as fs from 'fs/promises';
import * as path from 'path';

export interface LocationBasedAgentList {
    local: AgentItemWithLocation[];
    global: AgentItemWithLocation[];
    conflicts: AgentConflictInfo[];
}

export class EnhancedAgentManagementService {
    private _onAgentListChanged = new vscode.EventEmitter<LocationBasedAgentList>();
    readonly onAgentListChanged = this._onAgentListChanged.event;
    
    private cache: Map<string, LocationBasedAgentList> = new Map();
    private cacheExpiry: number = 5 * 60 * 1000; // 5 minutes

    constructor(
        private agentLocationService: AgentLocationService,
        private logger: ILogger
    ) {}

    async getAgentsByLocation(): Promise<Result<LocationBasedAgentList>> {
        try {
            const cacheKey = 'agentsByLocation';
            const cached = this.cache.get(cacheKey);
            
            if (cached && Date.now() - (cached as any).timestamp < this.cacheExpiry) {
                return success(cached);
            }

            const [localAgents, globalAgents] = await Promise.all([
                this.loadAgentsFromLocation(AgentLocation.Local),
                this.loadAgentsFromLocation(AgentLocation.Global)
            ]);

            const conflicts = await this.detectConflicts(localAgents, globalAgents);
            
            const result: LocationBasedAgentList = {
                local: localAgents,
                global: globalAgents,
                conflicts
            };

            // Cache with timestamp
            (result as any).timestamp = Date.now();
            this.cache.set(cacheKey, result);

            this._onAgentListChanged.fire(result);
            return success(result);

        } catch (error) {
            this.logger.error('Failed to get agents by location', error);
            return failure(error as Error);
        }
    }

    private async loadAgentsFromLocation(location: AgentLocation): Promise<AgentItemWithLocation[]> {
        const agentNames = await this.agentLocationService.listAgentsByLocation();
        const names = location === AgentLocation.Local ? agentNames.local : agentNames.global;
        
        const agents = await Promise.all(
            names.map(name => this.loadSingleAgent(name, location))
        );

        return agents.filter(agent => agent !== null) as AgentItemWithLocation[];
    }

    private async loadSingleAgent(name: string, location: AgentLocation): Promise<AgentItemWithLocation | null> {
        try {
            const agentPath = this.agentLocationService.resolveAgentPath(name, location);
            const configContent = await fs.readFile(agentPath, 'utf-8');
            const config = JSON.parse(configContent);

            const conflictInfo = await this.agentLocationService.detectNameConflicts(name);

            return {
                label: name,
                description: config.description || 'No description',
                iconPath: location === AgentLocation.Global 
                    ? new vscode.ThemeIcon('globe') 
                    : new vscode.ThemeIcon('robot'),
                contextValue: 'agentItem',
                filePath: agentPath,
                config,
                location,
                hasConflict: conflictInfo.hasConflict,
                conflictInfo: conflictInfo.hasConflict ? conflictInfo : undefined
            };
        } catch (error) {
            this.logger.warn(`Failed to load agent ${name} from ${location}`, error);
            return null;
        }
    }

    private async detectConflicts(
        localAgents: AgentItemWithLocation[], 
        globalAgents: AgentItemWithLocation[]
    ): Promise<AgentConflictInfo[]> {
        const conflicts: AgentConflictInfo[] = [];
        const localNames = new Set(localAgents.map(a => a.label));
        
        for (const globalAgent of globalAgents) {
            if (localNames.has(globalAgent.label)) {
                const conflictInfo = await this.agentLocationService.detectNameConflicts(globalAgent.label);
                conflicts.push(conflictInfo);
            }
        }

        return conflicts;
    }

    async refreshAgentList(): Promise<void> {
        this.cache.clear();
        await this.getAgentsByLocation();
    }

    async createAgent(name: string, config: any, location: AgentLocation): Promise<Result<AgentItemWithLocation>> {
        try {
            await this.agentLocationService.ensureDirectoryExists(location);
            
            const conflictInfo = await this.agentLocationService.detectNameConflicts(name);
            if (conflictInfo.hasConflict && conflictInfo.recommendedAction === 'rename') {
                return failure(new Error(`Agent name '${name}' already exists. Please choose a different name.`));
            }

            const agentPath = this.agentLocationService.resolveAgentPath(name, location);
            await fs.writeFile(agentPath, JSON.stringify(config, null, 2));

            const newAgent = await this.loadSingleAgent(name, location);
            if (!newAgent) {
                return failure(new Error('Failed to load created agent'));
            }

            this.cache.clear(); // Invalidate cache
            await this.refreshAgentList();

            return success(newAgent);
        } catch (error) {
            this.logger.error(`Failed to create agent ${name}`, error);
            return failure(error as Error);
        }
    }

    dispose(): void {
        this._onAgentListChanged.dispose();
        this.cache.clear();
    }
}
