# Architecture Overview: Context Manager for Q CLI

## New Architecture (Post-Refactoring)

The Context Manager has been completely refactored to implement a clean, layered architecture with proper separation of concerns.

### Architecture Layers

```
src/
├── core/                    # Domain logic and business rules
│   ├── agent/              # Agent domain (entities, services, repositories)
│   │   ├── Agent.ts        # Agent entity with immutable properties
│   │   ├── AgentDomainService.ts  # Business logic for agents
│   │   ├── IAgentRepository.ts    # Repository interface
│   │   └── AgentTemplate.ts       # Agent templates
│   ├── context/            # Context domain (entities, services, repositories)
│   │   ├── ContextItem.ts  # Context entity
│   │   ├── ContextDomainService.ts # Business logic for context
│   │   └── IContextRepository.ts   # Repository interface
│   └── shared/             # Shared domain concepts
├── infrastructure/         # External dependencies and adapters
│   ├── repositories/       # Data access implementations
│   ├── FileWatcherPool.ts  # Resource pooling for file watchers
│   ├── BatchProcessor.ts   # Batch processing optimization
│   └── PerformanceMonitor.ts # Performance tracking
├── shared/                 # Cross-cutting concerns
│   ├── container/          # Dependency injection
│   ├── errors/             # Error handling framework
│   ├── infrastructure/     # Infrastructure interfaces
│   ├── cache/              # Caching layer
│   ├── performance/        # Performance optimization
│   └── validation/         # Type safety and validation
├── presentation/           # UI layer (commands, providers, views)
│   └── commands/           # Command handlers
├── providers/              # Tree data providers
└── services/               # Application services
```

### Key Architectural Patterns

#### 1. Dependency Injection
- **DependencyContainer**: Manages service lifecycle and dependencies
- **LazyServiceLoader**: Deferred service initialization for performance
- **ExtensionContainer**: Central service registry

#### 2. Result Pattern
- Eliminates exceptions in business logic
- Explicit error handling with `Result<T, E>`
- Composable error handling patterns

#### 3. Domain-Driven Design
- **Entities**: Agent, ContextItem with business rules
- **Domain Services**: AgentDomainService, ContextDomainService
- **Repositories**: Abstract data access with interfaces

#### 4. Performance Optimization
- **Caching Layer**: Multi-level caching with invalidation
- **Batch Processing**: Grouped file operations
- **Memory Management**: Automatic garbage collection and monitoring
- **Resource Pooling**: Shared file watchers and event listeners

### Service Architecture

#### Core Services
- **AgentDomainService**: Agent business logic and validation
- **ContextDomainService**: Context management and validation
- **ErrorRecoveryManager**: Contextual error handling and recovery

#### Infrastructure Services
- **CachedFileSystemAdapter**: Optimized file operations with caching
- **PerformanceMonitor**: Real-time performance tracking
- **MemoryOptimizer**: Memory usage monitoring and optimization

#### Application Services
- **RefactoredAgentConfigService**: Agent configuration management
- **RefactoredAgentManagementService**: Agent lifecycle management

### Error Handling Strategy

#### Centralized Error Management
- **ExtensionError**: Categorized errors with context
- **ErrorRecoveryManager**: Strategy-based error recovery
- **ContextualErrorHandler**: User-friendly error messages

#### Error Categories
- **FILE_SYSTEM**: File operations and permissions
- **VALIDATION**: Input and configuration validation
- **NETWORK**: Network connectivity issues
- **USER_INPUT**: Invalid user input
- **SYSTEM**: Internal system errors

### Performance Characteristics

#### Optimization Targets Achieved
- **Extension Activation**: < 100ms (currently ~15ms build time)
- **Bundle Size**: 378KB (development), optimized for production
- **Memory Usage**: Monitored with automatic cleanup
- **File Operations**: Batched and cached for efficiency

#### Caching Strategy
- **Agent Configurations**: 5-minute TTL
- **File System Metadata**: 1-minute TTL
- **Directory Listings**: 30-second TTL
- **Event-driven Invalidation**: Automatic cache updates

### Type Safety

#### Runtime Validation
- **TypeGuards**: Comprehensive type checking
- **InputValidator**: Input sanitization and validation
- **ConfigurationValidator**: Schema validation for agent configs

#### Strict TypeScript Configuration
- No `any` types allowed
- Strict null checks enabled
- Enhanced type safety throughout codebase

### Build and Development

#### Unified Build System
- **build.unified.config.js**: Single build configuration
- **Development Mode**: Fast builds with source maps
- **Production Mode**: Minified with tree shaking
- **Bundle Analysis**: Dependency tracking and optimization

#### Development Workflow
- **Watch Mode**: Automatic rebuilds on changes
- **Testing**: Unit, integration, and performance tests
- **Linting**: Automated code quality checks
- **Type Checking**: Continuous TypeScript validation

## Migration Benefits

### Before Refactoring
- Monolithic extension.ts (600+ lines)
- Inconsistent error handling
- Over-engineered interfaces
- Scattered test files
- Performance bottlenecks

### After Refactoring
- Clean layered architecture
- Consistent Result pattern error handling
- Proper dependency injection
- Consolidated test structure
- Optimized performance with caching and batching

### Maintainability Improvements
- **Separation of Concerns**: Clear boundaries between layers
- **Testability**: Dependency injection enables easy mocking
- **Extensibility**: Plugin-like architecture for new features
- **Performance**: Caching and optimization built-in
- **Type Safety**: Runtime validation prevents errors

### Recent UI Enhancements (v1.0.1)

#### Agent Tree View Improvements
- **Context Menu Integration**: Added right-click context menu for agent items
  - "Open Agent Configuration" - Opens agent JSON file in editor
  - "Run Agent in Terminal" - Launches `q chat --agent "<name>"` in new terminal
- **Inline Action Buttons**: Added play button (▶️) next to each agent for quick execution
- **Streamlined UI**: Removed redundant "Create New Agent" tree item, using title bar + button instead
- **Improved Empty State**: Updated message to guide users to the + button in title bar
- **Context Value Mapping**: Fixed `viewItem` mapping from `agent` to `agentItem` for proper menu integration

#### Technical Implementation
- **Package.json Menu Configuration**: 
  ```json
  "view/item/context": [
    {
      "command": "qcli-agents.openAgent",
      "when": "view == qcli-agents-tree && viewItem == agentItem",
      "group": "inline@1"
    },
    {
      "command": "qcli-agents.runAgent", 
      "when": "view == qcli-agents-tree && viewItem == agentItem",
      "group": "inline@2"
    }
  ]
  ```
- **Command Registration**: Added `qcli-agents.runAgent` command with terminal integration
- **Tree Provider Cleanup**: Removed `createNewAgentItem()` method and updated `getRootItems()`

## Future Architecture Considerations

### Scalability
- Plugin system for extending functionality
- Event-driven architecture for loose coupling
- Microservice-like domain separation

### Performance
- Web Workers for heavy operations
- Streaming for large file operations
- Progressive loading for large agent lists

### Reliability
- Circuit breaker pattern for external dependencies
- Retry mechanisms with exponential backoff
- Health checks and monitoring
