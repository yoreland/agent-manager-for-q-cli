#!/usr/bin/env node

/**
 * Comprehensive test runner for the extension
 * Supports running different types of tests with proper reporting
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const TEST_TYPES = {
  unit: {
    command: 'npx jest --config jest.unit.config.js',
    description: 'Unit tests'
  },
  integration: {
    command: 'npx jest --config jest.integration.config.js',
    description: 'Integration tests'
  },
  e2e: {
    command: 'npx vscode-test',
    description: 'End-to-end tests'
  },
  performance: {
    command: 'npx jest --config jest.performance.config.js',
    description: 'Performance benchmarks'
  },
  all: {
    command: null, // Special case - runs all test types
    description: 'All tests'
  }
};

function printUsage() {
  console.log('Usage: node scripts/test-runner.js [test-type] [options]');
  console.log('');
  console.log('Test types:');
  Object.entries(TEST_TYPES).forEach(([type, config]) => {
    console.log(`  ${type.padEnd(12)} - ${config.description}`);
  });
  console.log('');
  console.log('Options:');
  console.log('  --watch      - Run tests in watch mode');
  console.log('  --coverage   - Generate coverage report');
  console.log('  --verbose    - Verbose output');
  console.log('  --bail       - Stop on first failure');
  console.log('  --help       - Show this help');
}

function runCommand(command, description) {
  console.log(`\n🧪 Running ${description}...`);
  console.log(`Command: ${command}`);
  console.log('─'.repeat(50));
  
  try {
    const startTime = Date.now();
    execSync(command, { 
      stdio: 'inherit', 
      cwd: process.cwd(),
      env: { ...process.env, FORCE_COLOR: '1' }
    });
    const duration = Date.now() - startTime;
    console.log(`✅ ${description} completed in ${duration}ms`);
    return true;
  } catch (error) {
    console.log(`❌ ${description} failed`);
    return false;
  }
}

function ensureTestDirectories() {
  const testDirs = [
    'src/__tests__/unit',
    'src/__tests__/integration',
    'src/__tests__/e2e',
    'src/__tests__/performance',
    'src/__tests__/fixtures',
    'src/__tests__/utils',
    'coverage',
    'test-results'
  ];

  testDirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`📁 Created directory: ${dir}`);
    }
  });
}

function generateTestReport(results) {
  const reportPath = path.join(process.cwd(), 'test-results', 'summary.json');
  const report = {
    timestamp: new Date().toISOString(),
    results: results,
    summary: {
      total: results.length,
      passed: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length
    }
  };

  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`📊 Test report saved to: ${reportPath}`);
}

function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.length === 0) {
    printUsage();
    return;
  }

  const testType = args[0];
  const options = args.slice(1);

  if (!TEST_TYPES[testType]) {
    console.error(`❌ Unknown test type: ${testType}`);
    printUsage();
    process.exit(1);
  }

  // Ensure test directories exist
  ensureTestDirectories();

  const isWatch = options.includes('--watch');
  const isCoverage = options.includes('--coverage');
  const isVerbose = options.includes('--verbose');
  const isBail = options.includes('--bail');

  console.log('🚀 Extension Test Runner');
  console.log('═'.repeat(50));

  const results = [];

  if (testType === 'all') {
    // Run all test types except 'all'
    const testTypesToRun = Object.keys(TEST_TYPES).filter(t => t !== 'all');
    
    for (const type of testTypesToRun) {
      const config = TEST_TYPES[type];
      let command = config.command;
      
      // Add options to command
      if (isCoverage && type !== 'e2e') {
        command += ' --coverage';
      }
      if (isVerbose) {
        command += ' --verbose';
      }
      if (isBail && type !== 'e2e') {
        command += ' --bail';
      }

      const success = runCommand(command, config.description);
      results.push({ type, success, command });

      if (!success && isBail) {
        console.log('🛑 Stopping due to --bail flag');
        break;
      }
    }
  } else {
    // Run specific test type
    const config = TEST_TYPES[testType];
    let command = config.command;

    // Add options to command
    if (isWatch && testType !== 'e2e') {
      command += ' --watch';
    }
    if (isCoverage && testType !== 'e2e') {
      command += ' --coverage';
    }
    if (isVerbose) {
      command += ' --verbose';
    }
    if (isBail && testType !== 'e2e') {
      command += ' --bail';
    }

    const success = runCommand(command, config.description);
    results.push({ type: testType, success, command });
  }

  // Generate test report
  if (results.length > 0) {
    generateTestReport(results);
  }

  // Summary
  console.log('\n📋 Test Summary');
  console.log('═'.repeat(50));
  const passed = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📊 Total:  ${results.length}`);

  if (failed > 0) {
    console.log('\n❌ Failed tests:');
    results.filter(r => !r.success).forEach(r => {
      console.log(`  - ${r.type}`);
    });
    process.exit(1);
  } else {
    console.log('\n🎉 All tests passed!');
  }
}

if (require.main === module) {
  main();
}