# Product Overview: Context Manager for Q CLI

## Purpose
VS Code Extension that simplifies Amazon Q Developer CLI context management through an intuitive drag-and-drop interface, eliminating the need for manual JSON configuration editing.

## Target Users
- **Primary**: Developers using Amazon Q Developer CLI who want easier context management
- **Secondary**: Development teams establishing consistent Q CLI workflows
- **Tertiary**: DevOps engineers setting up Q CLI configurations for teams

## Key Features

### Phase 1 (MVP) - ✅ Completed
- **Drag & Drop Context Addition**: Drop files/directories from VS Code File Explorer directly into extension window to add them to Q CLI context
- **Visual Context Management**: Display current context files with easy removal options
- **Agent Configuration Integration**: Automatically update agent configuration files with new context entries
- **Agent Tree View with Actions**: 
  - Right-click context menu for agent management
  - Inline play button for quick agent execution
  - Streamlined UI without redundant create buttons
- **Terminal Integration**: One-click agent execution with `q chat --agent "<name>"`

### Phase 1.1 (Latest - v1.0.1) - ✅ Completed
- **Enhanced Agent Interaction**: Context menus and inline buttons for better UX
- **Quick Agent Execution**: Direct terminal launch from tree view
- **Improved Navigation**: Cleaner tree view with better empty state guidance
- **VS Code Integration**: Consistent UI patterns following VS Code conventions

### Phase 2 (Future)
- **Project Rules Management**: GUI for managing `.amazonq/rules/` directory contents
- **Context Validation**: Real-time validation of context files and token usage estimation
- **Template Management**: Pre-configured context templates for common project types

## Business Objectives
- **Developer Productivity**: Reduce time spent on Q CLI context configuration from minutes to seconds
- **Adoption Acceleration**: Lower barrier to entry for Q CLI usage through improved UX
- **Error Reduction**: Minimize configuration errors through visual interface instead of manual JSON editing
- **Team Consistency**: Standardize context management practices across development teams

## Success Metrics
- Time to add context files reduced by 80%
- Reduction in Q CLI configuration errors
- Increased Q CLI adoption within development teams
- Positive user feedback on ease of use

## Value Proposition
Transform Q CLI context management from a technical configuration task into an intuitive visual workflow, making Amazon Q Developer more accessible to developers of all experience levels.