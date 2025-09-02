# Requirements Document

## Introduction

This feature adds a user-friendly UI form for creating new Q CLI agents, replacing the current manual JSON file creation process. The form will provide an intuitive interface for configuring agent properties including name, description, prompt, tools selection, and resources management, making agent creation accessible to users without requiring JSON editing skills.

## Requirements

### Requirement 1

**User Story:** As a developer using the Q CLI Agent Manager extension, I want to create new agents through a visual form interface, so that I can quickly configure agents without manually editing JSON files.

#### Acceptance Criteria

1. WHEN I click the "Create New Agent" button THEN the system SHALL display a modal form with input fields for agent configuration
2. WHEN the form opens THEN the system SHALL pre-populate default values for all required fields
3. WHEN I complete the form and submit THEN the system SHALL create a new agent JSON file with the specified configuration
4. WHEN the agent is successfully created THEN the system SHALL refresh the agent tree view to show the new agent
5. WHEN I cancel the form THEN the system SHALL close the modal without creating any files

### Requirement 2

**User Story:** As a developer, I want to configure basic agent properties through text inputs, so that I can easily set the agent's identity and purpose.

#### Acceptance Criteria

1. WHEN the form displays THEN the system SHALL provide text input fields for name, description, and prompt
2. WHEN I enter a name THEN the system SHALL validate that the name is unique and contains only valid characters
3. WHEN I leave the name field empty THEN the system SHALL show a validation error indicating name is required
4. WHEN I enter a description THEN the system SHALL accept any text up to 500 characters
5. WHEN I enter a prompt THEN the system SHALL accept any text up to 2000 characters
6. IF the name contains invalid characters THEN the system SHALL show validation feedback with allowed character rules

### Requirement 3

**User Story:** As a developer, I want to select tools and their permissions through checkboxes, so that I can easily configure which tools my agent can use and which ones are pre-approved.

#### Acceptance Criteria

1. WHEN the form displays THEN the system SHALL show a tools section with two columns: "Available Tools" and "Allowed Tools"
2. WHEN the form loads THEN the system SHALL display all built-in tools from the Q CLI documentation as checkboxes
3. WHEN the form loads THEN the system SHALL have all tools checked in the "Available Tools" column by default
4. WHEN the form loads THEN the system SHALL have only "fs_read" checked in the "Allowed Tools" column by default
5. WHEN I check a tool in "Available Tools" THEN the system SHALL add it to the agent's tools array
6. WHEN I check a tool in "Allowed Tools" THEN the system SHALL add it to the agent's allowedTools array
7. WHEN I uncheck a tool in "Available Tools" THEN the system SHALL automatically uncheck it in "Allowed Tools" if it was checked
8. WHEN I check a tool in "Allowed Tools" THEN the system SHALL automatically check it in "Available Tools" if it wasn't already checked

### Requirement 4

**User Story:** As a developer, I want to manage agent resources through a list interface, so that I can easily add and remove file resources that my agent can access.

#### Acceptance Criteria

1. WHEN the form displays THEN the system SHALL show a resources section with a list of current resources
2. WHEN the form loads THEN the system SHALL pre-populate with default resources: "file://AmazonQ.md", "file://README.md", "file://.amazonq/rules/**/*.md"
3. WHEN I click "Add Resource" THEN the system SHALL display an input field for entering a new resource path
4. WHEN I enter a resource path THEN the system SHALL validate that it starts with "file://"
5. WHEN I enter an invalid resource path THEN the system SHALL show validation feedback
6. WHEN I click the remove button next to a resource THEN the system SHALL remove it from the list
7. WHEN I add a valid resource THEN the system SHALL add it to the resources list
8. IF I try to add a duplicate resource THEN the system SHALL show a warning and not add the duplicate

### Requirement 5

**User Story:** As a developer, I want the system to generate a complete agent configuration with sensible defaults, so that my agent is immediately functional after creation.

#### Acceptance Criteria

1. WHEN I submit the form THEN the system SHALL generate a JSON file with all required agent configuration fields
2. WHEN the agent is created THEN the system SHALL include default values for mcpServers as empty object
3. WHEN the agent is created THEN the system SHALL include default values for toolAliases as empty object
4. WHEN the agent is created THEN the system SHALL include default values for hooks as empty object
5. WHEN the agent is created THEN the system SHALL include default values for toolsSettings as empty object
6. WHEN the agent is created THEN the system SHALL set useLegacyMcpJson to true by default
7. WHEN the agent is created THEN the system SHALL include the JSON schema reference for validation
8. WHEN the agent file is created THEN the system SHALL save it to the .amazonq/cli-agents/ directory with the agent name as filename

### Requirement 6

**User Story:** As a developer, I want immediate feedback on form validation, so that I can correct errors before attempting to create the agent.

#### Acceptance Criteria

1. WHEN I interact with form fields THEN the system SHALL provide real-time validation feedback
2. WHEN there are validation errors THEN the system SHALL disable the submit button
3. WHEN all required fields are valid THEN the system SHALL enable the submit button
4. WHEN I submit an invalid form THEN the system SHALL highlight the first invalid field and show error messages
5. WHEN validation passes THEN the system SHALL clear any previous error messages
6. IF the agent creation fails THEN the system SHALL display an error message with details about the failure

### Requirement 7

**User Story:** As a developer, I want the form to integrate seamlessly with the existing extension UI, so that the agent creation experience feels consistent with the rest of the extension.

#### Acceptance Criteria

1. WHEN I open the form THEN the system SHALL use VS Code's native UI components and styling
2. WHEN the form displays THEN the system SHALL follow VS Code's design patterns and color schemes
3. WHEN I interact with the form THEN the system SHALL provide appropriate focus management and keyboard navigation
4. WHEN the form opens THEN the system SHALL be modal and prevent interaction with other extension elements
5. WHEN the agent is created successfully THEN the system SHALL show a success notification
6. WHEN errors occur THEN the system SHALL use VS Code's notification system for error messages