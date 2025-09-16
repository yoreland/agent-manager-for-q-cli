# Logging System Documentation

## Overview

The Q CLI Context Manager extension includes a comprehensive logging system that provides detailed information about extension operations, errors, and user interactions.

## Features

### Log Levels
- **DEBUG**: Detailed debugging information (only shown in debug mode)
- **INFO**: General informational messages
- **WARN**: Warning messages for potential issues
- **ERROR**: Error messages with detailed stack traces

### Output Channels
- All logs are written to the "Q CLI Context Manager" output channel in VS Code
- Logs can optionally be written to the developer console
- Output channel is automatically shown when errors occur (configurable)

### Configuration Options

#### `qcli-context.logLevel`
- **Type**: String enum
- **Values**: "debug", "info", "warn", "error"
- **Default**: "info"
- **Description**: Sets the minimum log level to display

#### `qcli-context.enableDebugMode`
- **Type**: Boolean
- **Default**: false
- **Description**: Enables debug mode for additional logging and notifications

#### `qcli-context.showOutputOnError`
- **Type**: Boolean
- **Default**: true
- **Description**: Automatically shows output channel when errors occur

#### `qcli-context.logToConsole`
- **Type**: Boolean
- **Default**: false
- **Description**: Also logs messages to the developer console

## Usage

### Basic Logging
```typescript
import { getExtensionState } from '../extension';

const extensionState = getExtensionState();
if (extensionState?.logger) {
    extensionState.logger.info('Operation completed successfully');
    extensionState.logger.warn('Potential issue detected');
    extensionState.logger.error('Operation failed', error);
}
```

### Performance Logging
```typescript
const startTime = Date.now();
// ... perform operation ...
logger.logTiming('Operation name', startTime);
```

### Lifecycle Logging
```typescript
logger.logLifecycle('Extension activated', { version: '1.0.0' });
```

### User Action Logging
```typescript
logger.logUserAction('File added to context', { fileName: 'example.ts' });
```

## Log Format

All log messages follow this format:
```
[2024-01-01T12:00:00.000Z] [LEVEL] Message content
```

For messages with additional data:
```
[2024-01-01T12:00:00.000Z] [LEVEL] Message content {
  "key": "value",
  "nested": {
    "data": "example"
  }
}
```

## Error Handling

- All errors include stack traces when available
- Critical errors automatically show the output channel
- Non-critical errors are logged but don't interrupt user workflow
- Configuration errors are handled gracefully with fallback values

## Development Tips

1. Enable debug mode during development for detailed logging
2. Use `logTiming()` to identify performance bottlenecks
3. Use `logUserAction()` to track user behavior patterns
4. Check the output channel when troubleshooting issues
5. Use appropriate log levels to avoid noise in production

## Integration

The logging system is automatically initialized during extension activation and is available throughout the extension lifecycle. All major components (commands, providers, services) have access to the logger through the extension state.