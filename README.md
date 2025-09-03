# Agent Manager for Q CLI

A VS Code Extension that simplifies Amazon Q Developer CLI agent management with an intuitive interface for creating, configuring, and executing agents without manual JSON editing.

## Features

- **Visual Agent Creation**: Complete form-based agent creation with real-time validation
- **Global & Local Agents**: Create agents for specific workspaces or use across all projects
- **One-Click Execution**: Run agents directly from VS Code with the ▶️ button
- **Experimental Tools Support**: Access to Q CLI's experimental features (`knowledge`, `thinking`, `todo_list`)
- **Smart Conflict Detection**: Visual warnings when agents with same names exist in different locations
- **Professional UI**: VS Code-native interface with comprehensive form validation
- **Context Menu Integration**: Right-click actions for opening configurations and running agents

## Usage

### Creating a New Agent
1. Click the **+** button in the Q CLI Agents tree view
2. Choose agent location:
   - **Local Agent**: Available only in this workspace (`.amazonq/cli-agents/`)
   - **Global Agent**: Available across all workspaces (`~/.aws/amazonq/cli-agents/`)
3. Fill out the agent creation form:
   - **Name**: Unique identifier for your agent
   - **Description**: Brief description of the agent's purpose
   - **Prompt**: System instructions defining the agent's behavior
   - **Tools**: Select from standard and experimental tools
   - **Resources**: Add file paths the agent can access
4. Click **Create Agent**

### Managing Agents
- **View Agents**: All agents appear organized by location in the Activity Bar tree view
- **Run Agent**: Click the ▶️ button next to any agent
- **Edit Configuration**: Right-click an agent → "Open Agent Configuration"
- **Quick Terminal**: Right-click an agent → "Run Agent in Terminal"

### Tool Categories

**Standard Tools** (Stable, production-ready):
- `fs_read`, `fs_write` - File system operations
- `execute_bash` - Shell command execution  
- `use_aws` - AWS CLI integration
- `introspect` - Q CLI capabilities information

**Experimental Tools** (Advanced features, may change):
- `knowledge` - Persistent context storage across sessions
- `thinking` - Complex reasoning with step-by-step processes
- `todo_list` - Task management and tracking

> ⚠️ **Experimental features** may be changed or removed at any time. Use with caution in production workflows.

## Agent Locations

### Local Agents (Workspace-Specific)
- **Location**: `.amazonq/cli-agents/` in your current workspace
- **Use Case**: Project-specific agents with workspace-relevant configurations

### Global Agents (User-Wide)
- **Location**: `~/.aws/amazonq/cli-agents/` in your home directory  
- **Use Case**: General-purpose agents used across multiple projects

> **Note**: When both local and global agents have the same name, the local agent takes precedence.

## What's New in v0.0.2

- ✅ **Global Agent Support**: Manage agents across all workspaces
- ✅ **Experimental Tools**: Dedicated section for Q CLI experimental features
- ✅ **Enhanced Tree View**: Organized display with conflict detection
- ✅ **Selection State Fix**: Fixed bug where agent selection color would disappear

## Migration from v0.0.1

**Good News**: All your existing agents will continue to work without any changes! 🎉

- **Existing local agents** are automatically recognized
- **No configuration changes** needed - all existing agent files remain compatible
- **Tree view automatically updates** to show your agents in the new organized structure

## Requirements

- VS Code 1.94.0 or higher
- Amazon Q Developer CLI installed and configured

## Installation

1. Install from VS Code Marketplace (coming soon)
2. Or install from VSIX file:
   ```bash
   code --install-extension agent-manager-for-q-cli-0.0.2.vsix
   ```

---

**Get started by clicking the + button in the Q CLI Agents view to create your first agent!**
