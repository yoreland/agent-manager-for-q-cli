/**
 * Jest test setup file
 * This file is run before each test suite
 */

// Mock VS Code API for unit tests
const mockVscode = {
  window: {
    createOutputChannel: jest.fn(() => ({
      appendLine: jest.fn(),
      show: jest.fn(),
      dispose: jest.fn()
    })),
    showInformationMessage: jest.fn(() => Promise.resolve()),
    showErrorMessage: jest.fn(() => Promise.resolve()),
    showWarningMessage: jest.fn(() => Promise.resolve()),
    // webview removed - using tree view only
    createTreeView: jest.fn(() => ({
      dispose: jest.fn(),
      reveal: jest.fn(),
      onDidChangeSelection: jest.fn(),
      onDidChangeVisibility: jest.fn(),
      onDidCollapseElement: jest.fn(),
      onDidExpandElement: jest.fn()
    })),
    // webview serializer removed - using tree view only
  },
  commands: {
    registerCommand: jest.fn(),
    executeCommand: jest.fn()
  },
  workspace: {
    getConfiguration: jest.fn(() => ({
      get: jest.fn((key: string, defaultValue?: any) => {
        if (key === 'logLevel') return 'info';
        if (key === 'enableDebugMode') return false;
        if (key === 'showOutputOnError') return true;
        if (key === 'logToConsole') return false;
        return defaultValue;
      }),
      update: jest.fn()
    })),
    onDidChangeConfiguration: jest.fn(() => ({
      dispose: jest.fn()
    }))
  },
  extensions: {
    getExtension: jest.fn()
  },
  ExtensionContext: jest.fn(),
  ExtensionMode: {
    Development: 1,
    Test: 2,
    Production: 3
  },
  Disposable: {
    from: jest.fn()
  },
  TreeItem: jest.fn(),
  TreeItemCollapsibleState: {
    None: 0,
    Collapsed: 1,
    Expanded: 2
  },
  ThemeIcon: jest.fn(),
  EventEmitter: jest.fn(() => ({
    event: jest.fn(),
    fire: jest.fn(),
    dispose: jest.fn()
  })),
  ViewColumn: {
    One: 1,
    Two: 2,
    Three: 3,
    Active: -1,
    Beside: -2
  },
  Uri: {
    joinPath: jest.fn(() => ({ toString: () => 'mock://path' })),
    file: jest.fn(() => ({ toString: () => 'file://mock/path' })),
    parse: jest.fn(() => ({ toString: () => 'mock://parsed' }))
  }
};

// Mock the vscode module
jest.mock('vscode', () => mockVscode, { virtual: true });

// Global test utilities - no need to expose globally

// Reset all mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
});