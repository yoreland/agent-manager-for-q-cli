# Change Log

All notable changes to the "agent-manager-for-q-cli" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

## [1.0.1] - 2025-09-01

### Added
- Context menu for agent items with "Open Agent Configuration" and "Run Agent in Terminal" options
- Inline play button (▶️) next to each agent for quick terminal execution
- Terminal integration for direct agent execution with `q chat --agent "<agent name>"`

### Changed
- Removed "Create New Agent" item from tree view (use + button in title bar instead)
- Updated empty state message to guide users to the + button
- Fixed contextValue mapping from `agent` to `agentItem` for proper menu integration

### Improved
- Cleaner tree view without redundant create button
- Consistent UI patterns following VS Code conventions
- Better user experience with right-click and inline actions

## [1.0.0] - 2025-08-29

### Added
- Complete architecture refactoring with clean, layered design
- Result pattern for explicit error handling
- Dependency injection for better testability
- Performance optimizations with caching and batching
- Comprehensive type safety and validation
- Enhanced error recovery mechanisms

## [0.0.1] - 2025-08-18

### Added
- Initial release
- Basic VS Code extension structure
- Activity Bar integration
- Command palette support
- Tree view provider
- Webview panel implementation