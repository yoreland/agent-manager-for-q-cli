# Architecture Overview: Agent Manager for Q CLI

## System Architecture

The Agent Manager for Q CLI is a VS Code extension built with a clean, layered architecture following Domain-Driven Design principles.

### Core Architecture Layers

```
src/
├── core/                    # Domain logic and business rules
│   ├── agent/              # Agent domain (entities, services, repositories)
│   ├── context/            # Context domain (entities, services, repositories)
│   └── shared/             # Shared domain concepts
├── infrastructure/         # External dependencies and adapters
│   ├── repositories/       # Data access implementations
│   └── performance/        # Performance optimization
├── shared/                 # Cross-cutting concerns
│   ├── container/          # Dependency injection
│   ├── errors/             # Error handling framework
│   ├── cache/              # Caching layer
│   └── validation/         # Type safety and validation
├── presentation/           # UI layer (commands, providers, views)
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

### Agent Configuration System

The extension manages Q CLI agents through JSON configuration files:

**Local Agents**: `.amazonq/cli-agents/` (workspace-specific)
**Global Agents**: `~/.aws/amazonq/cli-agents/` (user-wide)

### Hook Configuration Architecture

```
Hook Layer Architecture:
├── UI Layer (wizardWebviewProvider.ts)
├── Validation Layer (Security & Syntax)
├── State Management Layer (Hook CRUD)
└── Template Layer (Predefined Templates)
```

### Performance Optimization

- **Caching Layer**: Multi-level caching with invalidation
- **Batch Processing**: Grouped file operations
- **Memory Management**: Automatic garbage collection
- **Resource Pooling**: Shared file watchers and event listeners

### Error Handling Strategy

- **ExtensionError**: Categorized errors with context
- **ErrorRecoveryManager**: Strategy-based error recovery
- **ContextualErrorHandler**: User-friendly error messages

### Build System

- **ESBuild**: Fast bundling and compilation
- **TypeScript**: Strict type checking
- **Bundle Size**: 378KB optimized for production
- **Extension Activation**: < 100ms target
