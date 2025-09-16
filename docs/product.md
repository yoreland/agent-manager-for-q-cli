# Product Overview: Agent Manager for Q CLI

## Purpose
VS Code Extension that simplifies Amazon Q Developer CLI agent management through an intuitive interface, providing comprehensive agent creation, configuration, and management capabilities without manual JSON editing.

## Target Users
- **Primary**: Developers using Amazon Q Developer CLI who want easier agent management
- **Secondary**: Development teams establishing consistent Q CLI agent workflows
- **Tertiary**: DevOps engineers setting up Q CLI agent configurations for teams

## Key Features

### Core Functionality
- **Visual Agent Management**: Tree view display of all Q CLI agents with management actions
- **One-Click Execution**: Run agents directly from VS Code with the ▶️ button
- **Context Resources View**: Visual display of agent resource files organized by patterns
- **Terminal Integration**: Direct agent execution with `q chat --agent "<name>"`

### Agent Creation & Configuration
- **Comprehensive Creation Form**: Full webview-based agent creation interface
- **Real-time Form Validation**: Immediate feedback with inline error messages
- **Tool Selection Interface**: Dual-column tool management (Available vs Allowed tools)
- **Resource Management**: Add/remove file resources with validation
- **Context Hook Configuration**: Automated context injection with predefined templates

### Advanced Features
- **Context Hook Management**: Configure commands that run automatically to provide context
- **Template-based Hooks**: Pre-defined templates for common scenarios (Git status, Project info, Branch info)
- **Security Validation**: Real-time command analysis with security warnings
- **Global & Local Agents**: Create agents for specific workspaces or use across all projects
- **Experimental Tools Support**: Access to Q CLI's experimental features (`knowledge`, `thinking`, `todo_list`)

### User Experience
- **Professional UI**: VS Code-native interface with comprehensive form validation
- **Context Menu Integration**: Right-click actions for opening configurations and running agents
- **Smart Conflict Detection**: Visual warnings when agents with same names exist in different locations
- **Accessibility Support**: Full keyboard navigation and screen reader compatibility

## Business Objectives
- **Developer Productivity**: Reduce time spent on Q CLI agent setup from hours to minutes
- **Adoption Acceleration**: Lower barrier to entry for Q CLI agent usage through improved UX
- **Error Reduction**: Minimize configuration errors through visual interface and validation
- **Team Consistency**: Standardize agent management practices across development teams

## Success Metrics
- Time to create new agents reduced by 90%
- Reduction in Q CLI agent configuration errors
- Increased Q CLI agent adoption within development teams
- Positive user feedback on agent creation experience

## Value Proposition
Transform Q CLI agent management from complex JSON configuration to an intuitive visual workflow, making Amazon Q Developer agent creation and management accessible to developers of all experience levels.

## Agent Locations

### Local Agents (Workspace-Specific)
- **Location**: `.amazonq/cli-agents/` in current workspace
- **Use Case**: Project-specific agents with workspace-relevant configurations

### Global Agents (User-Wide)
- **Location**: `~/.aws/amazonq/cli-agents/` in home directory
- **Use Case**: General-purpose agents used across multiple projects

## Tool Categories

**Standard Tools** (Stable, production-ready):
- `fs_read`, `fs_write` - File system operations
- `execute_bash` - Shell command execution
- `use_aws` - AWS CLI integration
- `introspect` - Q CLI capabilities information

**Experimental Tools** (Advanced features, may change):
- `knowledge` - Persistent context storage across sessions
- `thinking` - Complex reasoning with step-by-step processes
- `todo_list` - Task management and tracking
