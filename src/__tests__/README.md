# Test Structure Documentation

This document describes the comprehensive test structure for the Context Manager for Q CLI extension.

## Directory Structure

```
src/__tests__/
├── unit/                   # Unit tests for individual components
│   ├── logger.test.ts     # Logger service tests
│   └── testUtils.test.ts  # Test utilities validation
├── integration/           # Integration tests for component interactions
│   └── file-watching-integration.test.ts
├── e2e/                   # End-to-end tests for complete workflows
│   └── extension-activation.test.ts
├── performance/           # Performance benchmarks and timing tests
│   ├── activation-benchmark.test.ts
│   └── file-operations-benchmark.test.ts
├── fixtures/              # Test data and mock configurations
│   ├── agentConfigs.ts   # Agent configuration test data
│   └── contextItems.ts   # Context item test data
├── utils/                 # Test utilities and helpers
│   └── testUtils.ts      # Comprehensive test utilities
├── setup.ts              # Jest test setup and global mocks
└── README.md             # This documentation
```

## Test Types

### Unit Tests (`src/__tests__/unit/`)

Unit tests focus on testing individual components in isolation. They use Jest as the test runner and include comprehensive mocking of dependencies.

**Configuration**: `jest.unit.config.js`
**Command**: `npm run test:unit`
**Timeout**: 5 seconds

### Integration Tests (`src/__tests__/integration/`)

Integration tests verify that multiple components work together correctly. They test interactions between services, file system operations, and VS Code API integrations.

**Configuration**: `jest.integration.config.js`
**Command**: `npm run test:integration`
**Timeout**: 15 seconds

### End-to-End Tests (`src/__tests__/e2e/`)

E2E tests run in the actual VS Code environment and test complete user workflows. They use the VS Code Test Runner and Mocha syntax.

**Configuration**: `test/e2e.config.js`
**Command**: `npm run test:e2e`
**Timeout**: 20 seconds

### Performance Tests (`src/__tests__/performance/`)

Performance tests benchmark critical operations and ensure they meet performance targets. They include activation time, memory usage, and operation speed tests.

**Configuration**: `jest.performance.config.js`
**Command**: `npm run test:performance`
**Timeout**: 30 seconds

## Test Utilities

### TestDataBuilder

Creates consistent test data for various scenarios:

```typescript
// Create valid agent configuration
const config = TestDataBuilder.createValidAgentConfig();

// Create with overrides
const customConfig = TestDataBuilder.createValidAgentConfig({
  name: 'custom-agent',
  tools: ['custom_tool']
});

// Create invalid configuration for error testing
const invalidConfig = TestDataBuilder.createInvalidAgentConfig(['missing name']);

// Create context items
const item = TestDataBuilder.createContextItem();
const items = TestDataBuilder.createContextItems(5);
```

### MockFactory

Creates consistent VS Code API mocks:

```typescript
// Create mock extension context
const context = MockFactory.createExtensionContext();

// Create mock logger
const logger = MockFactory.createLogger();

// Create mock output channel
const channel = MockFactory.createOutputChannel();

// Create mock file system watcher
const watcher = MockFactory.createFileSystemWatcher();
```

### PerformanceTestUtils

Utilities for performance testing and benchmarking:

```typescript
// Measure execution time
const { result, duration } = await PerformanceTestUtils.measureExecutionTime(
  () => someOperation(),
  'Operation description'
);

// Assert execution time limit
const result = await PerformanceTestUtils.assertExecutionTime(
  () => fastOperation(),
  100, // 100ms limit
  'Fast operation'
);

// Run benchmark with multiple iterations
const benchmark = await PerformanceTestUtils.benchmark(
  () => operation(),
  100, // 100 iterations
  'Benchmark description'
);
```

### AsyncTestUtils

Utilities for async testing scenarios:

```typescript
// Wait for condition with timeout
await AsyncTestUtils.waitFor(
  () => someCondition(),
  5000, // 5 second timeout
  100   // 100ms interval
);

// Sleep utility
await AsyncTestUtils.sleep(1000); // 1 second

// Create deferred promise
const deferred = AsyncTestUtils.createDeferred<string>();
setTimeout(() => deferred.resolve('done'), 100);
const result = await deferred.promise;
```

## Test Fixtures

### Agent Configurations (`fixtures/agentConfigs.ts`)

Pre-defined agent configurations for testing:

- `validAgentConfigs.basic` - Simple valid configuration
- `validAgentConfigs.complex` - Complex configuration with all features
- `validAgentConfigs.minimal` - Minimal valid configuration
- `invalidAgentConfigs.*` - Various invalid configurations for error testing
- `agentConfigTemplates.*` - Template configurations for different use cases

### Context Items (`fixtures/contextItems.ts`)

Pre-defined context items for testing:

- `validContextItems.*` - Various valid context items
- `invalidContextItems.*` - Invalid context items for error testing
- `contextItemCollections.*` - Collections of related context items

## Running Tests

### Individual Test Types

```bash
# Run unit tests only
npm run test:unit

# Run integration tests only
npm run test:integration

# Run e2e tests only
npm run test:e2e

# Run performance tests only
npm run test:performance
```

### Combined Test Runs

```bash
# Run unit and integration tests
npm run test:all

# Run all test types including e2e
npm run test
```

### Test Runner Script

Use the comprehensive test runner for advanced options:

```bash
# Run specific test type
node scripts/test-runner.js unit

# Run with coverage
node scripts/test-runner.js unit --coverage

# Run in watch mode
node scripts/test-runner.js unit --watch

# Run with verbose output
node scripts/test-runner.js unit --verbose

# Run all tests
node scripts/test-runner.js all
```

## Performance Targets

The performance tests enforce these targets:

- **Extension Activation**: < 100ms
- **Command Registration**: < 50ms
- **File Operations**: < 50ms for small files, < 100ms for writes
- **Batch Operations**: < 500ms for 10 files
- **Memory Usage**: < 10MB increase after activation
- **Path Validation**: < 5ms average
- **Context Item Creation**: < 10ms average

## Coverage

Test coverage is collected for:

- All source files (`src/**/*.ts`)
- Excluding type definitions (`!src/**/*.d.ts`)
- Excluding test files (`!src/__tests__/**/*`)

Coverage reports are generated in:
- `coverage/unit/` - Unit test coverage
- `coverage/integration/` - Integration test coverage
- `coverage/` - Combined coverage

## Best Practices

### Writing Tests

1. **Use descriptive test names** that explain what is being tested
2. **Follow the AAA pattern**: Arrange, Act, Assert
3. **Use appropriate test utilities** from the utils directory
4. **Mock external dependencies** consistently using MockFactory
5. **Test both success and error scenarios**
6. **Keep tests focused** on a single concern

### Performance Tests

1. **Set realistic targets** based on actual usage patterns
2. **Use multiple iterations** for reliable benchmarks
3. **Test memory usage** for operations that create objects
4. **Include variance checks** to ensure consistent performance

### Test Data

1. **Use fixtures** for consistent test data
2. **Create variations** for different test scenarios
3. **Include edge cases** in test data
4. **Keep test data minimal** but representative

### Mocking

1. **Mock at the boundary** between your code and external dependencies
2. **Use consistent mocks** across similar tests
3. **Verify mock interactions** when testing behavior
4. **Reset mocks** between tests to avoid interference

## Troubleshooting

### Common Issues

1. **Tests timing out**: Increase timeout or check for infinite loops
2. **Mock not working**: Ensure mock is set up before the code under test
3. **Performance test failing**: Check if targets are realistic for the environment
4. **E2E tests failing**: Ensure VS Code extension is properly packaged

### Debugging

1. **Use `console.log`** in tests for debugging (will be suppressed unless `JEST_VERBOSE=true`)
2. **Run single test file** with `npx jest path/to/test.ts`
3. **Use `--verbose` flag** for detailed test output
4. **Check test reports** in `test-results/summary.json`

## Migration from Old Structure

The old test structure has been consolidated:

- `src/test/` directory removed
- All tests moved to `src/__tests__/`
- Mocha syntax converted to Jest (except E2E tests)
- Test utilities centralized and enhanced
- Performance testing framework added
- Comprehensive fixtures created

This provides better organization, consistency, and maintainability for the test suite.