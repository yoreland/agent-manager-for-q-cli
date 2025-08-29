#!/usr/bin/env node

/**
 * VS Code Extension Packaging Script
 * 
 * This script handles the packaging of the extension for distribution.
 * It performs pre-packaging checks, builds the extension, and creates
 * a VSIX package following VS Code Extension standards.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { getBuildConfig, getFilePaths } = require('../build.config');

/**
 * Execute command and log output
 * @param {string} command - Command to execute
 * @param {object} options - Execution options
 */
function execCommand(command, options = {}) {
  console.log(`Executing: ${command}`);
  try {
    const result = execSync(command, { 
      stdio: 'inherit', 
      cwd: path.resolve(__dirname, '..'),
      ...options 
    });
    return result;
  } catch (error) {
    console.error(`Command failed: ${command}`);
    console.error(error.message);
    process.exit(1);
  }
}

/**
 * Check if required files exist
 * @param {object} paths - File paths to check
 */
function validateFiles(paths) {
  console.log('Validating required files...');
  
  const requiredFiles = [
    paths.packageJson,
    paths.tsConfig,
    paths.mainEntry
  ];
  
  for (const file of requiredFiles) {
    if (!fs.existsSync(file)) {
      console.error(`Required file missing: ${file}`);
      process.exit(1);
    }
  }
  
  console.log('✓ All required files present');
}

/**
 * Validate package.json for VS Code Extension requirements
 * @param {object} paths - File paths object
 */
function validatePackageJson(paths) {
  console.log('Validating package.json...');
  
  const packageJson = JSON.parse(fs.readFileSync(paths.packageJson, 'utf8'));
  
  const requiredFields = [
    'name', 'displayName', 'description', 'version', 
    'publisher', 'engines', 'main', 'contributes'
  ];
  
  for (const field of requiredFields) {
    if (!packageJson[field]) {
      console.error(`Missing required field in package.json: ${field}`);
      process.exit(1);
    }
  }
  
  // Check VS Code engine version
  if (!packageJson.engines.vscode) {
    console.error('Missing vscode engine specification in package.json');
    process.exit(1);
  }
  
  console.log('✓ package.json validation passed');
}

/**
 * Clean build output directory
 * @param {object} paths - File paths object
 */
function cleanBuild(paths) {
  console.log('Cleaning build output...');
  
  if (fs.existsSync(paths.out)) {
    execCommand(`rimraf ${paths.out}`);
  }
  
  console.log('✓ Build output cleaned');
}

/**
 * Build extension for production
 */
function buildExtension() {
  console.log('Building extension for production...');
  
  execCommand('npm run package');
  
  console.log('✓ Extension built successfully');
}

/**
 * Create VSIX package
 * @param {boolean} skipBuild - Whether to skip the build step
 */
function createVsixPackage(skipBuild = false) {
  console.log('Creating VSIX package...');
  
  if (!skipBuild) {
    buildExtension();
  }
  
  // Check if vsce is available
  try {
    execCommand('npx @vscode/vsce --version', { stdio: 'pipe' });
  } catch (error) {
    console.error('vsce not found. Installing...');
    execCommand('npm install --save-dev @vscode/vsce');
  }
  
  // Create VSIX package
  execCommand('npx @vscode/vsce package --no-dependencies');
  
  console.log('✓ VSIX package created successfully');
}

/**
 * Main packaging function
 */
function main() {
  const args = process.argv.slice(2);
  const skipBuild = args.includes('--skip-build');
  const production = true; // Always use production for packaging
  
  console.log('🚀 Starting VS Code Extension packaging...');
  console.log(`Mode: ${production ? 'Production' : 'Development'}`);
  
  const config = getBuildConfig(production);
  const paths = getFilePaths(production);
  
  try {
    // Pre-packaging validation
    validateFiles(paths);
    validatePackageJson(paths);
    
    // Clean and build
    if (!skipBuild) {
      cleanBuild(paths);
    }
    
    // Create package
    createVsixPackage(skipBuild);
    
    console.log('✅ Extension packaging completed successfully!');
    
    // Show package info
    const packageFiles = fs.readdirSync('.').filter(file => file.endsWith('.vsix'));
    if (packageFiles.length > 0) {
      console.log(`📦 Package created: ${packageFiles[packageFiles.length - 1]}`);
    }
    
  } catch (error) {
    console.error('❌ Packaging failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = {
  main,
  createVsixPackage,
  buildExtension,
  validatePackageJson
};