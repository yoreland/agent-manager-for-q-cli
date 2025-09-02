# Agent Manager for Q CLI

A VS Code Extension that simplifies Amazon Q Developer CLI agent management with an intuitive interface for creating, configuring, and executing agents without manual JSON editing.

## Features

- **Visual Agent Creation**: Complete form-based agent creation with real-time validation
- **Agent Tree View**: Browse and manage all your Q CLI agents in one place
- **One-Click Execution**: Run agents directly from VS Code with the ▶️ button
- **Tool Management**: Easy selection of available and allowed tools for each agent
- **Resource Configuration**: Add and manage file resources your agents can access
- **Configuration Editing**: Quick access to agent JSON files for advanced customization

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
- **Command Palette**: `Ctrl+Shift+P` → "Q CLI: Agent Manager 열기"

## Requirements

- VS Code 1.103.0 or higher
- Amazon Q Developer CLI installed and configured

---

**Get started by clicking the + button in the Q CLI Agents view to create your first agent!**
