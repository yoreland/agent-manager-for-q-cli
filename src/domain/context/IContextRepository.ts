import { Result } from '../../shared/errors/result';
import { ContextItem } from './ContextItem';

export interface IContextRepository {
    getContextItems(agentName: string): Promise<Result<ContextItem[]>>;
    addContextItem(agentName: string, item: ContextItem): Promise<Result<void>>;
    removeContextItem(agentName: string, path: string): Promise<Result<void>>;
    clearContext(agentName: string): Promise<Result<void>>;
    hasContextItem(agentName: string, path: string): Promise<Result<boolean>>;
}
