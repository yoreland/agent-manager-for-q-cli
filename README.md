# Context Manager for Q CLI

A VS Code Extension that simplifies Amazon Q Developer CLI context management through an intuitive drag-and-drop interface, eliminating the need for manual JSON configuration editing.

## Features

- **Activity Bar Integration**: Access Context Manager directly from VS Code's Activity Bar
- **Command Palette Support**: Open Context Manager using "Q CLI: Context Manager 열기" command
- **Tree View Interface**: Visual representation of context files and management options
- **Webview Panel**: Dedicated panel for context management operations
- **Comprehensive Logging**: Built-in logging system with configurable log levels
- **Error Handling**: Robust error handling with user-friendly notifications

## Requirements

- VS Code 1.103.0 or higher
- Node.js 18+ (for development)

## Extension Settings

This extension contributes the following settings:

* `qcli-context.logLevel`: Set the logging level (debug, info, warn, error)
* `qcli-context.enableDebugMode`: Enable debug mode for additional logging
* `qcli-context.showOutputOnError`: Automatically show output channel when errors occur
* `qcli-context.logToConsole`: Also log messages to the developer console

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

### Building the Extension

```bash
# Development build
npm run compile:dev

# Production build
npm run compile:prod

# Watch mode for development
npm run watch
```

### Packaging

```bash
# Create VSIX package
npm run package:vsix

# Package without rebuilding
npm run package:vsix:skip-build
```

### Testing

```bash
# Run tests
npm run test

# Type checking
npm run check-types

# Linting
npm run lint
```

## Known Issues

- This is an initial implementation focusing on basic extension structure
- Context management features are planned for future releases

## Release Notes

### 0.0.1

Initial release of Context Manager for Q CLI:
- Basic VS Code extension structure
- Activity Bar integration
- Command palette support
- Tree view provider
- Webview panel implementation
- Logging system
- Build and packaging configuration

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For issues and feature requests, please use the GitHub issue tracker.
