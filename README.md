# Agent Manager for Q CLI

A VS Code Extension that simplifies Amazon Q Developer CLI agent management with an intuitive interface for creating, configuring, and executing agents without manual JSON editing.

## ✨ Features

- **🎨 Visual Agent Creation**: Complete form-based agent creation with real-time validation
- **🌍 Global & Local Agents**: Create agents for specific workspaces or use across all projects
- **▶️ One-Click Execution**: Run agents directly from VS Code with integrated terminal
- **📁 Context Resources View**: Visual display of agent resource files organized by patterns
- **🔗 Context Hook Configuration**: Automated context injection with predefined templates
- **🧪 Experimental Tools Support**: Access to Q CLI's experimental features (`knowledge`, `thinking`, `todo_list`)
- **⚠️ Smart Conflict Detection**: Visual warnings when agents with same names exist in different locations
- **💼 Professional UI**: VS Code-native interface with comprehensive form validation
- **🖱️ Context Menu Integration**: Right-click actions for opening configurations and running agents

## 🚀 Getting Started

### Creating Your First Agent
1. Open the **Agent Manager for Q CLI** panel in the Activity Bar (🤖 icon)
2. Click the **+** button in the Q CLI Agents tree view
3. Choose agent location:
   - **Local Agent**: Available only in this workspace (`.amazonq/cli-agents/`)
   - **Global Agent**: Available across all workspaces (`~/.aws/amazonq/cli-agents/`)
4. Fill out the agent creation form:
   - **Name**: Unique identifier for your agent
   - **Description**: Brief description of the agent's purpose
   - **Prompt**: System instructions defining the agent's behavior
   - **Tools**: Select from standard and experimental tools
   - **Resources**: Add file paths the agent can access
   - **Context Hooks**: Configure commands that run automatically to provide context (optional)
5. Click **Create Agent**

### Managing Your Agents
- **📋 View Agents**: All agents appear organized by location in the Activity Bar tree view
- **▶️ Run Agent**: Click the play button next to any agent
- **📝 Edit Configuration**: Right-click an agent → "Open Agent Configuration" or click the edit button
- **💻 Quick Terminal**: Right-click an agent → "Run Agent in Terminal"

### Context Resources Management
- **🔍 Automatic Display**: Select any agent to view its resource files in the Context Resources panel
- **📂 Pattern-Based Grouping**: Files are organized by their resource patterns (e.g., `src/**/*.ts`, `README.md`)
- **📄 Quick File Access**: Click any file to open it directly in the editor
- **🛠️ File Operations**: Right-click files for additional actions (copy path, reveal in explorer)
- **🔎 Search & Filter**: Use the search button to filter files by name or path

## 🛠️ Available Tools

### Standard Tools (Production Ready)
- **`fs_read`, `fs_write`** - File system operations for reading and writing files
- **`execute_bash`** - Shell command execution for system operations
- **`use_aws`** - AWS CLI integration for cloud resource management
- **`introspect`** - Q CLI capabilities and feature information

### Experimental Tools (Advanced Features)
- **`knowledge`** - Persistent context storage across chat sessions
- **`thinking`** - Complex reasoning with step-by-step thought processes
- **`todo_list`** - Task management and progress tracking

> ⚠️ **Note**: Experimental features may change or be removed in future updates. Use with caution in production workflows.

## 📍 Agent Locations

### 📁 Local Agents (Workspace-Specific)
- **Location**: `.amazonq/cli-agents/` in your current workspace
- **Use Case**: Project-specific agents with workspace-relevant configurations
- **Scope**: Only available within the current VS Code workspace

### 🌍 Global Agents (User-Wide)
- **Location**: `~/.aws/amazonq/cli-agents/` in your home directory  
- **Use Case**: General-purpose agents used across multiple projects
- **Scope**: Available in all VS Code workspaces

> **💡 Tip**: When both local and global agents have the same name, the local agent takes precedence.

## 📋 Requirements

- **VS Code**: Version 1.94.0 or higher
- **Amazon Q Developer CLI**: Installed and properly configured
- **Operating System**: Windows, macOS, or Linux

## 📦 Installation

### From VS Code Marketplace
1. Open VS Code
2. Go to Extensions (Ctrl+Shift+X / Cmd+Shift+X)
3. Search for "Agent Manager for Q CLI"
4. Click **Install**

### From VSIX File
Download the latest release and install manually:

```bash
# Using VS Code CLI
code --install-extension agent-manager-for-q-cli-0.2.0.vsix

# Using Kiro (if available)
kiro --install-extension agent-manager-for-q-cli-0.2.0.vsix
```

### Verify Installation
1. Look for the 🤖 icon in the Activity Bar
2. Open the **Agent Manager for Q CLI** panel
3. Start creating your first agent!

## 🤝 Contributing

We welcome contributions! Here's how you can help:

### 🐛 Bug Reports
- Use the [GitHub Issues](https://github.com/qcli-agent-manager/agent-manager-for-q-cli/issues) page
- Include VS Code version, extension version, and steps to reproduce
- Attach screenshots or logs when helpful

### 💡 Feature Requests
- Open a [feature request](https://github.com/qcli-agent-manager/agent-manager-for-q-cli/issues/new?template=feature_request.md)
- Describe the use case and expected behavior
- Consider contributing the implementation!

### 📝 Pull Request Guidelines
1. Fork the repository and create a feature branch
2. Follow the existing code style and conventions
3. Add tests for new functionality
4. Update documentation as needed
5. Ensure all tests pass before submitting

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🔗 Links

- **Repository**: [GitHub](https://github.com/qcli-agent-manager/agent-manager-for-q-cli)
- **Issues**: [Bug Reports & Feature Requests](https://github.com/qcli-agent-manager/agent-manager-for-q-cli/issues)
- **Marketplace**: [VS Code Extensions](https://marketplace.visualstudio.com/manage/publishers/raphael-shin/extensions/agent-manager-for-q-cli)

---

**🚀 Ready to get started? Click the + button in the Q CLI Agents view to create your first agent!**
