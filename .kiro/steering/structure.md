# Project Structure: Context Manager for Q CLI

## File Organization

### Root Directory Structure
```
context-manager-for-q-cli/
├── src/                     # Source code
├── out/                     # Compiled JavaScript (generated)
├── node_modules/            # Dependencies (generated)
├── .vscode/                 # VS Code workspace settings
├── package.json             # Extension manifest and dependencies
├── tsconfig.json           # TypeScript configuration
├── esbuild.js              # Build configuration
└── README.md               # Project documentation
```

### Source Code Structure
```
src/
├── extension.ts            # Extension entry point and activation
├── commands/               # VS Code command implementations
│   ├── addContext.ts      # Add files to context command
│   ├── removeContext.ts   # Remove files from context command
│   └── showContext.ts     # Display current context command
├── providers/              # VS Code data providers
│   ├── contextTreeProvider.ts  # Tree view for context files
│   └── dropTargetProvider.ts   # Drag & drop target handling
├── services/               # Business logic services
│   ├── contextManager.ts  # Core context management logic
│   ├── agentConfigService.ts   # Agent configuration file handling
│   └── fileSystemService.ts    # File system operations
├── types/                  # TypeScript type definitions
│   ├── context.ts         # Context-related types
│   ├── qcli.ts           # Q CLI configuration types
│   └── extension.ts       # Extension-specific types
├── utils/                  # Utility functions
│   ├── pathUtils.ts       # Path manipulation utilities
│   ├── jsonUtils.ts       # JSON parsing and writing utilities
│   └── validationUtils.ts # Input validation utilities
└── webview/               # Webview components (if needed)
    ├── contextPanel.ts    # Main context management panel
    └── assets/            # Static assets for webview
```

## Naming Conventions

### Files and Directories
- **Files**: camelCase with descriptive names (e.g., `contextManager.ts`)
- **Directories**: camelCase for multi-word names (e.g., `services/`)
- **Test Files**: Same name as source file with `.test.ts` suffix
- **Type Files**: Descriptive names ending in `.ts` (e.g., `context.ts`)

### Code Elements
- **Classes**: PascalCase (e.g., `ContextManager`, `AgentConfigService`)
- **Interfaces**: PascalCase with 'I' prefix (e.g., `IContextItem`, `IAgentConfig`)
- **Functions**: camelCase (e.g., `addFileToContext`, `validatePath`)
- **Variables**: camelCase (e.g., `currentContext`, `filePath`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `DEFAULT_AGENT_PATH`, `FILE_PREFIX`)
- **Enums**: PascalCase (e.g., `ContextType`, `ValidationResult`)

## Import Patterns

### Module Import Order
1. Node.js built-in modules
2. VS Code API imports
3. Third-party dependencies
4. Local project imports (absolute paths)
5. Relative imports

### Import Examples
```typescript
// Node.js built-ins
import * as path from 'path';
import * as fs from 'fs/promises';

// VS Code API
import * as vscode from 'vscode';

// Third-party dependencies
import { glob } from 'glob';

// Local project imports
import { IContextItem } from '../types/context';
import { ContextManager } from '../services/contextManager';

// Relative imports
import { validatePath } from './validationUtils';
```

## Architectural Decisions

### Extension Activation
- **Lazy Loading**: Extension activates only when Q CLI-related commands are used
- **Command Registration**: All commands registered during activation
- **Service Initialization**: Core services initialized on first use

### State Management
- **Context State**: Maintained in ContextManager service
- **Configuration State**: Cached agent configuration with file system watching
- **UI State**: VS Code TreeView state managed by providers

### Error Handling
- **Service Layer**: Throw typed errors with context information
- **Command Layer**: Catch errors and show user-friendly messages
- **Utility Layer**: Return Result<T, Error> types for safe operations

### File System Operations
- **Async Operations**: All file operations use async/await pattern
- **Path Handling**: Use Node.js path module for cross-platform compatibility
- **Error Recovery**: Graceful handling of missing files and permission errors

## Configuration Files

### package.json Structure
- **Extension Metadata**: Name, version, description, publisher
- **Activation Events**: Commands and file patterns that activate extension
- **Contribution Points**: Commands, views, menus, and keybindings
- **Dependencies**: Runtime and development dependencies

### TypeScript Configuration
- **Strict Mode**: Enabled for maximum type safety
- **Target**: ES2020 for modern JavaScript features
- **Module**: CommonJS for VS Code compatibility
- **Source Maps**: Enabled for debugging support