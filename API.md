# API Documentation

## Core Interfaces

### Agent Management

#### IAgentRepository
```typescript
interface IAgentRepository {
    findAll(): Promise<Result<Agent[]>>;
    findByName(name: string): Promise<Result<Agent | null>>;
    save(agent: Agent): Promise<Result<void>>;
    delete(name: string): Promise<Result<void>>;
    exists(name: string): Promise<Result<boolean>>;
}
```

#### AgentDomainService
```typescript
class AgentDomainService {
    async createAgent(name: string, template?: AgentTemplate): Promise<Result<Agent>>;
    async updateAgent(name: string, updates: Partial<AgentConfig>): Promise<Result<Agent>>;
    async deleteAgent(name: string): Promise<Result<void>>;
    validateAgentName(name: string): Result<void>;
}
```

### Context Management

#### IContextRepository
```typescript
interface IContextRepository {
    getContextItems(agentName: string): Promise<Result<ContextItem[]>>;
    addContextItem(agentName: string, item: ContextItem): Promise<Result<void>>;
    removeContextItem(agentName: string, path: string): Promise<Result<void>>;
}
```

#### ContextDomainService
```typescript
class ContextDomainService {
    async addContextItem(agentName: string, path: string, type: ContextType): Promise<Result<void>>;
    async removeContextItem(agentName: string, path: string): Promise<Result<void>>;
    async clearContext(agentName: string): Promise<Result<void>>;
}
```

## Infrastructure Services

### Caching

#### ICache
```typescript
interface ICache {
    get<T>(key: string): Promise<T | null>;
    set<T>(key: string, value: T, ttl?: number): Promise<void>;
    delete(key: string): Promise<void>;
    clear(): Promise<void>;
}
```

#### CacheManager
```typescript
class CacheManager {
    registerCache(name: string, cache: ICache): void;
    getCache(name: string): ICache | undefined;
    async invalidateAll(): Promise<void>;
    async invalidateCache(name: string): Promise<void>;
    getCacheStats(): CacheStats[];
}
```

### Performance Monitoring

#### PerformanceMonitor
```typescript
class PerformanceMonitor {
    startTimer(name: string): void;
    endTimer(name: string): number;
    measureSync<T>(name: string, fn: () => T): T;
    measureAsync<T>(name: string, fn: () => Promise<T>): Promise<T>;
    getMetrics(): PerformanceMetric[];
    logSummary(): void;
}
```

#### MemoryOptimizer
```typescript
class MemoryOptimizer {
    startMonitoring(): void;
    stopMonitoring(): void;
    getMemoryUsage(): MemoryUsage;
    async forceGarbageCollection(): Promise<void>;
}
```

## Error Handling

### Result Pattern
```typescript
type Result<T, E = Error> = 
    | { success: true; data: T }
    | { success: false; error: E };

// Helper functions
function success<T>(data: T): Result<T>;
function failure<E>(error: E): Result<never, E>;
```

### Error Recovery
```typescript
class ErrorRecoveryManager {
    async handleError(error: ExtensionError): Promise<Result<void>>;
    getErrorHistory(): ErrorHistoryEntry[];
    getErrorStats(): ErrorStats;
}

class ContextualErrorHandler {
    async handleFileSystemError(error: Error, operation: string, path: string): Promise<Result<void>>;
    async handleValidationError(errors: string[], context: string): Promise<Result<void>>;
    createUserFriendlyMessage(error: ExtensionError): string;
}
```

## Validation

### Type Guards
```typescript
class TypeGuards {
    static isString(value: unknown): value is string;
    static isAgentConfig(value: unknown): value is AgentConfig;
    static isValidAgentName(value: unknown): value is string;
    static isValidPath(value: unknown): value is string;
    static hasProperty<T, K>(obj: T, key: K): obj is T & Record<K, unknown>;
}
```

### Input Validation
```typescript
class InputValidator {
    static validateAgentName(name: unknown): Result<string>;
    static validateFilePath(path: unknown): Result<string>;
    static validateToolsList(tools: unknown): Result<string[]>;
    static validateRequired<T>(value: T | null | undefined, fieldName: string): Result<T>;
}
```

### Configuration Validation
```typescript
class ConfigurationValidator {
    static validateAgentConfig(config: unknown): Result<AgentConfig>;
    static validatePartialAgentConfig(config: unknown): Result<Partial<AgentConfig>>;
    static validateConfigurationFile(content: string): Result<AgentConfig>;
    static getValidationSummary(config: unknown): ValidationSummary;
}
```

## Command Handlers

### Base Command Handler
```typescript
abstract class BaseCommandHandler {
    protected async executeCommand<T>(
        commandName: string,
        operation: () => Promise<Result<T>>,
        successMessage?: string,
        errorMessage?: string
    ): Promise<void>;
    
    protected validateInput(value: string, fieldName: string): Result<string>;
}
```

### Agent Commands
```typescript
class AgentCommandHandler extends BaseCommandHandler {
    async createAgent(): Promise<void>;
    async openAgent(agentItem: AgentItem): Promise<void>;
    async deleteAgent(agentItem: AgentItem): Promise<void>;
    async refreshAgents(): Promise<void>;
}
```

### Context Commands
```typescript
class ContextCommandHandler extends BaseCommandHandler {
    setCurrentAgent(agentName: string): void;
    async addContextItem(): Promise<void>;
    async removeContextItem(contextItem: ContextItem): Promise<void>;
    async clearContext(): Promise<void>;
    async openContextItem(contextItem: ContextItem): Promise<void>;
}
```

## Data Models

### Agent
```typescript
class Agent {
    constructor(
        public readonly name: string,
        public readonly config: AgentConfig,
        public readonly filePath: string
    ) {}
    
    static create(name: string, filePath: string): Result<Agent>;
    validate(): ValidationResult;
    updateConfig(config: Partial<AgentConfig>): Agent;
}
```

### AgentConfig
```typescript
interface AgentConfig {
    readonly $schema: string;
    readonly name: string;
    readonly description: string;
    readonly prompt: string | null;
    readonly tools: readonly string[];
    readonly allowedTools: readonly string[];
    readonly resources: readonly string[];
    readonly mcpServers: Readonly<Record<string, any>>;
    readonly toolAliases: Readonly<Record<string, string>>;
    readonly hooks: Readonly<Record<string, any>>;
    readonly toolsSettings: Readonly<Record<string, any>>;
    readonly useLegacyMcpJson: boolean;
}
```

### ContextItem
```typescript
class ContextItem {
    constructor(
        public readonly path: string,
        public readonly type: ContextType,
        public readonly metadata?: ContextMetadata
    ) {}
}

enum ContextType {
    FILE = 'file',
    DIRECTORY = 'directory',
    GLOB_PATTERN = 'glob'
}
```

## Extension Points

### Dependency Injection
```typescript
// Register services
container.register('agentService', () => new AgentDomainService(repository));

// Resolve services
const service = await container.getService<AgentDomainService>('agentService');
```

### Event Handling
```typescript
// File system events
fileWatcher.onDidChange((event: FileEvent) => {
    cacheInvalidationStrategy.handleFileSystemEvent(event);
});

// Agent list changes
agentManagementService.onAgentListChanged((agents: AgentItem[]) => {
    treeProvider.refresh();
});
```

### Performance Monitoring
```typescript
// Measure operations
const result = await performanceMonitor.measureAsync('loadAgents', async () => {
    return await agentRepository.findAll();
});

// Benchmark operations
const benchmark = await performanceBenchmark.runBenchmark('agentCreation', 
    () => agentService.createAgent('test'), 10);
```

## Usage Examples

### Creating an Agent
```typescript
const agentService = container.resolve<AgentDomainService>('agentService');
const result = await agentService.createAgent('my-agent', basicTemplate);

if (result.success) {
    console.log('Agent created:', result.data.name);
} else {
    console.error('Failed to create agent:', result.error.message);
}
```

### Adding Context
```typescript
const contextService = container.resolve<ContextDomainService>('contextService');
const result = await contextService.addContextItem('my-agent', '/path/to/file.ts', ContextType.FILE);

if (!result.success) {
    await errorHandler.handleValidationError([result.error.message], 'context-addition');
}
```

### Performance Monitoring
```typescript
const monitor = container.resolve<PerformanceMonitor>('performanceMonitor');

// Start monitoring
monitor.startTimer('file-operation');

// Perform operation
await fileSystem.readFile('/path/to/file');

// End monitoring
const duration = monitor.endTimer('file-operation');
console.log(`Operation took ${duration}ms`);
```
