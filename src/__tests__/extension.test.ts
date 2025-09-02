/**
 * Unit tests for extension activation and core functionality
 */

import * as vscode from 'vscode';
import { createMockExtensionContext } from './mocks';

// Import the functions we want to test
// Note: We need to mock vscode before importing our extension code
jest.mock('vscode');

describe('Extension Activation Tests', () => {
  let mockContext: vscode.ExtensionContext;

  beforeEach(() => {
    mockContext = createMockExtensionContext();
    jest.clearAllMocks();
  });

  test('should register main command during activation', async () => {
    // Import after mocking
    const { activate } = await import('../extension');
    
    // Call activate function
    await activate(mockContext);

    // Verify that main command was registered
    expect(vscode.commands.registerCommand).toHaveBeenCalledWith(
      'qcli-context.openContextManager',
      expect.any(Function)
    );
  });

  test('should create output channel during activation', async () => {
    const { activate } = await import('../extension');
    
    await activate(mockContext);

    expect(vscode.window.createOutputChannel).toHaveBeenCalledWith('Agent Manager for Q CLI');
  });

  test('should initialize extension state correctly', async () => {
    const { activate, getExtensionState } = await import('../extension');
    
    await activate(mockContext);
    
    const state = getExtensionState();
    expect(state).toBeDefined();
    if (state) {
      expect(state.isActivated).toBe(true);
      expect(state.logger).toBeDefined();
      expect(state.outputChannel).toBeDefined();
    }
  });

  test('should handle deactivation', async () => {
    const { activate, deactivate, getExtensionState } = await import('../extension');
    
    // First activate
    await activate(mockContext);
    
    // Verify activated
    let state = getExtensionState();
    expect(state?.isActivated).toBe(true);
    
    // Then deactivate
    deactivate();
    
    // Should clean up state (extensionState becomes undefined after deactivation)
    state = getExtensionState();
    expect(state).toBeUndefined();
  });
});