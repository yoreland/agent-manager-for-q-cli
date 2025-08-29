/**
 * Unit tests for command registration and execution
 */

import * as vscode from 'vscode';
import { createMockExtensionContext } from './mocks';

jest.mock('vscode');

describe('Command Tests', () => {
  let mockContext: vscode.ExtensionContext;

  beforeEach(() => {
    mockContext = createMockExtensionContext();
    jest.clearAllMocks();
  });

  test('openContextManager command should be registered', async () => {
    const { activate } = await import('../extension');
    
    await activate(mockContext);

    expect(vscode.commands.registerCommand).toHaveBeenCalledWith(
      'qcli-context.openContextManager',
      expect.any(Function)
    );
  });

  test('openContextManager command should execute without error', async () => {
    const { activate } = await import('../extension');
    
    await activate(mockContext);

    // Get the registered command handler
    const registerCommandCalls = (vscode.commands.registerCommand as jest.Mock).mock.calls;
    const openContextManagerCall = registerCommandCalls.find(call => 
      call[0] === 'qcli-context.openContextManager'
    );
    
    expect(openContextManagerCall).toBeDefined();
    
    const commandHandler = openContextManagerCall[1];
    
    // Execute the command handler - should not throw
    await expect(commandHandler()).resolves.not.toThrow();
  });

  test('command execution should handle errors gracefully', async () => {
    const { activate } = await import('../extension');
    
    // Webview mocking removed - using tree view only
    
    await activate(mockContext);

    // Get the openContextManager command handler
    const registerCommandCalls = (vscode.commands.registerCommand as jest.Mock).mock.calls;
    const openContextManagerCall = registerCommandCalls.find(call => 
      call[0] === 'qcli-context.openContextManager'
    );
    
    const commandHandler = openContextManagerCall[1];
    
    // Execute the command handler - should handle error gracefully
    await commandHandler();
    
    // Should show error message to user
    expect(vscode.window.showErrorMessage).toHaveBeenCalled();
  });

  test('commands should be added to context subscriptions', async () => {
    const { activate } = await import('../extension');
    
    await activate(mockContext);

    // Should have registered disposables in context subscriptions
    expect(mockContext.subscriptions.length).toBeGreaterThan(0);
  });
});