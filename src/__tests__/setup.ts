/**
 * Jest test setup file
 * This file is run before each test suite
 */

// Mock VS Code API for unit tests
const mockVscode = {
  window: {
    createOutputChannel: jest.fn(() => ({
      name: 'Mock Output Channel',
      append: jest.fn(),
      appendLine: jest.fn(),
      clear: jest.fn(),
      show: jest.fn(),
      hide: jest.fn(),
      dispose: jest.fn(),
      replace: jest.fn()
    })),
    showInformationMessage: jest.fn(() => Promise.resolve()),
    showErrorMessage: jest.fn(() => Promise.resolve()),
    showWarningMessage: jest.fn(() => Promise.resolve()),
    createTreeView: jest.fn(() => ({
      dispose: jest.fn(),
      reveal: jest.fn(),
      onDidChangeSelection: jest.fn(),
      onDidChangeVisibility: jest.fn(),
      onDidCollapseElement: jest.fn(),
      onDidExpandElement: jest.fn()
    }))
  },
  commands: {
    registerCommand: jest.fn(),
    executeCommand: jest.fn(),
    getCommands: jest.fn(() => Promise.resolve([
      'qcli-context.openContextManager',
      'qcli-context.refreshTree',
      'qcli-agents.refreshTree',
      'qcli-agents.createAgent',
      'qcli-agents.openAgent'
    ]))
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
    })),
    createFileSystemWatcher: jest.fn(() => ({
      ignoreCreateEvents: false,
      ignoreChangeEvents: false,
      ignoreDeleteEvents: false,
      onDidCreate: jest.fn(() => ({ dispose: jest.fn() })),
      onDidChange: jest.fn(() => ({ dispose: jest.fn() })),
      onDidDelete: jest.fn(() => ({ dispose: jest.fn() })),
      dispose: jest.fn()
    }))
  },
  extensions: {
    getExtension: jest.fn(() => ({
      isActive: true,
      activate: jest.fn(() => Promise.resolve()),
      exports: {}
    }))
  },
  ExtensionContext: jest.fn(),
  ExtensionMode: {
    Development: 1,
    Test: 2,
    Production: 3
  },
  Disposable: {
    from: jest.fn(() => ({ dispose: jest.fn() }))
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
    file: jest.fn((path: string) => ({ 
      toString: () => `file://${path}`,
      fsPath: path,
      path: path,
      scheme: 'file'
    })),
    parse: jest.fn(() => ({ toString: () => 'mock://parsed' }))
  },
  RelativePattern: jest.fn((base: string, pattern: string) => ({
    base,
    pattern,
    baseUri: { toString: () => `file://${base}` }
  }))
};

// Mock the vscode module
jest.mock('vscode', () => mockVscode, { virtual: true });

// Mock Node.js modules commonly used in tests
jest.mock('fs', () => ({
  promises: {
    readFile: jest.fn(),
    writeFile: jest.fn(),
    mkdir: jest.fn(),
    stat: jest.fn(),
    readdir: jest.fn()
  },
  existsSync: jest.fn(),
  readFileSync: jest.fn(),
  writeFileSync: jest.fn()
}));

jest.mock('path', () => ({
  join: jest.fn((...args) => args.join('/')),
  resolve: jest.fn((...args) => '/' + args.join('/')),
  dirname: jest.fn((path) => path.split('/').slice(0, -1).join('/')),
  basename: jest.fn((path) => path.split('/').pop()),
  extname: jest.fn((path) => {
    const parts = path.split('.');
    return parts.length > 1 ? '.' + parts.pop() : '';
  }),
  sep: '/',
  delimiter: ':'
}));

// Global test setup
beforeEach(() => {
  jest.clearAllMocks();
  jest.restoreAllMocks();
});

// Global test teardown
afterEach(() => {
  jest.clearAllTimers();
});

// Performance testing setup
if (typeof performance === 'undefined') {
  global.performance = {
    now: () => Date.now(),
    mark: jest.fn(),
    measure: jest.fn(),
    clearMarks: jest.fn(),
    clearMeasures: jest.fn(),
    getEntries: jest.fn(() => []),
    getEntriesByName: jest.fn(() => []),
    getEntriesByType: jest.fn(() => [])
  } as any;
}

// Console setup for tests
const originalConsole = console;
beforeAll(() => {
  // Suppress console output during tests unless explicitly needed
  if (process.env['JEST_VERBOSE'] !== 'true') {
    global.console = {
      ...originalConsole,
      log: jest.fn(),
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn()
    };
  }
});

afterAll(() => {
  global.console = originalConsole;
});