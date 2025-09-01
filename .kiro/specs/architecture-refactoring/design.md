# Design Document

## Overview

This design document outlines the comprehensive refactoring of the Context Manager for Q CLI VS Code extension to address architectural debt, improve maintainability, and enhance performance. The refactoring will transform the current structure into a clean, layered architecture while maintaining all existing functionality and user experience.

## Architecture

### Current Architecture Issues

The current architecture suffers from several problems:
- **Monolithic extension.ts**: Over 600 lines handling activation, command registration, and global state management
- **Inconsistent error handling**: Each service implements its own error handling patterns
- **Interface over-engineering**: Every service has an interface despite single implementations
- **Scattered test files**: Tests exist in both `src/__tests__/` and `src/test/` directories
- **Circular dependency risks**: Global state management creates tight coupling
- **Performance bottlenecks**: Synchronous file operations and lack of caching

### Target Architecture

The new architecture will implement a clean layered approach:

```
src/
├── core/                    # Domain logic and business rules
│   ├── agent/              # Agent domain (entities, services, repositories)
│   ├── context/            # Context domain (entities, services, repositories)
│   └── shared/             # Shared domain concepts
├── infrastructure/         # External dependencies and adapters
│   ├── filesystem/         # File system operations
│   ├── vscode/            # VS Code API adapters
│   └── cache/             # Caching implementations
├── presentation/           # UI layer (commands, providers, views)
│   ├── commands/          # Command handlers
│   ├── providers/         # Tree data providers
│   └── views/             # View controllers
├── shared/                 # Cross-cutting concerns
│   ├── types/             # Common type definitions
│   ├── utils/             # Utility functions
│   ├── errors/            # Error handling framework
│   └── logging/           # Logging framework
└── __tests__/             # All test files consolidated
```

## Components and Interfaces

### 1. Dependency Injection Container

**Purpose**: Manage service dependencies and lifecycle

```typescript
interface IDependencyContainer {
    register<T>(token: string, factory: () => T): void;
    resolve<T>(token: string): T;
    dispose(): void;
}

class DependencyContainer implements IDependencyContainer {
    private services = new Map<string, any>();
    private factories = new Map<string, () => any>();
    
    // Implementation with singleton pattern and proper disposal
}
```

**Key Features**:
- Singleton service management
- Lazy initialization
- Proper disposal for memory leak prevention
- Type-safe service resolution

### 2. Result Pattern for Error Handling

**Purpose**: Standardize error handling across all operations

```typescript
type Result<T, E = Error> = {
    success: true;
    data: T;
} | {
    success: false;
    error: E;
};

class ResultBuilder {
    static success<T>(data: T): Result<T> { /* implementation */ }
    static failure<E>(error: E): Result<never, E> { /* implementation */ }
}
```

**Benefits**:
- Explicit error handling
- No thrown exceptions in business logic
- Composable error handling patterns
- Better type safety

### 3. Core Domain Services

#### Agent Domain
```typescript
// Core entity
class Agent {
    constructor(
        public readonly name: string,
        public readonly config: AgentConfig,
        public readonly filePath: string
    ) {}
    
    validate(): ValidationResult { /* implementation */ }
    updateConfig(config: Partial<AgentConfig>): Agent { /* implementation */ }
}

// Repository interface
interface IAgentRepository {
    findAll(): Promise<Result<Agent[]>>;
    findByName(name: string): Promise<Result<Agent | null>>;
    save(agent: Agent): Promise<Result<void>>;
    delete(name: string): Promise<Result<void>>;
}

// Domain service
class AgentDomainService {
    constructor(private repository: IAgentRepository) {}
    
    async createAgent(name: string, template?: AgentTemplate): Promise<Result<Agent>> {
        // Business logic for agent creation
    }
    
    async validateAgentName(name: string): Promise<Result<void>> {
        // Business rules for name validation
    }
}
```

#### Context Domain
```typescript
class ContextItem {
    constructor(
        public readonly path: string,
        public readonly type: ContextType,
        public readonly metadata?: ContextMetadata
    ) {}
}

interface IContextRepository {
    getContextItems(agentName: string): Promise<Result<ContextItem[]>>;
    addContextItem(agentName: string, item: ContextItem): Promise<Result<void>>;
    removeContextItem(agentName: string, path: string): Promise<Result<void>>;
}
```

### 4. Infrastructure Layer

#### File System Adapter
```typescript
interface IFileSystemAdapter {
    readFile(path: string): Promise<Result<string>>;
    writeFile(path: string, content: string): Promise<Result<void>>;
    deleteFile(path: string): Promise<Result<void>>;
    ensureDirectory(path: string): Promise<Result<void>>;
    watchDirectory(path: string, callback: (event: FileEvent) => void): Promise<Result<FileWatcher>>;
}

class CachedFileSystemAdapter implements IFileSystemAdapter {
    constructor(
        private cache: ICache,
        private logger: ILogger
    ) {}
    
    // Implementation with caching layer
}
```

#### VS Code Adapter
```typescript
interface IVSCodeAdapter {
    showInformationMessage(message: string, ...items: string[]): Promise<string | undefined>;
    showErrorMessage(message: string, ...items: string[]): Promise<string | undefined>;
    registerCommand(command: string, callback: (...args: any[]) => any): Disposable;
    createTreeView<T>(viewId: string, options: TreeViewOptions<T>): TreeView<T>;
}
```

### 5. Caching Layer

**Purpose**: Reduce file system operations and improve performance

```typescript
interface ICache {
    get<T>(key: string): Promise<T | null>;
    set<T>(key: string, value: T, ttl?: number): Promise<void>;
    delete(key: string): Promise<void>;
    clear(): Promise<void>;
}

class MemoryCache implements ICache {
    private cache = new Map<string, CacheEntry>();
    private timers = new Map<string, NodeJS.Timeout>();
    
    // Implementation with TTL support and memory management
}
```

**Caching Strategy**:
- Agent configurations cached for 5 minutes
- File system metadata cached for 1 minute
- Directory listings cached for 30 seconds
- Automatic cache invalidation on file changes

### 6. Enhanced Error Handling

```typescript
class ErrorContext {
    constructor(
        public readonly operation: string,
        public readonly resource?: string,
        public readonly metadata?: Record<string, any>
    ) {}
}

interface IErrorHandler {
    handleError(error: Error, context: ErrorContext): Promise<void>;
    handleFileSystemError(error: Error, operation: string, path: string): Promise<void>;
    handleValidationError(errors: string[], context: string): Promise<void>;
}

class EnhancedErrorHandler implements IErrorHandler {
    constructor(
        private logger: ILogger,
        private vscodeAdapter: IVSCodeAdapter
    ) {}
    
    // Contextual error handling with user-friendly messages
}
```

## Data Models

### Enhanced Agent Configuration Model

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

// Immutable configuration with builder pattern
class AgentConfigBuilder {
    private config: Partial<AgentConfig> = {};
    
    withName(name: string): AgentConfigBuilder { /* implementation */ }
    withTools(tools: string[]): AgentConfigBuilder { /* implementation */ }
    build(): AgentConfig { /* implementation */ }
}
```

### Context Management Model

```typescript
enum ContextType {
    FILE = 'file',
    DIRECTORY = 'directory',
    GLOB_PATTERN = 'glob'
}

interface ContextMetadata {
    readonly size?: number;
    readonly lastModified?: Date;
    readonly encoding?: string;
}

interface ContextValidationRule {
    readonly pattern: RegExp;
    readonly message: string;
    readonly severity: 'error' | 'warning';
}
```

## Error Handling

### Centralized Error Management

```typescript
enum ErrorCategory {
    VALIDATION = 'validation',
    FILE_SYSTEM = 'filesystem',
    NETWORK = 'network',
    USER_INPUT = 'user_input',
    SYSTEM = 'system'
}

class ExtensionError extends Error {
    constructor(
        message: string,
        public readonly category: ErrorCategory,
        public readonly context: ErrorContext,
        public readonly cause?: Error
    ) {
        super(message);
        this.name = 'ExtensionError';
    }
}

class ErrorRecoveryStrategy {
    static async handleFileSystemError(error: ExtensionError): Promise<Result<void>> {
        // Implement retry logic, permission checks, etc.
    }
    
    static async handleValidationError(error: ExtensionError): Promise<Result<void>> {
        // Provide user guidance and correction suggestions
    }
}
```

### User-Friendly Error Messages

```typescript
class ErrorMessageBuilder {
    static buildFileSystemErrorMessage(error: Error, operation: string, path: string): string {
        if (error.message.includes('ENOENT')) {
            return `File not found: ${path}. Please check if the file exists and try again.`;
        }
        if (error.message.includes('EACCES')) {
            return `Permission denied: ${path}. Please check file permissions.`;
        }
        return `Failed to ${operation}: ${error.message}`;
    }
}
```

## Testing Strategy

### Test Organization

```
__tests__/
├── unit/                   # Unit tests for individual components
│   ├── core/              # Domain logic tests
│   ├── infrastructure/    # Infrastructure layer tests
│   └── presentation/      # UI layer tests
├── integration/           # Integration tests
│   ├── agent-management/  # Agent CRUD operations
│   ├── context-management/ # Context operations
│   └── file-system/       # File system integration
├── e2e/                   # End-to-end tests
│   ├── user-workflows/    # Complete user scenarios
│   └── performance/       # Performance benchmarks
├── fixtures/              # Test data and mock configurations
└── utils/                 # Test utilities and helpers
```

### Test Utilities

```typescript
class TestAgentBuilder {
    static createValidAgent(overrides?: Partial<AgentConfig>): Agent { /* implementation */ }
    static createInvalidAgent(errors: string[]): Agent { /* implementation */ }
}

class MockFileSystem implements IFileSystemAdapter {
    private files = new Map<string, string>();
    
    // Mock implementation for testing
}

class TestContainer extends DependencyContainer {
    // Test-specific dependency injection setup
}
```

### Performance Testing

```typescript
class PerformanceTestSuite {
    async testActivationTime(): Promise<void> {
        // Ensure activation completes under 100ms
    }
    
    async testFileOperationBatching(): Promise<void> {
        // Test batch processing of multiple file operations
    }
    
    async testMemoryUsage(): Promise<void> {
        // Monitor memory usage during typical operations
    }
}
```

## Performance Optimizations

### 1. Lazy Loading Strategy

```typescript
class LazyServiceLoader {
    private services = new Map<string, Promise<any>>();
    
    async loadService<T>(name: string, factory: () => Promise<T>): Promise<T> {
        if (!this.services.has(name)) {
            this.services.set(name, factory());
        }
        return this.services.get(name)!;
    }
}
```

### 2. Batch Processing

```typescript
class BatchProcessor<T, R> {
    private queue: T[] = [];
    private timer?: NodeJS.Timeout;
    
    constructor(
        private processor: (items: T[]) => Promise<R[]>,
        private batchSize = 10,
        private delay = 100
    ) {}
    
    async add(item: T): Promise<R> {
        // Batch multiple operations together
    }
}
```

### 3. Resource Pooling

```typescript
class FileWatcherPool {
    private watchers = new Map<string, FileWatcher>();
    private refCounts = new Map<string, number>();
    
    async getWatcher(path: string): Promise<FileWatcher> {
        // Reuse existing watchers for the same path
    }
    
    releaseWatcher(path: string): void {
        // Reference counting for proper cleanup
    }
}
```

## Migration Strategy

### Phase 1: Foundation (Week 1-2)
1. **Test Consolidation**: Move all tests to `src/__tests__/`
2. **Error Handling Framework**: Implement Result pattern and centralized error handling
3. **Dependency Injection**: Set up DI container and basic service registration
4. **Type System Enhancement**: Strengthen type definitions and eliminate `any` usage

### Phase 2: Core Refactoring (Week 3-4)
1. **Domain Layer**: Extract agent and context domains
2. **Infrastructure Layer**: Implement file system and VS Code adapters
3. **Caching Layer**: Add caching for file operations
4. **Service Layer Refactoring**: Refactor existing services to use new architecture

### Phase 3: Performance & Polish (Week 5-6)
1. **Performance Optimizations**: Implement batching, lazy loading, and resource pooling
2. **Enhanced Error Handling**: Add contextual error messages and recovery strategies
3. **Documentation**: Update all documentation to reflect new architecture
4. **Final Testing**: Comprehensive testing and performance validation

### Backward Compatibility

```typescript
// Legacy adapter to maintain existing API contracts
class LegacyAgentConfigServiceAdapter implements IAgentConfigService {
    constructor(private newService: AgentDomainService) {}
    
    // Maintain existing method signatures while delegating to new implementation
}
```

## Build and Configuration Optimization

### Unified Build Configuration

```typescript
// build.config.ts - Single source of truth for build settings
export const buildConfig = {
    entry: './src/extension.ts',
    outdir: './out',
    bundle: true,
    minify: process.env.NODE_ENV === 'production',
    sourcemap: true,
    external: ['vscode'],
    define: {
        'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development')
    },
    plugins: [
        // Tree shaking optimization
        // Bundle analysis
        // Performance monitoring
    ]
};
```

### Development Workflow Improvements

```json
{
  "scripts": {
    "dev": "npm run build:dev && npm run watch",
    "build:dev": "node build.config.js --mode=development",
    "build:prod": "node build.config.js --mode=production",
    "test:unit": "jest --config jest.unit.config.js",
    "test:integration": "jest --config jest.integration.config.js",
    "test:e2e": "npm run compile && vscode-test",
    "lint": "eslint src --ext .ts --fix",
    "type-check": "tsc --noEmit",
    "bundle-analysis": "npm run build:prod -- --analyze"
  }
}
```

This design provides a solid foundation for the refactoring effort while ensuring maintainability, performance, and extensibility for future development.