# Design Document

## Overview

The Agent Creation UI feature will replace the current text-based agent creation workflow with a comprehensive webview-based form interface. This design leverages VS Code's webview API to provide a native-feeling form experience while maintaining consistency with the existing extension architecture. The form will handle all aspects of agent configuration including basic properties, tool selection, and resource management.

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    VS Code Extension Host                       │
├─────────────────────────────────────────────────────────────────┤
│  AgentCreationWebviewProvider                                   │
│  ├── WebView Management                                         │
│  ├── Form State Management                                      │
│  └── Message Handling                                           │
├─────────────────────────────────────────────────────────────────┤
│  AgentCreationFormService                                       │
│  ├── Form Validation Logic                                      │
│  ├── Default Value Management                                   │
│  └── Agent Configuration Generation                             │
├─────────────────────────────────────────────────────────────────┤
│  Existing Services (Integration Layer)                          │
│  ├── AgentManagementService                                     │
│  ├── AgentConfigService                                         │
│  └── ErrorHandler                                               │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                      WebView Content                            │
├─────────────────────────────────────────────────────────────────┤
│  HTML Form Interface                                            │
│  ├── Basic Properties Section                                   │
│  ├── Tools Selection Section                                    │
│  ├── Resources Management Section                               │
│  └── Form Controls (Submit/Cancel)                              │
├─────────────────────────────────────────────────────────────────┤
│  JavaScript Form Logic                                          │
│  ├── Real-time Validation                                       │
│  ├── Dynamic UI Updates                                         │
│  ├── VS Code API Communication                                  │
│  └── Form State Management                                      │
├─────────────────────────────────────────────────────────────────┤
│  CSS Styling                                                    │
│  ├── VS Code Theme Integration                                  │
│  ├── Responsive Layout                                          │
│  └── Accessibility Support                                      │
└─────────────────────────────────────────────────────────────────┘
```

### Component Integration

The new UI components will integrate with the existing architecture as follows:

1. **Command Integration**: The existing `qcli-agents.createAgent` command will be modified to open the webview form instead of the current text input prompt
2. **Service Layer**: New `AgentCreationFormService` will handle form-specific logic while delegating actual agent creation to existing `AgentManagementService`
3. **Validation**: Form validation will leverage existing validation logic in `AgentConfigService`
4. **Error Handling**: All errors will be handled through the existing `ErrorHandler` service

## Components and Interfaces

### 1. AgentCreationWebviewProvider

**Purpose**: Manages the webview lifecycle and handles communication between the form and extension

**Key Responsibilities**:
- Create and manage webview panel
- Handle webview disposal and cleanup
- Manage message passing between webview and extension
- Handle webview state persistence

**Interface**:
```typescript
interface IAgentCreationWebviewProvider {
    showCreationForm(): Promise<void>;
    dispose(): void;
}

class AgentCreationWebviewProvider implements IAgentCreationWebviewProvider {
    constructor(
        private readonly context: vscode.ExtensionContext,
        private readonly formService: IAgentCreationFormService,
        private readonly logger: ExtensionLogger
    );
    
    async showCreationForm(): Promise<void>;
    private handleWebviewMessage(message: WebviewMessage): Promise<void>;
    private getWebviewContent(): string;
    dispose(): void;
}
```

### 2. AgentCreationFormService

**Purpose**: Handles form-specific business logic and validation

**Key Responsibilities**:
- Provide default form values
- Validate form data
- Generate agent configuration from form data
- Coordinate with existing services for agent creation

**Interface**:
```typescript
interface IAgentCreationFormService {
    getDefaultFormData(): AgentFormData;
    validateFormData(data: AgentFormData): FormValidationResult;
    createAgentFromFormData(data: AgentFormData): Promise<AgentCreationResult>;
    getAvailableTools(): BuiltInTool[];
}

class AgentCreationFormService implements IAgentCreationFormService {
    constructor(
        private readonly agentManagementService: IAgentManagementService,
        private readonly logger: ExtensionLogger
    );
    
    getDefaultFormData(): AgentFormData;
    validateFormData(data: AgentFormData): FormValidationResult;
    async createAgentFromFormData(data: AgentFormData): Promise<AgentCreationResult>;
    getAvailableTools(): BuiltInTool[];
}
```

### 3. Form Data Models

**AgentFormData**: Represents the complete form state
```typescript
interface AgentFormData {
    name: string;
    description: string;
    prompt: string;
    tools: {
        available: string[];  // Tools in the "tools" array
        allowed: string[];    // Tools in the "allowedTools" array
    };
    resources: string[];
}
```

**BuiltInTool**: Represents a built-in tool for selection
```typescript
interface BuiltInTool {
    name: string;
    displayName: string;
    description: string;
    category: 'filesystem' | 'execution' | 'aws' | 'utility' | 'development';
    defaultAllowed: boolean;
}
```

**FormValidationResult**: Validation result structure
```typescript
interface FormValidationResult {
    isValid: boolean;
    errors: {
        field: keyof AgentFormData;
        message: string;
    }[];
    warnings: {
        field: keyof AgentFormData;
        message: string;
    }[];
}
```

### 4. WebView Message Protocol

**Message Types**:
```typescript
type WebviewMessage = 
    | { type: 'ready' }
    | { type: 'formDataChanged'; data: Partial<AgentFormData> }
    | { type: 'validateForm'; data: AgentFormData }
    | { type: 'submitForm'; data: AgentFormData }
    | { type: 'cancel' }
    | { type: 'addResource'; path: string }
    | { type: 'removeResource'; index: number };

type ExtensionMessage = 
    | { type: 'initialData'; data: AgentFormData; tools: BuiltInTool[] }
    | { type: 'validationResult'; result: FormValidationResult }
    | { type: 'creationResult'; result: AgentCreationResult }
    | { type: 'error'; message: string };
```

## Data Models

### Built-in Tools Configuration

Based on the Q CLI documentation, the following built-in tools will be available:

```typescript
const BUILT_IN_TOOLS: BuiltInTool[] = [
    {
        name: 'fs_read',
        displayName: 'File System Read',
        description: 'Read files, directories, and images',
        category: 'filesystem',
        defaultAllowed: true
    },
    {
        name: 'fs_write',
        displayName: 'File System Write',
        description: 'Create and edit files',
        category: 'filesystem',
        defaultAllowed: false
    },
    {
        name: 'execute_bash',
        displayName: 'Execute Bash',
        description: 'Execute shell commands',
        category: 'execution',
        defaultAllowed: false
    },
    {
        name: 'use_aws',
        displayName: 'AWS CLI',
        description: 'Make AWS CLI API calls',
        category: 'aws',
        defaultAllowed: false
    },
    {
        name: 'knowledge',
        displayName: 'Knowledge Base',
        description: 'Store and retrieve information across sessions',
        category: 'utility',
        defaultAllowed: false
    },
    {
        name: 'thinking',
        displayName: 'Thinking',
        description: 'Internal reasoning mechanism',
        category: 'development',
        defaultAllowed: false
    },
    {
        name: 'todo_list',
        displayName: 'TODO List',
        description: 'Create and manage TODO lists',
        category: 'utility',
        defaultAllowed: false
    },
    {
        name: 'introspect',
        displayName: 'Introspect',
        description: 'Q CLI capabilities and documentation',
        category: 'utility',
        defaultAllowed: false
    },
    {
        name: 'report_issue',
        displayName: 'Report Issue',
        description: 'Open GitHub issue template',
        category: 'utility',
        defaultAllowed: false
    }
];
```

### Default Form Values

```typescript
const DEFAULT_FORM_DATA: AgentFormData = {
    name: '',
    description: '',
    prompt: '',
    tools: {
        available: [
            'fs_read', 'fs_write', 'execute_bash', 'use_aws', 
            'knowledge', 'thinking', 'todo_list', 'introspect', 'report_issue'
        ],
        allowed: ['fs_read']
    },
    resources: [
        'file://AmazonQ.md',
        'file://README.md',
        'file://.amazonq/rules/**/*.md'
    ]
};
```

### Agent Configuration Mapping

The form data will be mapped to the standard agent configuration format:

```typescript
function mapFormDataToAgentConfig(formData: AgentFormData): AgentConfig {
    return {
        $schema: "https://raw.githubusercontent.com/aws/amazon-q-developer-cli/refs/heads/main/schemas/agent-v1.json",
        name: formData.name,
        description: formData.description,
        prompt: formData.prompt,
        mcpServers: {},
        tools: formData.tools.available,
        toolAliases: {},
        allowedTools: formData.tools.allowed,
        toolsSettings: {},
        resources: formData.resources,
        hooks: {},
        useLegacyMcpJson: true
    };
}
```

## Error Handling

### Validation Strategy

1. **Real-time Validation**: Form fields will be validated as the user types
2. **Submit Validation**: Complete form validation before submission
3. **Server-side Validation**: Final validation using existing service layer

### Error Categories

1. **Field Validation Errors**:
   - Empty required fields
   - Invalid characters in agent name
   - Duplicate agent names
   - Invalid resource paths

2. **Business Logic Errors**:
   - File system permission issues
   - Agent directory access problems
   - Configuration generation failures

3. **System Errors**:
   - Webview communication failures
   - Service unavailability
   - Unexpected exceptions

### Error Display Strategy

- **Inline Errors**: Field-level validation errors displayed next to inputs
- **Summary Errors**: Form-level errors displayed at the top of the form
- **Toast Notifications**: System-level errors shown as VS Code notifications
- **Error Recovery**: Provide actionable suggestions for error resolution

## Testing Strategy

### Unit Testing

1. **AgentCreationFormService Tests**:
   - Default value generation
   - Form validation logic
   - Agent configuration mapping
   - Error handling scenarios

2. **AgentCreationWebviewProvider Tests**:
   - Webview lifecycle management
   - Message handling
   - State persistence
   - Cleanup and disposal

### Integration Testing

1. **Form Submission Flow**:
   - End-to-end agent creation
   - Error handling integration
   - Service layer integration
   - File system operations

2. **UI Interaction Tests**:
   - Form field interactions
   - Tool selection behavior
   - Resource management
   - Validation feedback

### Manual Testing Scenarios

1. **Happy Path**:
   - Create agent with valid data
   - Verify agent file creation
   - Confirm tree view update

2. **Error Scenarios**:
   - Invalid agent names
   - Duplicate agent creation
   - File system permission errors
   - Form cancellation

3. **Edge Cases**:
   - Very long input values
   - Special characters in names
   - Large number of resources
   - Network connectivity issues

## Implementation Phases

### Phase 1: Core Infrastructure
- Create webview provider and form service
- Implement basic form structure
- Set up message communication
- Add basic validation

### Phase 2: Form Features
- Implement all form sections
- Add tool selection UI
- Implement resource management
- Add real-time validation

### Phase 3: Integration & Polish
- Integrate with existing services
- Add comprehensive error handling
- Implement accessibility features
- Add comprehensive testing

### Phase 4: Enhancement
- Add form state persistence
- Implement advanced validation
- Add keyboard shortcuts
- Performance optimization

## Security Considerations

1. **Input Sanitization**: All form inputs will be sanitized before processing
2. **Path Validation**: Resource paths will be validated for security
3. **File System Access**: Leverage existing security measures in AgentConfigService
4. **XSS Prevention**: Webview content will use VS Code's built-in XSS protection

## Performance Considerations

1. **Lazy Loading**: Webview content loaded only when needed
2. **Debounced Validation**: Real-time validation will be debounced to avoid excessive processing
3. **Memory Management**: Proper cleanup of webview resources
4. **Caching**: Cache tool definitions and default values

## Accessibility

1. **Keyboard Navigation**: Full keyboard support for all form elements
2. **Screen Reader Support**: Proper ARIA labels and descriptions
3. **High Contrast**: Support for VS Code's high contrast themes
4. **Focus Management**: Logical tab order and focus indicators

## Internationalization

1. **Text Externalization**: All user-facing text will be externalized
2. **RTL Support**: Layout will support right-to-left languages
3. **Locale-aware Validation**: Validation messages will be localized
4. **Cultural Considerations**: Form layout will adapt to cultural preferences