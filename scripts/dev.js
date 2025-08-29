#!/usr/bin/env node

/**
 * Development Build Script
 * 
 * This script provides utilities for development builds and testing.
 * It includes watch mode, type checking, and development server setup.
 */

const { execSync, spawn } = require('child_process');
const path = require('path');
const { getBuildConfig, getFilePaths } = require('../build.config');

/**
 * Execute command with proper error handling
 * @param {string} command - Command to execute
 * @param {object} options - Execution options
 */
function execCommand(command, options = {}) {
  console.log(`Executing: ${command}`);
  try {
    return execSync(command, { 
      stdio: 'inherit', 
      cwd: path.resolve(__dirname, '..'),
      ...options 
    });
  } catch (error) {
    console.error(`Command failed: ${command}`);
    console.error(error.message);
    process.exit(1);
  }
}

/**
 * Start development build with watch mode
 */
function startWatchMode() {
  console.log('🔄 Starting development build with watch mode...');
  
  // Start TypeScript compiler in watch mode for type checking
  const tscWatch = spawn('npm', ['run', 'watch:tsc'], {
    stdio: 'inherit',
    cwd: path.resolve(__dirname, '..')
  });
  
  // Start esbuild in watch mode
  const esbuildWatch = spawn('npm', ['run', 'watch:esbuild'], {
    stdio: 'inherit',
    cwd: path.resolve(__dirname, '..')
  });
  
  // Handle process termination
  process.on('SIGINT', () => {
    console.log('\n🛑 Stopping watch mode...');
    tscWatch.kill();
    esbuildWatch.kill();
    process.exit(0);
  });
  
  console.log('👀 Watch mode started. Press Ctrl+C to stop.');
}

/**
 * Run development build once
 */
function buildDev() {
  console.log('🔨 Running development build...');
  
  const config = getBuildConfig(false);
  const paths = getFilePaths(false);
  
  // Type check
  console.log('Checking types...');
  execCommand('npm run check-types');
  
  // Lint
  console.log('Running linter...');
  execCommand('npm run lint');
  
  // Build
  console.log('Building extension...');
  execCommand('npm run compile:dev');
  
  console.log('✅ Development build completed!');
}

/**
 * Run tests in development mode
 */
function runTests() {
  console.log('🧪 Running tests...');
  
  // Compile tests
  execCommand('npm run compile-tests');
  
  // Run tests
  execCommand('npm test');
  
  console.log('✅ Tests completed!');
}

/**
 * Clean development build
 */
function clean() {
  console.log('🧹 Cleaning build output...');
  execCommand('npm run clean');
  console.log('✅ Clean completed!');
}

/**
 * Main development script function
 */
function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  switch (command) {
    case 'watch':
      startWatchMode();
      break;
    case 'build':
      buildDev();
      break;
    case 'test':
      runTests();
      break;
    case 'clean':
      clean();
      break;
    default:
      console.log('📖 Available commands:');
      console.log('  watch  - Start development build with watch mode');
      console.log('  build  - Run development build once');
      console.log('  test   - Run tests');
      console.log('  clean  - Clean build output');
      console.log('');
      console.log('Usage: node scripts/dev.js <command>');
      break;
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = {
  main,
  startWatchMode,
  buildDev,
  runTests,
  clean
};