# Manual Integration Test Guide

This document provides a comprehensive guide for manually testing the Q CLI Context Manager extension in VS Code Extension Development Host.

## Prerequisites

1. VS Code installed
2. Extension source code compiled (`npm run compile`)
3. Extension Development Host ready to launch

## Test Execution Steps

### 1. Extension Installation and Activation Test

**Objective**: Verify extension appears in VS Code and activates without errors

**Steps**:
1. Open VS Code
2. Press `F5` to launch Extension Development Host
3. In the new VS Code window, check:
   - Extension appears in Extensions view (`Ctrl+Shift+X`)
   - No error notifications appear
   - Extension status shows as "Active"

**Expected Results**:
- ✅ Extension appears in extension list
- ✅ Extension activates without errors
- ✅ No error messages in Developer Console (`Help > Toggle Developer Tools`)

**Requirements Verified**: 1.1, 1.2, 1.3, 1.4

---

### 2. Activity Bar Integration Test

**Objective**: Verify Q CLI Context Manager appears in Activity Bar

**Steps**:
1. Look at the left Activity Bar in VS Code
2. Find the Q CLI Context icon (should be a class symbol)
3. Click on the Q CLI Context icon
4. Observe the side panel that opens

**Expected Results**:
- ✅ Q CLI Context icon visible in Activity Bar
- ✅ Clicking icon opens Context Manager view in side panel
- ✅ Side panel shows "Context Manager" title
- ✅ Welcome message displayed: "컨텍스트 파일이 없습니다"
- ✅ Description shown: "파일을 드래그하여 컨텍스트에 추가하세요"

**Requirements Verified**: 3.1, 3.2, 3.3, 3.4

---

### 3. Command Palette Integration Test

**Objective**: Verify commands are available in Command Palette

**Steps**:
1. Press `Ctrl+Shift+P` (or `Cmd+Shift+P` on Mac) to open Command Palette
2. Type "Q CLI" to filter commands
3. Look for "Q CLI: Context Manager 열기" command
4. Execute the command by pressing Enter
5. Check for any notifications or panels that open

**Expected Results**:
- ✅ "Q CLI: Context Manager 열기" command appears in palette
- ✅ Command executes without errors
- ✅ Webview panel opens with title "Q CLI Context Manager"
- ✅ Information message appears: "Q CLI Context Manager가 열렸습니다!"

**Requirements Verified**: 2.1, 2.2, 2.3, 2.4

---

### 4. Tree View Refresh Test

**Objective**: Verify tree view refresh functionality

**Steps**:
1. Open Q CLI Context view in Activity Bar
2. Look for refresh button (circular arrow icon) in the view title
3. Click the refresh button
4. Observe any changes or confirmations

**Expected Results**:
- ✅ Refresh button visible in tree view title bar
- ✅ Clicking refresh button executes without errors
- ✅ Tree view updates (even if content remains the same)
- ✅ No error messages appear

**Requirements Verified**: 3.4

---

### 5. Error Handling and Logging Test

**Objective**: Verify error handling and logging functionality

**Steps**:
1. Open Output panel (`View > Output`)
2. Select "Q CLI Context Manager" from the dropdown
3. Execute various commands and observe logging
4. Try to trigger an error (e.g., by modifying extension code temporarily)

**Expected Results**:
- ✅ "Q CLI Context Manager" output channel exists
- ✅ Activation messages logged with timestamps
- ✅ User actions logged (command executions)
- ✅ Error messages (if any) are user-friendly
- ✅ Detailed error information in output channel

**Requirements Verified**: 4.1, 4.2, 4.3, 4.4

---

### 6. Performance Test

**Objective**: Verify extension meets performance requirements

**Steps**:
1. Close all VS Code windows
2. Open VS Code fresh
3. Press `F5` to launch Extension Development Host
4. Measure time from launch to full functionality
5. Monitor memory usage in Task Manager/Activity Monitor

**Expected Results**:
- ✅ Extension activates quickly (subjectively fast)
- ✅ No noticeable delay in VS Code startup
- ✅ Commands execute promptly when invoked
- ✅ Memory usage remains reasonable

**Requirements Verified**: 5.1, 5.2

---

### 7. Theme Compatibility Test

**Objective**: Verify extension works with different VS Code themes

**Steps**:
1. Change VS Code theme (`File > Preferences > Color Theme`)
2. Test with:
   - Light theme (e.g., "Light (Visual Studio)")
   - Dark theme (e.g., "Dark (Visual Studio)")
   - High contrast theme (if available)
3. For each theme, verify:
   - Activity Bar icon visibility
   - Tree view appearance
   - Webview panel appearance

**Expected Results**:
- ✅ Extension works with light themes
- ✅ Extension works with dark themes
- ✅ Icons and text remain visible and readable
- ✅ No visual glitches or contrast issues

**Requirements Verified**: 5.4

---

### 8. Extension Packaging Standards Test

**Objective**: Verify extension follows VS Code packaging standards

**Steps**:
1. Check `package.json` for required fields
2. Verify extension manifest structure
3. Test extension packaging: `npm run vsce:package`
4. Install packaged extension and test basic functionality

**Expected Results**:
- ✅ `package.json` contains all required fields
- ✅ Extension packages without errors
- ✅ Packaged extension installs and works correctly
- ✅ Extension metadata displays correctly in Extensions view

**Requirements Verified**: 5.3

---

### 9. Integration Test Command

**Objective**: Run automated integration tests within VS Code

**Steps**:
1. In Extension Development Host, open Command Palette
2. Type "Q CLI: Run Integration Tests"
3. Execute the command
4. Check Output panel for test results

**Expected Results**:
- ✅ Integration test command available
- ✅ Tests execute without crashing
- ✅ Test results displayed in output channel
- ✅ All tests pass or provide meaningful failure information

---

## Test Results Template

Copy and fill out this template when conducting tests:

```
# Q CLI Context Manager - Integration Test Results

**Date**: [DATE]
**VS Code Version**: [VERSION]
**Extension Version**: 0.0.1
**Operating System**: [OS]

## Test Results

### 1. Extension Installation and Activation
- [ ] Extension appears in extension list
- [ ] Extension activates without errors
- [ ] No error messages in console
- **Notes**: 

### 2. Activity Bar Integration
- [ ] Q CLI Context icon visible in Activity Bar
- [ ] Clicking icon opens Context Manager view
- [ ] Welcome message displayed correctly
- **Notes**: 

### 3. Command Palette Integration
- [ ] Commands appear in Command Palette
- [ ] Commands execute without errors
- [ ] Webview panel opens correctly
- **Notes**: 

### 4. Tree View Refresh
- [ ] Refresh button visible and functional
- [ ] No errors on refresh
- **Notes**: 

### 5. Error Handling and Logging
- [ ] Output channel exists and logs messages
- [ ] Error handling works correctly
- **Notes**: 

### 6. Performance
- [ ] Extension activates quickly
- [ ] Commands execute promptly
- **Notes**: 

### 7. Theme Compatibility
- [ ] Works with light themes
- [ ] Works with dark themes
- **Notes**: 

### 8. Extension Packaging Standards
- [ ] Package.json is valid
- [ ] Extension packages correctly
- **Notes**: 

### 9. Integration Test Command
- [ ] Command available and executes
- [ ] Test results are meaningful
- **Notes**: 

## Overall Assessment

**Pass/Fail**: [PASS/FAIL]
**Critical Issues**: [LIST ANY CRITICAL ISSUES]
**Recommendations**: [LIST RECOMMENDATIONS]
```

## Troubleshooting

### Common Issues

1. **Extension doesn't appear in Activity Bar**
   - Check `package.json` viewsContainers configuration
   - Verify extension is activated
   - Restart Extension Development Host

2. **Commands not available in Command Palette**
   - Check `package.json` commands configuration
   - Verify command registration in extension.ts
   - Check for activation errors in console

3. **Webview doesn't open**
   - Check browser console for errors
   - Verify webview HTML is valid
   - Check Content Security Policy settings

4. **Performance issues**
   - Check for memory leaks in extension code
   - Verify proper resource disposal
   - Monitor CPU usage during operations

### Debug Mode

To enable debug mode for more detailed logging:
1. Open VS Code Settings
2. Search for "qcli-context"
3. Enable "Enable Debug Mode"
4. Restart extension or reload window
5. Check output channel for detailed logs