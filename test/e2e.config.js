/**
 * E2E Test Configuration for VS Code Extension Testing
 */

module.exports = {
  // Test files pattern
  files: 'out/__tests__/e2e/**/*.test.js',
  
  // VS Code version to test against
  version: 'insiders',
  
  // Workspace folder for testing
  workspaceFolder: './test-workspace',
  
  // Mocha configuration for E2E tests
  mocha: {
    ui: 'tdd',
    timeout: 20000,
    color: true,
    reporter: 'spec'
  },
  
  // Environment variables for testing
  env: {
    NODE_ENV: 'test',
    VSCODE_TEST_MODE: 'e2e'
  },
  
  // Extension development host options
  extensionDevelopmentPath: process.cwd(),
  extensionTestsPath: './out/__tests__/e2e'
};