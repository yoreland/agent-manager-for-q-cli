# Technology Stack: Context Manager for Q CLI

## Core Technologies

### Development Platform
- **VS Code Extension API**: Primary platform for extension development
- **TypeScript**: Main programming language for type safety and developer experience
- **Node.js**: Runtime environment for extension execution

### Build & Development Tools
- **ESBuild**: Fast bundling and compilation for production builds
- **npm**: Package management and dependency resolution
- **VS Code Extension Development Host**: Testing and debugging environment

### Key Dependencies
- **vscode**: VS Code Extension API (provided by platform)
- **@types/vscode**: TypeScript definitions for VS Code API
- **@types/node**: Node.js type definitions

## Architecture Patterns

### Extension Architecture
- **Activation Pattern**: Lazy activation on first use to minimize VS Code startup impact
- **Command Pattern**: VS Code commands for all user-triggered actions
- **Observer Pattern**: File system watchers for real-time updates
- **Provider Pattern**: Custom tree data providers for context visualization

### File System Integration
- **Async/Await**: All file operations use modern async patterns
- **Path Resolution**: Cross-platform path handling using Node.js path module
- **JSON Manipulation**: Safe parsing and writing of agent configuration files

## Technical Constraints

### VS Code Extension Limitations
- **Sandbox Environment**: Limited access to system resources
- **Memory Constraints**: Efficient memory usage required for large projects
- **API Restrictions**: Must work within VS Code Extension API boundaries

### Q CLI Integration Requirements
- **File Path Format**: Must use `file://` prefix for all resource paths
- **JSON Schema Compliance**: Agent configuration files must maintain valid JSON structure
- **Glob Pattern Support**: Handle glob patterns for directory-based context

### Performance Requirements
- **Startup Time**: Extension activation under 100ms
- **File Operations**: Non-blocking file system operations
- **UI Responsiveness**: Drag & drop operations complete within 200ms

## Development Environment

### Required Tools
- **VS Code**: Latest stable version for development and testing
- **Node.js**: Version 18+ for modern JavaScript features
- **npm**: Version 8+ for package management
- **TypeScript**: Version 4.9+ for latest language features

### Build Configuration
- **Target**: ES2020 for modern JavaScript support
- **Module System**: CommonJS for VS Code compatibility
- **Source Maps**: Enabled for debugging support
- **Minification**: Enabled for production builds

## Quality Assurance

### Testing Strategy
- **Unit Tests**: Jest for isolated component testing
- **Integration Tests**: VS Code Extension Test Runner
- **Manual Testing**: Extension Development Host for user workflow testing

### Code Quality
- **ESLint**: Code linting with TypeScript rules
- **Prettier**: Code formatting consistency
- **Type Checking**: Strict TypeScript configuration