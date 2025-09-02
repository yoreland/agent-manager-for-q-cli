# Manual Test Scenarios for Agent Creation UI

## Test Environment Setup

1. Open VS Code with the Agent Manager extension installed
2. Open a workspace folder
3. Ensure `.amazonq/cli-agents/` directory exists or can be created

## Test Scenarios

### Scenario 1: Happy Path - Complete Agent Creation

**Objective**: Verify successful agent creation with valid data

**Steps**:
1. Click the "+" button in the Q CLI Agents tree view
2. Verify the "Create New Agent" webview opens
3. Fill in the form:
   - Name: `test-agent-1`
   - Description: `A test agent for validation`
   - Prompt: `You are a helpful coding assistant`
   - Tools: Keep default selections (fs_read in allowed tools)
   - Resources: Keep default resources
4. Click "Create Agent"
5. Verify success notification appears
6. Verify webview closes automatically after 2 seconds
7. Verify new agent appears in the tree view
8. Verify agent file exists at `.amazonq/cli-agents/test-agent-1.json`

**Expected Results**:
- ✅ Agent created successfully
- ✅ Tree view refreshed
- ✅ File created with correct JSON structure
- ✅ Success notification displayed

### Scenario 2: Validation Errors - Invalid Agent Name

**Objective**: Test form validation for invalid agent names

**Steps**:
1. Open agent creation form
2. Test invalid names:
   - Empty name: Leave name field blank
   - Invalid characters: `test agent!@#`
   - Spaces: `test agent`
3. Verify real-time validation errors appear
4. Try to submit form with invalid name
5. Verify submit button is disabled

**Expected Results**:
- ✅ Real-time validation shows errors
- ✅ Submit button disabled for invalid input
- ✅ Error messages are clear and helpful

### Scenario 3: Duplicate Agent Name

**Objective**: Test duplicate agent name detection

**Steps**:
1. Create an agent named `duplicate-test`
2. Try to create another agent with the same name
3. Verify validation error appears
4. Verify form submission is blocked

**Expected Results**:
- ✅ Duplicate name detected during validation
- ✅ Clear error message displayed
- ✅ Form submission prevented

### Scenario 4: Tools Selection Logic

**Objective**: Test tool selection dependencies

**Steps**:
1. Open agent creation form
2. Test tool selection logic:
   - Uncheck a tool from "Available Tools"
   - Verify it's automatically unchecked from "Allowed Tools"
   - Check a tool in "Allowed Tools"
   - Verify it's automatically checked in "Available Tools"
3. Try different combinations of tool selections
4. Submit form and verify tools are saved correctly

**Expected Results**:
- ✅ Tool dependencies work correctly
- ✅ UI updates automatically
- ✅ Tool selections saved properly in agent file

### Scenario 5: Resource Management

**Objective**: Test resource addition and removal

**Steps**:
1. Open agent creation form
2. Test resource operations:
   - Add valid resource: `file://src/main.ts`
   - Try to add invalid resource: `invalid-path`
   - Try to add duplicate resource
   - Remove a resource using the × button
3. Verify validation messages
4. Submit form and check saved resources

**Expected Results**:
- ✅ Valid resources added successfully
- ✅ Invalid resources rejected with clear messages
- ✅ Duplicate resources prevented
- ✅ Resource removal works correctly

### Scenario 6: Form Cancellation

**Objective**: Test form cancellation behavior

**Steps**:
1. Open agent creation form
2. Fill in some data
3. Click "Cancel" button
4. Verify webview closes
5. Verify no agent file is created
6. Open form again and verify it's reset

**Expected Results**:
- ✅ Form closes without saving
- ✅ No files created
- ✅ Form resets on next open

### Scenario 7: Error Handling - File System Errors

**Objective**: Test handling of file system errors

**Steps**:
1. Create a read-only `.amazonq` directory (if possible)
2. Try to create an agent
3. Verify error handling
4. Restore directory permissions
5. Try again to verify recovery

**Expected Results**:
- ✅ File system errors handled gracefully
- ✅ Clear error messages displayed
- ✅ Form remains functional after error

### Scenario 8: Accessibility Testing

**Objective**: Test keyboard navigation and screen reader support

**Steps**:
1. Open agent creation form
2. Test keyboard navigation:
   - Tab through all form elements
   - Use Enter to submit form
   - Use Escape to cancel (if implemented)
   - Navigate tool checkboxes with keyboard
3. Test with screen reader (if available):
   - Verify form labels are read correctly
   - Verify error messages are announced
   - Verify tool descriptions are accessible

**Expected Results**:
- ✅ All elements accessible via keyboard
- ✅ Logical tab order
- ✅ Screen reader compatibility
- ✅ ARIA labels working correctly

### Scenario 9: Theme Compatibility

**Objective**: Test UI appearance in different VS Code themes

**Steps**:
1. Test with different VS Code themes:
   - Dark+ (default dark)
   - Light+ (default light)
   - High Contrast themes
2. Verify form appearance and readability
3. Check notification visibility
4. Verify focus indicators are visible

**Expected Results**:
- ✅ Form adapts to all themes
- ✅ Text remains readable
- ✅ Focus indicators visible
- ✅ Notifications properly styled

### Scenario 10: Performance Testing

**Objective**: Test form performance with large datasets

**Steps**:
1. Open agent creation form
2. Add many resources (20+ items)
3. Toggle many tools rapidly
4. Type quickly in text fields
5. Monitor for lag or freezing
6. Submit form with large data

**Expected Results**:
- ✅ Form remains responsive
- ✅ No noticeable lag
- ✅ Large datasets handled properly
- ✅ Submission completes successfully

## Test Data Templates

### Valid Agent Configuration
```json
{
  "name": "test-agent",
  "description": "A test agent for validation purposes",
  "prompt": "You are a helpful coding assistant that helps with TypeScript development",
  "tools": ["fs_read", "fs_write", "execute_bash"],
  "allowedTools": ["fs_read"],
  "resources": [
    "file://README.md",
    "file://src/**/*.ts",
    "file://.amazonq/rules/**/*.md"
  ]
}
```

### Invalid Test Cases
- **Empty name**: `""`
- **Invalid characters**: `"test@agent"`, `"test agent"`, `"test/agent"`
- **Invalid resources**: `"README.md"`, `"http://example.com"`
- **Tool conflicts**: allowed tools not in available tools

## Regression Testing Checklist

After any changes to the agent creation UI:

- [ ] All manual test scenarios pass
- [ ] Unit tests pass (`npm test`)
- [ ] Integration tests pass
- [ ] No console errors in webview
- [ ] Form validation works correctly
- [ ] File creation works in different environments
- [ ] Tree view updates properly
- [ ] Accessibility features intact
- [ ] Theme compatibility maintained
- [ ] Performance remains acceptable

## Bug Report Template

When reporting issues found during manual testing:

**Bug Title**: [Brief description]

**Environment**:
- VS Code Version: 
- Extension Version:
- Operating System:
- Workspace Type: (folder/workspace file)

**Steps to Reproduce**:
1. 
2. 
3. 

**Expected Behavior**:

**Actual Behavior**:

**Screenshots/Logs**: (if applicable)

**Severity**: (Critical/High/Medium/Low)
