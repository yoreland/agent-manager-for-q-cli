# Context Manager for Q CLI

A VS Code Extension that simplifies Amazon Q Developer CLI context management through an intuitive drag-and-drop interface, eliminating the need for manual JSON configuration editing.

## Features

- **Activity Bar Integration**: Access Context Manager directly from VS Code's Activity Bar
- **Command Palette Support**: Open Context Manager using "Q CLI: Context Manager 열기" command
- **Tree View Interface**: Visual representation of context files and management options
- **Webview Panel**: Dedicated panel for context management operations
- **Comprehensive Logging**: Built-in logging system with configurable log levels
- **Error Handling**: Robust error handling with user-friendly notifications
- **Performance Optimized**: Fast startup (< 100ms) with caching and batch processing
- **Type Safe**: Comprehensive runtime validation and type checking

## Architecture

This extension follows a clean, layered architecture:

- **Core Layer**: Domain entities and business logic (Agent, Context management)
- **Infrastructure Layer**: External dependencies and adapters (File system, caching)
- **Presentation Layer**: VS Code UI components (Commands, tree providers)
- **Shared Layer**: Cross-cutting concerns (Error handling, validation, performance)

### Key Features

- **Result Pattern**: Explicit error handling without exceptions
- **Dependency Injection**: Loose coupling and testability
- **Caching Layer**: Optimized file operations with intelligent invalidation
- **Performance Monitoring**: Real-time metrics and benchmarking
- **Memory Management**: Automatic garbage collection and leak prevention

## Requirements

- VS Code 1.103.0 or higher
- Node.js 18+ (for development)

## Installation

1. Install the extension from the VS Code Marketplace
2. Reload VS Code
3. The Q CLI Context Manager icon will appear in the Activity Bar

## Usage

### Opening Context Manager

**Method 1: Activity Bar**
1. Click the Q CLI Context icon in the Activity Bar
2. The Context Manager view will open in the side panel

**Method 2: Command Palette**
1. Press `Ctrl+Shift+P` (Windows/Linux) or `Cmd+Shift+P` (macOS)
2. Type "Q CLI: Context Manager 열기"
3. Press Enter to open the Context Manager panel

### Managing Context

- Use the tree view in the Activity Bar to see current context
- Click the refresh button to update the context view
- Access detailed management through the webview panel

## Development

### Quick Start
```bash
# Clone and setup
git clone <repository-url>
cd context-manager-for-q-cli
npm install

# Development build
npm run build:dev

# Watch mode
npm run watch

# Run tests
npm test
```

### Building the Extension

```bash
# Development build (fast, with source maps)
npm run build:dev

# Production build (optimized, minified)
npm run build:prod

# Watch mode for development
npm run watch

# Bundle analysis
npm run analyze
```

### Testing

```bash
# Run all tests
npm test

# Unit tests
npm run test:unit

# Integration tests
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

# Full quality check (lint + types + build)
npm run package
```

### Packaging

```bash
# Create VSIX package
npm run package:vsix

# Package without rebuilding
npm run package:vsix:skip-build
```

## Architecture Documentation

- [Architecture Overview](./.kiro/steering/architecture.md) - Detailed architecture documentation
- [Development Guide](./DEVELOPMENT.md) - Development setup and guidelines
- [API Documentation](./API.md) - Complete API reference
- [Migration Guide](./MIGRATION.md) - Guide for understanding architectural changes

## Performance

- **Extension Activation**: < 100ms (typically ~15ms)
- **Bundle Size**: 378KB (development), optimized for production
- **Memory Usage**: Monitored with automatic cleanup
- **File Operations**: Batched and cached for efficiency

## Testing Coverage

- **Unit Tests**: Individual component testing with mocking
- **Integration Tests**: Component interaction testing
- **Performance Tests**: Benchmarking and memory monitoring
- **E2E Tests**: Complete user workflow validation

## Contributing

### Development Workflow
1. Create feature branch from main
2. Implement changes with tests
3. Run quality checks: `npm run package`
4. Submit PR with clear description

### Code Standards
- Use TypeScript strict mode (no `any` types)
- Follow Result pattern for error handling
- Use dependency injection for loose coupling
- Include comprehensive tests for new features

### Commit Messages
Use conventional commits format:
```
feat: add agent template support
fix: resolve memory leak in file watcher
docs: update architecture documentation
test: add integration tests for caching
```

## Known Issues

- Configuration validation requires strict TypeScript compliance
- Some legacy VS Code API compatibility considerations

## Release Notes

### 1.0.1 (Latest)

**Agent Tree View Enhancements:**
- Added context menu for agent items with "Open Agent Configuration" and "Run Agent in Terminal" options
- Added inline play button (▶️) next to each agent for quick terminal execution
- Removed "Create New Agent" item from tree view (use + button in title bar instead)
- Updated empty state message to guide users to the + button
- Fixed contextValue mapping for proper menu integration

**User Experience Improvements:**
- Right-click on any agent to access configuration and execution options
- Click the ▶️ button for instant terminal launch with `q chat --agent "<agent name>"`
- Cleaner tree view without redundant create button
- Consistent UI patterns following VS Code conventions

### 1.0.0

**Major Architecture Refactoring:**
- Complete rewrite with clean, layered architecture
- Result pattern for explicit error handling
- Dependency injection for better testability
- Performance optimizations with caching and batching
- Comprehensive type safety and validation
- Enhanced error recovery mechanisms

**Performance Improvements:**
- Extension activation < 100ms
- Intelligent caching with automatic invalidation
- Memory usage monitoring and optimization
- Batch processing for file operations

**Developer Experience:**
- Unified build configuration
- Comprehensive test suite (unit, integration, performance)
- Enhanced debugging and logging
- Complete API documentation

### 0.0.1 (Initial)

Initial release of Context Manager for Q CLI:
- Basic VS Code extension structure
- Activity Bar integration
- Command palette support
- Tree view provider
- Webview panel implementation
- Logging system
- Build and packaging configuration

## License

This project is licensed under the MIT License.

## Support

For issues and feature requests, please use the GitHub issue tracker.

For development questions, see:
- [Development Guide](./DEVELOPMENT.md)
- [API Documentation](./API.md)
- [Migration Guide](./MIGRATION.md)
