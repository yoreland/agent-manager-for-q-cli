import { Result } from '../../shared/errors/result';
import { Agent } from './Agent';

export interface IAgentRepository {
    findAll(): Promise<Result<Agent[]>>;
    findByName(name: string): Promise<Result<Agent | null>>;
    save(agent: Agent): Promise<Result<void>>;
    delete(name: string): Promise<Result<void>>;
    exists(name: string): Promise<Result<boolean>>;
}
