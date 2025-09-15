# Technology Stack: Agent Manager for Q CLI

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
- **Hook Validation**: Real-time security analysis of shell commands

### Hook Configuration System
- **Template Engine**: Pre-defined hook templates for common use cases
- **Security Validation**: Command analysis for dangerous operations
- **Modal Dialogs**: Custom hook creation with webview modals
- **State Management**: Wizard-based configuration with validation

## Technical Implementation

### Agent Configuration Format
Agent configurations are JSON files following Q CLI specification:

```json
{
  "name": "agent-name",
  "description": "Agent description",
  "prompt": "System prompt for agent behavior",
  "tools": ["fs_read", "fs_write", "execute_bash"],
  "allowedTools": ["fs_read"],
  "resources": ["file://README.md", "file://src/**/*.ts"],
  "hooks": {
    "agentSpawn": [{"command": "git status"}],
    "userPromptSubmit": [{"command": "pwd"}]
  }
}
```

### Context Hook Types
- **agentSpawn**: Run once at conversation start
- **userPromptSubmit**: Run with each user message

### Security Features
- **Command Validation**: Analysis of shell commands for dangerous operations
- **Path Validation**: Ensure resource paths are safe and accessible
- **Input Sanitization**: Prevent injection attacks in configuration

## Performance Requirements

### VS Code Extension Constraints
- **Startup Time**: Extension activation under 100ms
- **Memory Usage**: Efficient memory usage for large projects
- **File Operations**: Non-blocking file system operations
- **UI Responsiveness**: Smooth interactions and updates

### Optimization Strategies
- **Lazy Loading**: Services initialized on demand
- **Caching**: Configuration and file system metadata caching
- **Batch Operations**: Grouped file operations for efficiency
- **Event Debouncing**: Prevent excessive file system operations

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
- **Unit Tests**: Component testing with Jest
- **Integration Tests**: VS Code Extension Test Runner
- **Security Tests**: Hook validation and command analysis
- **Manual Testing**: Extension Development Host for user workflows

### Code Quality
- **ESLint**: Code linting with TypeScript rules
- **Prettier**: Code formatting consistency
- **Type Checking**: Strict TypeScript configuration
- **Error Handling**: Result pattern for safe operations

## Integration Points

### Q CLI Integration
- **Agent Directory**: `.amazonq/cli-agents/` and `~/.aws/amazonq/cli-agents/`
- **Configuration Format**: JSON files following Q CLI agent specification
- **Tool Integration**: Support for built-in and experimental Q CLI tools
- **Terminal Integration**: Direct execution via `q chat --agent` command

### VS Code Integration
- **Tree View**: Custom tree data provider for agent management
- **Commands**: Registered VS Code commands for all operations
- **Webview**: Custom UI for agent creation and configuration
- **Context Menus**: Right-click actions for agent management
