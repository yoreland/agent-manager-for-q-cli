# Development Guide

## Getting Started

### Prerequisites
- Node.js 18+
- VS Code 1.103.0+
- Git

### Setup
```bash
# Clone the repository
git clone <repository-url>
cd context-manager-for-q-cli

# Install dependencies
npm install

# Build the extension
npm run build:dev

# Run tests
npm test
```

## Architecture Overview

This extension follows a clean, layered architecture:

- **Core Layer**: Domain entities and business logic
- **Infrastructure Layer**: External dependencies and adapters
- **Presentation Layer**: VS Code UI components
- **Shared Layer**: Cross-cutting concerns

## Development Workflow

### Building
```bash
# Development build (fast, with source maps)
npm run build:dev

# Production build (optimized, minified)
npm run build:prod

# Watch mode (auto-rebuild on changes)
npm run watch

# Bundle analysis
npm run analyze
```

### Testing
```bash
# Run all tests
npm test

# Unit tests only
npm run test:unit

# Integration tests only
npm run test:integration

# Performance tests
npm run test:performance

# Watch mode
npm run test:unit:watch
```

### Code Quality
```bash
# Lint and fix
npm run lint

# Type checking
npm run check-types

# Full quality check
npm run package
```

## Coding Standards

### TypeScript Guidelines
- Use strict TypeScript configuration
- No `any` types allowed
- Prefer interfaces over type aliases for object shapes
- Use Result pattern for error handling

### Error Handling
```typescript
// ✅ Good - Use Result pattern
async function loadAgent(name: string): Promise<Result<Agent>> {
    try {
        const agent = await repository.findByName(name);
        return success(agent);
    } catch (error) {
        return failure(error as Error);
    }
}

// ❌ Bad - Throwing exceptions
async function loadAgent(name: string): Promise<Agent> {
    const agent = await repository.findByName(name);
    if (!agent) {
        throw new Error('Agent not found');
    }
    return agent;
}
```

### Dependency Injection
```typescript
// ✅ Good - Constructor injection
class AgentService {
    constructor(
        private repository: IAgentRepository,
        private logger: ILogger
    ) {}
}

// ❌ Bad - Direct instantiation
class AgentService {
    private repository = new FileSystemAgentRepository();
    private logger = new ConsoleLogger();
}
```

### Validation
```typescript
// ✅ Good - Runtime validation
function validateAgentName(name: unknown): Result<string> {
    if (!TypeGuards.isString(name)) {
        return failure(new Error('Name must be a string'));
    }
    if (!TypeGuards.isValidAgentName(name)) {
        return failure(new Error('Invalid agent name format'));
    }
    return success(name);
}
```

## Testing Guidelines

### Unit Tests
- Test individual components in isolation
- Use dependency injection for mocking
- Focus on business logic and edge cases

```typescript
describe('AgentDomainService', () => {
    let service: AgentDomainService;
    let mockRepository: jest.Mocked<IAgentRepository>;

    beforeEach(() => {
        mockRepository = createMockRepository();
        service = new AgentDomainService(mockRepository);
    });

    it('should create agent with valid name', async () => {
        const result = await service.createAgent('test-agent');
        expect(result.success).toBe(true);
    });
});
```

### Integration Tests
- Test component interactions
- Use real implementations where possible
- Test complete workflows

### Performance Tests
- Benchmark critical operations
- Monitor memory usage
- Validate performance targets

## Performance Guidelines

### Caching
- Cache frequently accessed data
- Implement cache invalidation strategies
- Monitor cache hit rates

### Memory Management
- Dispose of resources properly
- Avoid memory leaks in event listeners
- Use weak references where appropriate

### File Operations
- Batch multiple operations
- Use async/await consistently
- Implement proper error handling

## Debugging

### VS Code Debugging
1. Open the project in VS Code
2. Press F5 to launch Extension Development Host
3. Set breakpoints in TypeScript files
4. Use Debug Console for inspection

### Logging
```typescript
// Use structured logging
logger.info('Agent created', { 
    agentName: agent.name,
    templateUsed: template?.name 
});

// Include context in error logs
logger.error('Failed to save agent', error, {
    agentName: agent.name,
    operation: 'save'
});
```

## Contributing

### Pull Request Process
1. Create feature branch from main
2. Implement changes with tests
3. Run quality checks: `npm run package`
4. Submit PR with clear description

### Code Review Checklist
- [ ] Tests cover new functionality
- [ ] Error handling follows Result pattern
- [ ] TypeScript strict mode compliance
- [ ] Performance considerations addressed
- [ ] Documentation updated

### Commit Messages
Use conventional commits format:
```
feat: add agent template support
fix: resolve memory leak in file watcher
docs: update architecture documentation
test: add integration tests for caching
```

## Troubleshooting

### Common Issues

#### Build Failures
- Check TypeScript errors: `npm run check-types`
- Verify dependencies: `npm install`
- Clear build cache: `npm run clean && npm run build`

#### Test Failures
- Run tests individually to isolate issues
- Check for async/await issues
- Verify mock configurations

#### Performance Issues
- Use performance profiler: `npm run analyze`
- Check memory usage patterns
- Review caching strategies

### Getting Help
- Check existing issues in repository
- Review architecture documentation
- Ask questions in team channels

## Release Process

### Version Management
- Follow semantic versioning (semver)
- Update CHANGELOG.md
- Tag releases appropriately

### Packaging
```bash
# Create VSIX package
npm run package:vsix

# Publish to marketplace
npm run vsce:publish
```

### Quality Gates
- All tests must pass
- Code coverage > 80%
- No TypeScript errors
- Performance benchmarks met
