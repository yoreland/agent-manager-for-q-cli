# Migration Guide

## Overview

This guide helps developers understand the changes made during the architecture refactoring and how to work with the new codebase.

## Major Changes

### 1. Architecture Restructure

#### Before
```
src/
├── extension.ts (600+ lines)
├── services/
├── providers/
├── types/
└── test/
```

#### After
```
src/
├── core/                    # Domain logic
├── infrastructure/         # External dependencies
├── shared/                 # Cross-cutting concerns
├── presentation/           # UI layer
├── providers/              # Tree providers
├── services/               # Application services
└── __tests__/              # Consolidated tests
```

### 2. Error Handling Migration

#### Before - Exception-based
```typescript
// Old approach
async function loadAgent(name: string): Promise<Agent> {
    const agent = await repository.findByName(name);
    if (!agent) {
        throw new Error('Agent not found');
    }
    return agent;
}

// Usage
try {
    const agent = await loadAgent('test');
    // handle success
} catch (error) {
    // handle error
}
```

#### After - Result Pattern
```typescript
// New approach
async function loadAgent(name: string): Promise<Result<Agent>> {
    const result = await repository.findByName(name);
    if (!result.success) {
        return failure(result.error);
    }
    if (!result.data) {
        return failure(new Error('Agent not found'));
    }
    return success(result.data);
}

// Usage
const result = await loadAgent('test');
if (result.success) {
    // handle success with result.data
} else {
    // handle error with result.error
}
```

### 3. Service Registration Migration

#### Before - Direct Instantiation
```typescript
// Old approach
class ExtensionManager {
    private agentService = new AgentConfigService();
    private contextService = new ContextManager();
}
```

#### After - Dependency Injection
```typescript
// New approach
class ExtensionManager {
    constructor(
        private agentService: RefactoredAgentConfigService,
        private contextService: ContextDomainService
    ) {}
}

// Registration
container.register('agentService', () => 
    new RefactoredAgentConfigService(repository, domainService, logger)
);
```

### 4. Validation Migration

#### Before - Manual Checks
```typescript
// Old approach
function validateAgentName(name: string): void {
    if (!name || name.length === 0) {
        throw new Error('Name is required');
    }
    if (!/^[a-zA-Z0-9_-]+$/.test(name)) {
        throw new Error('Invalid name format');
    }
}
```

#### After - Type Guards and Validators
```typescript
// New approach
function validateAgentName(name: unknown): Result<string> {
    if (!TypeGuards.isString(name)) {
        return failure(new Error('Name must be a string'));
    }
    return InputValidator.validateAgentName(name);
}
```

## Migration Steps

### Step 1: Update Imports

#### Old Imports
```typescript
import { AgentConfigService } from '../services/agentConfigService';
import { ContextManager } from '../services/contextManager';
```

#### New Imports
```typescript
import { RefactoredAgentConfigService } from '../services/RefactoredAgentConfigService';
import { ContextDomainService } from '../core/context/ContextDomainService';
import { Result, success, failure } from '../shared/errors/result';
```

### Step 2: Update Error Handling

#### Replace Try-Catch with Result Pattern
```typescript
// Before
async function saveAgent(agent: Agent): Promise<void> {
    try {
        await fs.writeFile(agent.filePath, JSON.stringify(agent.config));
        logger.info('Agent saved successfully');
    } catch (error) {
        logger.error('Failed to save agent', error);
        throw error;
    }
}

// After
async function saveAgent(agent: Agent): Promise<Result<void>> {
    const writeResult = await fileSystem.writeFile(agent.filePath, JSON.stringify(agent.config));
    if (!writeResult.success) {
        logger.error('Failed to save agent', writeResult.error);
        return failure(writeResult.error);
    }
    
    logger.info('Agent saved successfully');
    return success(undefined);
}
```

### Step 3: Update Service Usage

#### Before - Direct Service Access
```typescript
class AgentTreeProvider {
    private agentService = new AgentConfigService();
    
    async getChildren(): Promise<TreeItem[]> {
        const agents = await this.agentService.getAllAgents();
        return agents.map(agent => new AgentTreeItem(agent));
    }
}
```

#### After - Dependency Injection
```typescript
class RefactoredAgentTreeProvider {
    constructor(
        private agentManagementService: RefactoredAgentManagementService,
        private logger: ILogger,
        private performanceMonitor: PerformanceMonitor
    ) {}
    
    async getChildren(): Promise<AgentTreeItem[]> {
        return this.performanceMonitor.measureAsync('getAgentTreeChildren', async () => {
            const result = await this.agentManagementService.getAgentList();
            if (!result.success) {
                this.logger.error('Failed to get agent list', result.error);
                return [];
            }
            return result.data.map(agent => this.createAgentTreeItem(agent));
        });
    }
}
```

### Step 4: Update Validation

#### Before - Manual Validation
```typescript
function createAgent(name: string, config: any): Agent {
    if (!name) throw new Error('Name required');
    if (typeof config !== 'object') throw new Error('Config must be object');
    
    return new Agent(name, config);
}
```

#### After - Type Guards and Validators
```typescript
function createAgent(name: unknown, config: unknown): Result<Agent> {
    const nameResult = InputValidator.validateAgentName(name);
    if (!nameResult.success) {
        return failure(nameResult.error);
    }
    
    const configResult = ConfigurationValidator.validateAgentConfig(config);
    if (!configResult.success) {
        return failure(configResult.error);
    }
    
    return Agent.create(nameResult.data, configResult.data);
}
```

## Breaking Changes

### 1. Service Interfaces

#### Removed Services
- `AgentConfigService` → Use `RefactoredAgentConfigService`
- `AgentManagementService` → Use `RefactoredAgentManagementService`
- `ContextManager` → Use `ContextDomainService`

#### Changed Method Signatures
```typescript
// Before
async getAllAgents(): Promise<Agent[]>

// After
async getAllAgents(): Promise<Result<Agent[]>>
```

### 2. Error Handling

#### No More Thrown Exceptions
All service methods now return `Result<T>` instead of throwing exceptions.

#### Error Categories
Errors are now categorized:
- `FILE_SYSTEM`: File operation errors
- `VALIDATION`: Input validation errors
- `NETWORK`: Network-related errors
- `USER_INPUT`: User input errors
- `SYSTEM`: Internal system errors

### 3. Configuration Changes

#### Build Scripts
```json
{
  "scripts": {
    "build": "node build.unified.config.js build",
    "build:dev": "NODE_ENV=development node build.unified.config.js build",
    "build:prod": "NODE_ENV=production node build.unified.config.js build",
    "watch": "NODE_ENV=development node build.unified.config.js watch"
  }
}
```

#### Test Structure
- All tests moved to `src/__tests__/`
- Separate configs for unit, integration, and performance tests
- Consolidated test utilities

## Compatibility Layer

For gradual migration, compatibility adapters are provided:

### LegacyAgentConfigServiceAdapter
```typescript
class LegacyAgentConfigServiceAdapter implements IAgentConfigService {
    constructor(private newService: RefactoredAgentConfigService) {}
    
    async getAllAgents(): Promise<Agent[]> {
        const result = await this.newService.getAllAgents();
        if (!result.success) {
            throw result.error;
        }
        return result.data;
    }
}
```

## Testing Migration

### Before - Manual Mocking
```typescript
describe('AgentService', () => {
    it('should load agents', async () => {
        const service = new AgentConfigService();
        // Manual setup and mocking
    });
});
```

### After - Dependency Injection
```typescript
describe('RefactoredAgentConfigService', () => {
    let service: RefactoredAgentConfigService;
    let mockRepository: jest.Mocked<IAgentRepository>;
    
    beforeEach(() => {
        mockRepository = createMockRepository();
        service = new RefactoredAgentConfigService(mockRepository, mockDomainService, mockLogger);
    });
    
    it('should load agents', async () => {
        mockRepository.findAll.mockResolvedValue(success([mockAgent]));
        
        const result = await service.getAllAgents();
        
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data).toHaveLength(1);
        }
    });
});
```

## Performance Considerations

### New Performance Features
- **Caching**: Automatic caching of file operations and agent configurations
- **Batch Processing**: Grouped file operations for better performance
- **Memory Monitoring**: Automatic memory usage tracking and optimization
- **Performance Metrics**: Built-in performance monitoring and benchmarking

### Migration Benefits
- **Faster Startup**: Lazy loading reduces initial load time
- **Better Memory Usage**: Proper disposal patterns prevent memory leaks
- **Optimized File Operations**: Caching and batching improve I/O performance
- **Bundle Optimization**: Tree shaking reduces bundle size

## Troubleshooting

### Common Migration Issues

#### 1. Import Errors
**Problem**: Cannot find module after refactoring
**Solution**: Update import paths to new structure

#### 2. Type Errors
**Problem**: TypeScript errors due to Result pattern
**Solution**: Update code to handle Result types properly

#### 3. Test Failures
**Problem**: Tests fail due to new architecture
**Solution**: Update tests to use dependency injection and Result pattern

#### 4. Performance Regression
**Problem**: Slower performance after migration
**Solution**: Enable caching and use performance monitoring to identify bottlenecks

### Getting Help

1. Check the [API Documentation](./API.md) for interface details
2. Review the [Development Guide](./DEVELOPMENT.md) for coding standards
3. Look at existing tests for usage examples
4. Use the performance monitoring tools to identify issues

## Timeline

The migration was completed in phases:

1. **Foundation** (Tasks 1-4): Test consolidation, error handling, dependency injection
2. **Core Refactoring** (Tasks 5-10): Domain layer, services, and providers
3. **Optimization** (Tasks 11-17): Commands, performance, caching, validation
4. **Documentation** (Task 18): Comprehensive documentation and guides

All existing functionality has been preserved while improving architecture, performance, and maintainability.
