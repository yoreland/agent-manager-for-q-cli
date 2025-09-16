/**
 * Test fixtures for agent configurations
 */

import { AgentConfig } from '../../types/agent';

export const validAgentConfigs: Record<string, AgentConfig> = {
  basic: {
    $schema: 'https://json.schemastore.org/qcli-agent.json',
    name: 'basic-agent',
    description: 'A basic test agent',
    prompt: 'You are a helpful assistant',
    tools: ['file_reader'],
    allowedTools: ['file_reader', 'web_search'],
    resources: ['file://test/file.txt'],
    mcpServers: {},
    toolAliases: {},
    hooks: {},
    toolsSettings: {},
    useLegacyMcpJson: false
  },

  complex: {
    $schema: 'https://json.schemastore.org/qcli-agent.json',
    name: 'complex-agent',
    description: 'A complex test agent with many features',
    prompt: 'You are an advanced AI assistant with access to multiple tools and resources.',
    tools: ['file_reader', 'web_search', 'code_editor', 'terminal'],
    allowedTools: ['file_reader', 'web_search', 'code_editor', 'terminal', 'calculator'],
    resources: [
      'file://src/',
      'file://docs/',
      'file://README.md',
      'file://package.json'
    ],
    mcpServers: {
      'filesystem': {
        command: 'npx',
        args: ['@modelcontextprotocol/server-filesystem', '/path/to/allowed/files']
      }
    },
    toolAliases: {
      'fs': 'file_reader',
      'search': 'web_search'
    },
    hooks: {
      'pre-response': 'validate-output.js',
      'post-response': 'log-interaction.js'
    },
    toolsSettings: {
      'web_search': {
        'max_results': 10,
        'safe_search': true
      }
    },
    useLegacyMcpJson: false
  },

  minimal: {
    $schema: 'https://json.schemastore.org/qcli-agent.json',
    name: 'minimal-agent',
    description: 'Minimal agent configuration',
    prompt: null,
    tools: [],
    allowedTools: [],
    resources: [],
    mcpServers: {},
    toolAliases: {},
    hooks: {},
    toolsSettings: {},
    useLegacyMcpJson: false
  }
};

export const invalidAgentConfigs: Record<string, Partial<AgentConfig>> = {
  missingName: {
    $schema: 'https://json.schemastore.org/qcli-agent.json',
    description: 'Agent without name',
    prompt: 'Test prompt',
    tools: [],
    allowedTools: [],
    resources: [],
    mcpServers: {},
    toolAliases: {},
    hooks: {},
    toolsSettings: {},
    useLegacyMcpJson: false
  },

  invalidTools: {
    $schema: 'https://json.schemastore.org/qcli-agent.json',
    name: 'invalid-tools-agent',
    description: 'Agent with invalid tools',
    prompt: 'Test prompt',
    tools: 'not-an-array' as any,
    allowedTools: [],
    resources: [],
    mcpServers: {},
    toolAliases: {},
    hooks: {},
    toolsSettings: {},
    useLegacyMcpJson: false
  },

  invalidResources: {
    $schema: 'https://json.schemastore.org/qcli-agent.json',
    name: 'invalid-resources-agent',
    description: 'Agent with invalid resources',
    prompt: 'Test prompt',
    tools: [],
    allowedTools: [],
    resources: ['invalid-path-without-prefix', 'another-invalid-path'],
    mcpServers: {},
    toolAliases: {},
    hooks: {},
    toolsSettings: {},
    useLegacyMcpJson: false
  },

  emptyName: {
    $schema: 'https://json.schemastore.org/qcli-agent.json',
    name: '',
    description: 'Agent with empty name',
    prompt: 'Test prompt',
    tools: [],
    allowedTools: [],
    resources: [],
    mcpServers: {},
    toolAliases: {},
    hooks: {},
    toolsSettings: {},
    useLegacyMcpJson: false
  }
};

export const agentConfigTemplates: Record<string, Partial<AgentConfig>> = {
  codeReviewer: {
    name: 'code-reviewer',
    description: 'AI assistant specialized in code review',
    prompt: 'You are an expert code reviewer. Analyze code for bugs, performance issues, and best practices.',
    tools: ['file_reader', 'code_editor'],
    allowedTools: ['file_reader', 'code_editor', 'web_search'],
    resources: ['file://src/', 'file://tests/']
  },

  documentationWriter: {
    name: 'docs-writer',
    description: 'AI assistant for writing and maintaining documentation',
    prompt: 'You are a technical writer. Help create clear, comprehensive documentation.',
    tools: ['file_reader', 'web_search'],
    allowedTools: ['file_reader', 'web_search', 'code_editor'],
    resources: ['file://docs/', 'file://README.md']
  },

  testGenerator: {
    name: 'test-generator',
    description: 'AI assistant for generating unit tests',
    prompt: 'You are a testing expert. Generate comprehensive unit tests for the given code.',
    tools: ['file_reader', 'code_editor'],
    allowedTools: ['file_reader', 'code_editor'],
    resources: ['file://src/', 'file://tests/']
  }
};