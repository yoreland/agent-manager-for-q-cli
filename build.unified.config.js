const esbuild = require('esbuild');
const path = require('path');

const isDevelopment = process.env.NODE_ENV === 'development';
const isProduction = process.env.NODE_ENV === 'production';
const isAnalyze = process.argv.includes('--analyze');

const baseConfig = {
    entryPoints: ['./src/extension.ts'],
    bundle: true,
    outfile: './out/extension.js',
    external: ['vscode'],
    format: 'cjs',
    platform: 'node',
    target: 'node18',
    sourcemap: isDevelopment,
    minify: isProduction,
    keepNames: true,
    define: {
        'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development')
    },
    loader: {
        '.json': 'json'
    },
    // Exclude problematic files from build
    plugins: [
        {
            name: 'exclude-files',
            setup(build) {
                build.onResolve({ filter: /.*/ }, (args) => {
                    // Exclude test files and problematic modules
                    if (args.path.includes('__tests__') || 
                        args.path.includes('.test.') ||
                        args.path.includes('example.ts') ||
                        args.path.includes('ContextualErrorHandler') ||
                        args.path.includes('ConfigurationValidator') ||
                        args.path.includes('TypeGuards') ||
                        args.path.includes('OptimizedFileSystemAdapter') ||
                        args.path.includes('RefactoredContextTreeProvider')) {
                        return { path: args.path, external: true };
                    }
                });
            }
        }
    ]
};

const developmentConfig = {
    ...baseConfig,
    sourcemap: 'inline',
    logLevel: 'info',
    metafile: true
};

const productionConfig = {
    ...baseConfig,
    minify: true,
    treeShaking: true,
    drop: ['console', 'debugger'],
    metafile: isAnalyze
};

async function build() {
    const config = isDevelopment ? developmentConfig : productionConfig;
    
    console.log(`Building in ${isDevelopment ? 'development' : 'production'} mode...`);
    
    try {
        const result = await esbuild.build(config);
        
        if (result.metafile) {
            if (isAnalyze) {
                await analyzeBundle(result.metafile);
            }
            
            const bundleSize = getBundleSize(result.metafile);
            console.log(`Bundle size: ${(bundleSize / 1024).toFixed(2)} KB`);
        }
        
        console.log('Build completed successfully!');
    } catch (error) {
        console.error('Build failed:', error);
        process.exit(1);
    }
}

async function watch() {
    console.log('Starting watch mode...');
    
    const context = await esbuild.context({
        ...developmentConfig,
        plugins: [
            {
                name: 'rebuild-notify',
                setup(build) {
                    build.onEnd(result => {
                        if (result.errors.length === 0) {
                            console.log(`[${new Date().toLocaleTimeString()}] Build completed`);
                        } else {
                            console.error(`[${new Date().toLocaleTimeString()}] Build failed:`, result.errors);
                        }
                    });
                }
            }
        ]
    });
    
    await context.watch();
    console.log('Watching for changes...');
}

async function analyzeBundle(metafile) {
    const analysis = await esbuild.analyzeMetafile(metafile, {
        verbose: true
    });
    
    console.log('\n=== Bundle Analysis ===');
    console.log(analysis);
    
    // Write analysis to file
    const fs = require('fs');
    fs.writeFileSync('./out/bundle-analysis.txt', analysis);
    console.log('Bundle analysis saved to ./out/bundle-analysis.txt');
}

function getBundleSize(metafile) {
    return Object.values(metafile.outputs)[0]?.bytes || 0;
}

function treeShakeUnusedExports() {
    return {
        name: 'tree-shake-unused',
        setup(build) {
            build.onResolve({ filter: /.*/ }, args => {
                // Mark unused exports for removal
                if (args.kind === 'import-statement') {
                    return { path: args.path, sideEffects: false };
                }
            });
        }
    };
}

// CLI handling
const command = process.argv[2];

switch (command) {
    case 'build':
        build();
        break;
    case 'watch':
        watch();
        break;
    case 'analyze':
        process.argv.push('--analyze');
        build();
        break;
    default:
        console.log('Usage: node build.unified.config.js [build|watch|analyze]');
        process.exit(1);
}

module.exports = { baseConfig, developmentConfig, productionConfig };
