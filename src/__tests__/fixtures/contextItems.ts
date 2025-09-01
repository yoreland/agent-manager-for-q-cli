/**
 * Test fixtures for context items
 */

import { ContextItem } from '../../types/context';

export const validContextItems: Record<string, ContextItem> = {
  textFile: {
    filePath: 'file://src/example.txt',
    contextValue: 'file',
    label: 'example.txt'
  },

  jsonFile: {
    filePath: 'file://config/settings.json',
    contextValue: 'file',
    label: 'settings.json'
  },

  typeScriptFile: {
    filePath: 'file://src/services/agentService.ts',
    contextValue: 'file',
    label: 'agentService.ts'
  },

  directory: {
    filePath: 'file://src/components/',
    contextValue: 'directory',
    label: 'components'
  },

  nestedFile: {
    filePath: 'file://src/deep/nested/path/file.js',
    contextValue: 'file',
    label: 'file.js'
  },

  markdownFile: {
    filePath: 'file://docs/README.md',
    contextValue: 'file',
    label: 'README.md'
  }
};

export const invalidContextItems: Record<string, Partial<ContextItem>> = {
  missingPath: {
    contextValue: 'file',
    label: 'missing-path.txt'
  },

  invalidPath: {
    filePath: 'invalid-path-without-prefix',
    contextValue: 'file',
    label: 'invalid.txt'
  },

  emptyPath: {
    filePath: '',
    contextValue: 'file',
    label: 'empty-path.txt'
  },

  missingContextValue: {
    filePath: 'file://test/file.txt',
    label: 'missing-context-value.txt'
  },

  invalidContextValue: {
    filePath: 'file://test/file.txt',
    contextValue: 'invalid-type',
    label: 'invalid-type.txt'
  }
};

export const contextItemCollections: Record<string, ContextItem[]> = {
  sourceFiles: [
    {
      filePath: 'file://src/index.ts',
      contextValue: 'file',
      label: 'index.ts'
    },
    {
      filePath: 'file://src/utils.ts',
      contextValue: 'file',
      label: 'utils.ts'
    },
    {
      filePath: 'file://src/types.ts',
      contextValue: 'file',
      label: 'types.ts'
    }
  ],

  configFiles: [
    {
      filePath: 'file://package.json',
      contextValue: 'file',
      label: 'package.json'
    },
    {
      filePath: 'file://tsconfig.json',
      contextValue: 'file',
      label: 'tsconfig.json'
    },
    {
      filePath: 'file://.eslintrc.js',
      contextValue: 'file',
      label: '.eslintrc.js'
    }
  ],

  documentationFiles: [
    {
      filePath: 'file://README.md',
      contextValue: 'file',
      label: 'README.md'
    },
    {
      filePath: 'file://docs/',
      contextValue: 'directory',
      label: 'docs'
    },
    {
      filePath: 'file://CHANGELOG.md',
      contextValue: 'file',
      label: 'CHANGELOG.md'
    }
  ],

  testFiles: [
    {
      filePath: 'file://src/__tests__/unit/',
      contextValue: 'directory',
      label: 'unit tests'
    },
    {
      filePath: 'file://src/__tests__/integration/',
      contextValue: 'directory',
      label: 'integration tests'
    },
    {
      filePath: 'file://jest.config.js',
      contextValue: 'file',
      label: 'jest.config.js'
    }
  ],

  mixedItems: [
    {
      filePath: 'file://src/',
      contextValue: 'directory',
      label: 'src'
    },
    {
      filePath: 'file://package.json',
      contextValue: 'file',
      label: 'package.json'
    },
    {
      filePath: 'file://README.md',
      contextValue: 'file',
      label: 'README.md'
    },
    {
      filePath: 'file://docs/api.md',
      contextValue: 'file',
      label: 'api.md'
    }
  ]
};