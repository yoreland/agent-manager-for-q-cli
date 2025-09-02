# Build System Documentation

This document describes the build system for the Agent Manager for Q CLI VS Code Extension.

## Build Configuration

The build system uses ESBuild for fast compilation and bundling, with separate configurations for development and production environments.

### Key Files

- `esbuild.js` - Main build configuration
- `build.config.js` - Build constants and utilities
- `scripts/package.js` - Packaging script for VSIX creation
- `scripts/dev.js` - Development utilities
- `.vscodeignore` - Files to exclude from VSIX package

## Available Scripts

### Development Scripts

```bash
# Development build (single run)
npm run compile:dev
npm run dev:build

# Development build with watch mode
npm run watch
npm run dev:watch

# Type checking only
npm run check-types

# Linting
npm run lint
npm run lint:fix
```

### Production Scripts

```bash
# Production build
npm run compile:prod
npm run package

# Create VSIX package
npm run package:vsix
npm run vsce:package

# Publish to marketplace
npm run vsce:publish
```

### Utility Scripts

```bash
# Clean build output
npm run clean
npm run dev:clean

# Full rebuild
npm run rebuild

# Run tests
npm run test
npm run dev:test
```

## Build Modes

### Development Mode

- Source maps enabled for debugging
- No minification for readable output
- Console logs preserved
- Fast incremental builds
- Type checking in watch mode

**Characteristics:**
- Sourcemap: `true`
- Minify: `false`
- Drop console: `false`
- Target: Node.js 18

### Production Mode

- Minified output for smaller bundle size
- Source maps disabled
- Console logs removed
- Tree shaking enabled
- Bundle analysis available

**Characteristics:**
- Sourcemap: `false`
- Minify: `true`
- Drop console: `true`
- Tree shaking: `true`
- Target: Node.js 18

## Packaging

The extension follows VS Code Extension packaging standards:

### Included in VSIX
- Compiled JavaScript (`out/extension.js`)
- Package manifest (`package.json`)
- README and documentation
- License files

### Excluded from VSIX
- Source TypeScript files (`src/**`)
- Development configuration files
- Node modules
- Build scripts
- Test files

### Creating a VSIX Package

```bash
# Full build and package
npm run package:vsix

# Package without rebuilding
npm run package:vsix:skip-build

# Using vsce directly
npm run vsce:package
```

## Performance Optimizations

### Development
- Fast incremental builds with ESBuild
- Parallel type checking and building
- Watch mode for automatic rebuilds

### Production
- Bundle minification
- Tree shaking for smaller output
- Dead code elimination
- Console log removal

## Troubleshooting

### Common Issues

1. **Build fails with type errors**
   ```bash
   npm run check-types
   ```

2. **Linting errors**
   ```bash
   npm run lint:fix
   ```

3. **Clean build needed**
   ```bash
   npm run clean && npm run rebuild
   ```

4. **VSIX packaging fails**
   - Check that all required fields are in `package.json`
   - Ensure `out/extension.js` exists
   - Verify `.vscodeignore` is properly configured

### Build Environment Requirements

- Node.js 18+
- npm 8+
- TypeScript 5.9+
- ESBuild 0.25+

## Extension Development

### Testing the Extension

1. Build the extension:
   ```bash
   npm run compile:dev
   ```

2. Open VS Code Extension Development Host:
   - Press `F5` in VS Code
   - Or use "Run Extension" from Run and Debug panel

3. Test in watch mode:
   ```bash
   npm run dev:watch
   ```

### Debugging

- Source maps are enabled in development mode
- Use VS Code debugger with Extension Development Host
- Console logs available in development builds
- Output channel: "Q CLI Agent Manager"

## Continuous Integration

The build system is designed to work with CI/CD pipelines:

```bash
# CI build script
npm ci
npm run check-types
npm run lint
npm run package
npm run test
```

For automated publishing:

```bash
# Publish to marketplace
npm run vsce:publish
```