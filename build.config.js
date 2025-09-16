/**
 * Build Configuration for Context Manager for Q CLI Extension
 * 
 * This file contains build configuration constants and utilities
 * used across different build scripts and environments.
 */

const path = require('path');

/**
 * Build environment configuration
 */
const BUILD_CONFIG = {
  // Source and output directories
  SRC_DIR: 'src',
  OUT_DIR: 'out',
  
  // Entry points
  MAIN_ENTRY: 'src/extension.ts',
  TEST_ENTRY: 'src/test/**/*.test.ts',
  
  // Build targets
  NODE_TARGET: 'node18',
  ES_TARGET: 'es2020',
  
  // Extension metadata
  EXTENSION_NAME: 'context-manager-for-q-cli',
  EXTENSION_DISPLAY_NAME: 'Context Manager for Q CLI',
  
  // Build optimization
  PRODUCTION_OPTIMIZATIONS: {
    minify: true,
    treeShaking: true,
    sourcemap: false,
    dropConsole: true,
    dropDebugger: true
  },
  
  DEVELOPMENT_OPTIMIZATIONS: {
    minify: false,
    treeShaking: false,
    sourcemap: true,
    dropConsole: false,
    dropDebugger: false,
    keepNames: true
  }
};

/**
 * Get build configuration based on environment
 * @param {boolean} production - Whether this is a production build
 * @returns {object} Build configuration object
 */
function getBuildConfig(production = false) {
  return {
    ...BUILD_CONFIG,
    isProduction: production,
    optimizations: production 
      ? BUILD_CONFIG.PRODUCTION_OPTIMIZATIONS 
      : BUILD_CONFIG.DEVELOPMENT_OPTIMIZATIONS
  };
}

/**
 * Resolve path relative to project root
 * @param {string} relativePath - Path relative to project root
 * @returns {string} Absolute path
 */
function resolvePath(relativePath) {
  return path.resolve(__dirname, relativePath);
}

/**
 * Get environment-specific file paths
 * @param {boolean} production - Whether this is a production build
 * @returns {object} File paths object
 */
function getFilePaths(production = false) {
  return {
    src: resolvePath(BUILD_CONFIG.SRC_DIR),
    out: resolvePath(BUILD_CONFIG.OUT_DIR),
    mainEntry: resolvePath(BUILD_CONFIG.MAIN_ENTRY),
    mainOutput: resolvePath(path.join(BUILD_CONFIG.OUT_DIR, 'extension.js')),
    packageJson: resolvePath('package.json'),
    tsConfig: resolvePath('tsconfig.json')
  };
}

module.exports = {
  BUILD_CONFIG,
  getBuildConfig,
  resolvePath,
  getFilePaths
};