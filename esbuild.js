const esbuild = require("esbuild");
const path = require("path");

const production = process.argv.includes('--production');
const watch = process.argv.includes('--watch');

/**
 * @type {import('esbuild').Plugin}
 */
const esbuildProblemMatcherPlugin = {
	name: 'esbuild-problem-matcher',

	setup(build) {
		build.onStart(() => {
			console.log('[watch] build started');
		});
		build.onEnd((result) => {
			result.errors.forEach(({ text, location }) => {
				console.error(`✘ [ERROR] ${text}`);
				console.error(`    ${location.file}:${location.line}:${location.column}:`);
			});
			console.log(`[${production ? 'production' : 'development'}] build finished`);
		});
	},
};

/**
 * Build configuration for VS Code Extension
 * Supports both development and production builds
 */
async function main() {
	const baseConfig = {
		entryPoints: [
			'src/extension.ts'
		],
		bundle: true,
		format: 'cjs',
		platform: 'node',
		outfile: 'out/extension.js',
		external: ['vscode'],
		logLevel: 'silent',
		plugins: [
			esbuildProblemMatcherPlugin,
		],
		// Node.js target for VS Code extensions
		target: 'node18',
		// Ensure proper module resolution
		mainFields: ['module', 'main'],
		// Define environment variables
		define: {
			'process.env.NODE_ENV': production ? '"production"' : '"development"'
		}
	};

	// Production-specific configuration
	if (production) {
		Object.assign(baseConfig, {
			minify: true,
			sourcemap: false,
			sourcesContent: false,
			// Tree shaking for smaller bundle size
			treeShaking: true,
			// Drop console logs in production
			drop: ['console', 'debugger'],
			// Optimize for size and performance
			metafile: true,
			// Additional optimizations for VS Code extensions
			splitting: false, // VS Code extensions don't support code splitting
			chunkNames: '[name]-[hash]',
			// Optimize imports
			resolveExtensions: ['.ts', '.js'],
			// Bundle analyzer for optimization insights (removed - not supported in context mode)
		});
	} else {
		// Development-specific configuration
		Object.assign(baseConfig, {
			minify: false,
			sourcemap: true,
			sourcesContent: true,
			// Keep console logs for debugging
			keepNames: true
		});
	}

	console.log(`Building extension in ${production ? 'production' : 'development'} mode...`);
	
	const ctx = await esbuild.context(baseConfig);
	
	if (watch) {
		console.log('Watching for changes...');
		await ctx.watch();
	} else {
		await ctx.rebuild();
		
		if (production && baseConfig.metafile) {
			// Output bundle analysis in production
			const result = await ctx.rebuild();
			if (result.metafile) {
				const analysis = await esbuild.analyzeMetafile(result.metafile);
				console.log('\nBundle analysis:');
				console.log(analysis);
			}
		}
		
		await ctx.dispose();
	}
}

main().catch(e => {
	console.error('Build failed:', e);
	process.exit(1);
});
