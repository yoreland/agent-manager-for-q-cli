# Agent Manager for Q CLI

A VS Code Extension that simplifies Amazon Q Developer CLI agent management with an intuitive interface for creating, configuring, and executing agents without manual JSON editing.

## Features

### Current Features (v0.0.1)
- **Visual Agent Creation**: Complete form-based agent creation with real-time validation
- **Agent Tree View**: Browse and manage all your Q CLI agents in one place
- **One-Click Execution**: Run agents directly from VS Code with the ▶️ button
- **Tool Management**: Easy selection of available and allowed tools for each agent
- **Resource Configuration**: Add and manage file resources your agents can access
- **Configuration Editing**: Quick access to agent JSON files for advanced customization
- **Context Menu Integration**: Right-click actions for opening configurations and running agents
- **Professional UI**: VS Code-native interface with comprehensive form validation
- **Accessibility Support**: Full keyboard navigation and screen reader compatibility

### Upcoming Features (v0.0.2)
- **Global Agent Support**: Create and manage agents available across all workspaces
- **Experimental Tools Separation**: Clear distinction between stable and experimental Q CLI tools
- **Enhanced Tree View**: Organized display of local vs global agents with conflict detection
- **Advanced Tool Categories**: Separate sections for standard and experimental tools in creation form

## Usage

### Creating a New Agent
1. Click the **+** button in the Q CLI Agents tree view
2. Fill out the agent creation form:
   - **Name**: Unique identifier for your agent
   - **Description**: Brief description of the agent's purpose
   - **Prompt**: System instructions defining the agent's behavior
   - **Tools**: Select which tools the agent can use
   - **Resources**: Add file paths the agent can access
3. Click **Create Agent**

### Managing Existing Agents
- **View Agents**: All agents appear in the Activity Bar tree view
- **Run Agent**: Click the ▶️ button next to any agent
- **Edit Configuration**: Right-click an agent → "Open Agent Configuration"
- **Quick Terminal**: Right-click an agent → "Run Agent in Terminal"

### Accessing the Extension
- **Activity Bar**: Click the 🤖 robot icon
- **Command Palette**: `Ctrl+Shift+P` → "Q CLI: Open Agent Manager"

## What's New

### Version 0.0.1 (Current)
- ✅ **Complete Agent Lifecycle**: Create, view, configure, and execute agents
- ✅ **Professional UI**: VS Code-native interface with comprehensive form validation  
- ✅ **Accessibility Compliant**: WCAG guidelines compliance with full keyboard support
- ✅ **Error Recovery**: Intelligent error handling with user-friendly recovery options
- ✅ **Performance Optimized**: Fast loading, efficient caching, and smooth interactions
- ✅ **Context Menu Integration**: Right-click actions for agent management
- ✅ **Inline Actions**: Play button (▶️) for quick agent execution

### Version 0.0.2 (In Development)
- 🚧 **Global Agent Support**: Manage agents across all workspaces (`~/.aws/amazonq/cli-agents/`)
- 🚧 **Local vs Global**: Clear separation between workspace-specific and global agents
- 🚧 **Experimental Tools**: Dedicated section for Q CLI experimental features (`knowledge`, `thinking`, `todo_list`)
- 🚧 **Conflict Detection**: Visual indicators for agent name conflicts between local and global
- 🚧 **Enhanced Tree View**: Organized categories for better agent management

## Agent Locations

### Local Agents (Workspace-Specific)
- **Location**: `.amazonq/cli-agents/` in your current workspace
- **Scope**: Available only when working in that specific workspace
- **Use Case**: Project-specific agents with workspace-relevant configurations

### Global Agents (User-Wide)
- **Location**: `~/.aws/amazonq/cli-agents/` in your home directory  
- **Scope**: Available from any workspace
- **Use Case**: General-purpose agents used across multiple projects

> **Note**: When both local and global agents have the same name, the local agent takes precedence.

## Tool Categories

### Standard Tools
Stable, production-ready tools for common development tasks:
- `fs_read`, `fs_write` - File system operations
- `execute_bash` - Shell command execution  
- `use_aws` - AWS CLI integration
- `introspect` - Q CLI capabilities information
- `report_issue` - GitHub issue reporting

### Experimental Tools
Advanced features in active development (may change):
- `knowledge` - Persistent context storage across sessions
- `thinking` - Complex reasoning with step-by-step processes
- `todo_list` - Task management and tracking

> ⚠️ **Experimental features** may be changed or removed at any time. Use with caution in production workflows.

## Requirements

- VS Code 1.94.0 or higher
- Amazon Q Developer CLI installed and configured
- Node.js 18+ (for development)

## Installation

1. Install from VS Code Marketplace (coming soon)
2. Or install from VSIX file:
   ```bash
   code --install-extension agent-manager-for-q-cli-0.0.1.vsix
   ```

## Development

### Project Structure
```
src/
├── core/                    # Domain logic and business rules
│   ├── agent/              # Agent domain (entities, services, repositories)
│   └── context/            # Context domain (entities, services, repositories)
├── infrastructure/         # External dependencies and adapters
├── shared/                 # Cross-cutting concerns (DI, errors, caching)
├── presentation/           # UI layer (commands, providers, views)
├── providers/              # Tree data providers
└── services/               # Application services
```

### Build System
- **Development**: `npm run dev` - Fast builds with source maps
- **Production**: `npm run build` - Optimized builds with tree shaking
- **Testing**: `npm run test` - Unit, integration, and performance tests
- **Package**: `npm run vsce:package` - Create VSIX extension package

### Architecture Highlights
- **Clean Architecture**: Layered design with proper separation of concerns
- **Dependency Injection**: Centralized service management with lazy loading
- **Performance Optimized**: <100ms activation time, efficient caching
- **Type Safety**: Strict TypeScript with runtime validation
- **Error Handling**: Result pattern with contextual error recovery

### Contributing
1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes and add tests
4. Run tests: `npm run test`
5. Build and verify: `npm run build`
6. Submit a pull request

---

**Get started by clicking the + button in the Q CLI Agents view to create your first agent!**
