/**
 * Mock utilities for testing
 */

import * as vscode from 'vscode';

export function createMockExtensionContext(): vscode.ExtensionContext {
  return {
    subscriptions: [],
    workspaceState: {
      get: jest.fn(),
      update: jest.fn(),
      keys: jest.fn(() => [])
    },
    globalState: {
      get: jest.fn(),
      update: jest.fn(),
      keys: jest.fn(() => []),
      setKeysForSync: jest.fn()
    },
    extensionUri: {} as vscode.Uri,
    extensionPath: '/mock/extension/path',
    asAbsolutePath: jest.fn((relativePath: string) => `/mock/extension/path/${relativePath}`),
    storageUri: {} as vscode.Uri,
    storagePath: '/mock/storage/path',
    globalStorageUri: {} as vscode.Uri,
    globalStoragePath: '/mock/global/storage/path',
    logUri: {} as vscode.Uri,
    logPath: '/mock/log/path',
    extensionMode: vscode.ExtensionMode.Development,
    environmentVariableCollection: {
      getScoped: jest.fn(),
      replace: jest.fn(),
      append: jest.fn(),
      prepend: jest.fn(),
      get: jest.fn(),
      forEach: jest.fn(),
      delete: jest.fn(),
      clear: jest.fn(),
      persistent: true
    } as any,
    secrets: {} as vscode.SecretStorage,
    extension: {} as vscode.Extension<any>,
    languageModelAccessInformation: {} as any
  } as vscode.ExtensionContext;
}

export function createMockLogger() {
  return {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    logUserAction: jest.fn(),
    logLifecycle: jest.fn(),
    logTiming: jest.fn(),
    getLogLevel: jest.fn(),
    setLogLevel: jest.fn(),
    isDebugMode: jest.fn(),
    setDebugMode: jest.fn()
  };
}