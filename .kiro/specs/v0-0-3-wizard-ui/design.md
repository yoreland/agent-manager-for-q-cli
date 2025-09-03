# Design Document

## Overview

This design document outlines the transformation of the current single-page "Create New Agent" webview into a modern, step-by-step wizard interface. The design focuses on improving user experience through clear visual hierarchy, progressive disclosure, and modern UX patterns while maintaining VS Code design consistency.

## Architecture

### Wizard Framework Architecture

```
WizardContainer
├── WizardHeader (Progress Indicator)
├── WizardContent (Step-specific content)
│   ├── Step1: BasicPropertiesStep
│   ├── Step2: AgentLocationStep  
│   ├── Step3: ToolsSelectionStep
│   └── Step4: ResourcesStep
├── WizardNavigation (Previous/Next/Cancel buttons)
└── WizardSummary (Final review step)
```

### State Management

The wizard will use a centralized state management approach:

```typescript
interface WizardState {
  currentStep: number;
  totalSteps: number;
  stepData: {
    basicProperties: BasicPropertiesData;
    agentLocation: AgentLocationData;
    toolsSelection: ToolsSelectionData;
    resources: ResourcesData;
  };
  validation: {
    [stepNumber: number]: ValidationResult;
  };
  isComplete: boolean;
}
```

## Components and Interfaces

### 1. WizardContainer Component

**Purpose:** Main container that orchestrates the entire wizard flow

**Key Features:**
- Step navigation management
- State persistence across steps
- Validation coordination
- Progress tracking

**Interface:**
```typescript
interface WizardContainerProps {
  onComplete: (agentConfig: AgentConfig) => void;
  onCancel: () => void;
  initialData?: Partial<AgentConfig>;
}
```

### 2. Step Components

#### Step 1: BasicPropertiesStep

**Layout:**
- Agent Name: Single-line input with real-time validation
- Description: Multi-line textarea (optional)
- Prompt: Code editor-style textarea with syntax highlighting

**Validation Rules:**
- Agent name: Required, no special characters, uniqueness check
- Prompt: Required, minimum 10 characters
- Description: Optional, maximum 500 characters

#### Step 2: AgentLocationStep

**Layout:**
- Two card-style options side by side
- Local Agent Card: Computer icon + description
- Global Agent Card: Globe icon + description
- Visual selection state with border highlighting

**Card Design:**
```css
.location-card {
  border: 2px solid var(--vscode-input-border);
  border-radius: 8px;
  padding: 24px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.location-card.selected {
  border-color: var(--vscode-focusBorder);
  background-color: var(--vscode-list-hoverBackground);
}
```

#### Step 3: ToolsSelectionStep

**Layout:**
- Tab interface with "Standard Tools" and "Experimental Tools"
- Each tool as expandable card with checkbox
- Tooltip on hover, expanded description on selection
- Warning badges for experimental tools

**Tool Card Structure:**
```typescript
interface ToolCard {
  id: string;
  name: string;
  description: string;
  category: 'standard' | 'experimental';
  isSelected: boolean;
  isExpanded: boolean;
}
```

#### Step 4: ResourcesStep

**Layout:**
- Drag & drop zone at the top
- List of added resources below
- Each resource item with delete button
- Manual file path input as alternative

**Drag & Drop Implementation:**
- Visual feedback during drag operations
- File validation on drop
- Error messages for invalid files
- Support for multiple file selection

### 3. WizardNavigation Component

**Button Layout:**
- Left side: Cancel button (secondary style)
- Right side: Previous + Next/Create buttons (primary style)
- Conditional rendering based on current step

**Button States:**
- Disabled when validation fails
- Loading state during agent creation
- Success state after completion

## Data Models

### Agent Configuration Model

```typescript
interface AgentConfigWizardData {
  basicProperties: {
    name: string;
    description?: string;
    prompt: string;
  };
  location: 'local' | 'global';
  tools: {
    standard: string[];
    experimental: string[];
  };
  resources: string[];
}
```

### Validation Model

```typescript
interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

interface ValidationError {
  field: string;
  message: string;
  type: 'required' | 'format' | 'duplicate' | 'invalid';
}
```

## Error Handling

### Real-time Validation Strategy

1. **Field-level validation:** Immediate feedback on input change
2. **Step-level validation:** Comprehensive check before step transition
3. **Cross-step validation:** Dependencies between steps (e.g., tool conflicts)

### Error Display Patterns

- **Inline errors:** Red text below invalid fields
- **Field highlighting:** Red border on invalid inputs
- **Step indicators:** Warning icons on steps with errors
- **Summary errors:** Consolidated error list on final step

### Error Recovery

- Clear error messages with actionable guidance
- Auto-focus on first invalid field when validation fails
- Persistent error state until resolved
- Option to skip non-critical validations with warnings

## Testing Strategy

### Unit Testing

- Individual step component testing
- Validation logic testing
- State management testing
- Error handling scenarios

### Integration Testing

- Complete wizard flow testing
- Step navigation testing
- Data persistence across steps
- Agent creation end-to-end testing

### Accessibility Testing

- Keyboard navigation testing
- Screen reader compatibility
- Focus management testing
- Color contrast validation

### User Experience Testing

- Wizard flow usability testing
- Error message clarity testing
- Performance testing with large tool lists
- Mobile/responsive layout testing

## Visual Design System

### Color Palette

```css
:root {
  --wizard-primary: #6B46C1;
  --wizard-secondary: #F7FAFC;
  --wizard-warning: #F6AD55;
  --wizard-error: #E53E3E;
  --wizard-success: #38A169;
}
```

### Typography Scale

- **H1 (Step Titles):** 20px, Bold, --vscode-foreground
- **H2 (Section Headers):** 16px, Medium, --vscode-foreground
- **Body Text:** 14px, Regular, --vscode-foreground
- **Helper Text:** 12px, Regular, --vscode-descriptionForeground

### Spacing System

- **Step padding:** 32px
- **Section spacing:** 24px
- **Field spacing:** 16px
- **Button spacing:** 12px

### Animation Guidelines

- **Step transitions:** 300ms ease-in-out
- **Button hover:** 150ms ease
- **Error states:** 200ms ease
- **Loading states:** Smooth spinner animation

## Implementation Phases

### Phase 1: Core Wizard Framework
- WizardContainer component
- Step navigation logic
- Basic state management
- Progress indicator

### Phase 2: Step Components
- BasicPropertiesStep with validation
- AgentLocationStep with card selection
- Navigation between steps
- Data persistence

### Phase 3: Advanced Features
- ToolsSelectionStep with tabs
- ResourcesStep with drag & drop
- Real-time validation
- Error handling

### Phase 4: Polish & Accessibility
- Visual design refinements
- Accessibility improvements
- Performance optimizations
- Comprehensive testing

## Performance Considerations

### Optimization Strategies

- **Lazy loading:** Load step components on demand
- **Debounced validation:** Reduce validation frequency during typing
- **Memoization:** Cache validation results and component renders
- **Virtual scrolling:** Handle large tool lists efficiently

### Bundle Size Impact

- Estimated additional bundle size: ~15-20KB
- Code splitting by step components
- Shared validation utilities
- Minimal external dependencies

## Migration Strategy

### Backward Compatibility

- Maintain existing webview message protocol
- Gradual feature flag rollout
- Fallback to current UI if wizard fails
- Preserve all existing functionality

### Rollout Plan

1. **Development:** Feature flag for wizard UI
2. **Internal testing:** Team validation and feedback
3. **Beta release:** Opt-in wizard experience
4. **Full rollout:** Default wizard with legacy fallback
5. **Legacy removal:** Remove old UI after validation period