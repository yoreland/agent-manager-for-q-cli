/**
 * Test utilities for consistent testing across the extension
 */

import * as vscode from 'vscode';
import * as sinon from 'sinon';
import { AgentConfig } from '../../types/agent';
import { ContextItem } from '../../types/context';

/**
 * Test data builders for creating consistent test fixtures
 */
export class TestDataBuilder {
    /**
     * Creates a valid agent configuration for testing
     */
    static createValidAgentConfig(overrides: Partial<AgentConfig> = {}): AgentConfig {
        return {
            $schema: 'https://json.schemastore.org/qcli-agent.json',
            name: 'test-agent',
            description: 'Test agent for unit testing',
            prompt: 'You are a helpful test assistant',
            tools: ['file_reader', 'web_search'],
            allowedTools: ['file_reader', 'web_search', 'code_editor'],
            resources: ['file://test/file.txt', 'file://test/directory/'],
            mcpServers: {},
            toolAliases: {},
            hooks: {},
            toolsSettings: {},
            useLegacyMcpJson: false,
            ...overrides
        };
    }

    /**
     * Creates an invalid agent configuration for testing error scenarios
     */
    static createInvalidAgentConfig(errors: string[] = ['missing name']): Partial<AgentConfig> {
        const config: Partial<AgentConfig> = {
            $schema: 'https://json.schemastore.org/qcli-agent.json',
            description: 'Invalid test agent'
        };

        if (errors.includes('missing name')) {
            delete config.name;
        }
        if (errors.includes('invalid tools')) {
            (config as any).tools = 'not-an-array';
        }
        if (errors.includes('invalid resources')) {
            (config as any).resources = ['invalid-path-without-prefix'];
        }

        return config;
    }

    /**
     * Creates a context item for testing
     */
    static createContextItem(overrides: Partial<ContextItem> = {}): ContextItem {
        return {
            label: 'test-file.txt',
            filePath: 'file://test/file.txt',
            contextValue: 'file',
            ...overrides
        };
    }

    /**
     * Creates multiple context items for testing
     */
    static createContextItems(count: number): ContextItem[] {
        return Array.from({ length: count }, (_, i) => 
            this.createContextItem({
                filePath: `file://test/file${i}.txt`,
                label: `test-file${i}.txt`
            })
        );
    }
}

/**
 * Mock factory for creating consistent VS Code API mocks
 */
export class MockFactory {
    /**
     * Creates a mock VS Code extension context
     */
    static createExtensionContext(): vscode.ExtensionContext {
        const mockContext = {
            subscriptions: [],
            workspaceState: {
                get: sinon.stub(),
                update: sinon.stub(),
                keys: sinon.stub().returns([])
            },
            globalState: {
                get: sinon.stub(),
                update: sinon.stub(),
                keys: sinon.stub().returns([]),
                setKeysForSync: sinon.stub()
            },
            extensionUri: vscode.Uri.file('/mock/extension/path'),
            extensionPath: '/mock/extension/path',
            asAbsolutePath: sinon.stub().callsFake((relativePath: string) => 
                `/mock/extension/path/${relativePath}`
            ),
            storageUri: vscode.Uri.file('/mock/storage'),
            storagePath: '/mock/storage/path',
            globalStorageUri: vscode.Uri.file('/mock/global/storage'),
            globalStoragePath: '/mock/global/storage/path',
            logUri: vscode.Uri.file('/mock/log'),
            logPath: '/mock/log/path',
            extensionMode: vscode.ExtensionMode.Test,
            environmentVariableCollection: {
                getScoped: sinon.stub(),
                replace: sinon.stub(),
                append: sinon.stub(),
                prepend: sinon.stub(),
                get: sinon.stub(),
                forEach: sinon.stub(),
                delete: sinon.stub(),
                clear: sinon.stub(),
                persistent: true
            },
            secrets: {} as vscode.SecretStorage,
            extension: {} as vscode.Extension<any>,
            languageModelAccessInformation: {} as any
        };
        
        return mockContext as unknown as vscode.ExtensionContext;
    }

    /**
     * Creates a mock logger for testing
     */
    static createLogger() {
        return {
            debug: sinon.stub(),
            info: sinon.stub(),
            warn: sinon.stub(),
            error: sinon.stub(),
            logUserAction: sinon.stub(),
            logLifecycle: sinon.stub(),
            logTiming: sinon.stub(),
            getLogLevel: sinon.stub(),
            setLogLevel: sinon.stub(),
            isDebugMode: sinon.stub(),
            setDebugMode: sinon.stub()
        };
    }

    /**
     * Creates a mock output channel for testing
     */
    static createOutputChannel(): vscode.OutputChannel {
        const mockChannel = {
            name: 'Test Output Channel',
            append: sinon.stub(),
            appendLine: sinon.stub(),
            clear: sinon.stub(),
            show: sinon.stub(),
            hide: sinon.stub(),
            dispose: sinon.stub(),
            replace: sinon.stub()
        };
        
        return mockChannel as unknown as vscode.OutputChannel;
    }

    /**
     * Creates a mock file system watcher
     */
    static createFileSystemWatcher(): vscode.FileSystemWatcher {
        return {
            ignoreCreateEvents: false,
            ignoreChangeEvents: false,
            ignoreDeleteEvents: false,
            onDidCreate: sinon.stub().returns({ dispose: sinon.stub() }),
            onDidChange: sinon.stub().returns({ dispose: sinon.stub() }),
            onDidDelete: sinon.stub().returns({ dispose: sinon.stub() }),
            dispose: sinon.stub()
        };
    }

    /**
     * Creates a mock tree data provider
     */
    static createTreeDataProvider() {
        return {
            onDidChangeTreeData: sinon.stub(),
            getTreeItem: sinon.stub(),
            getChildren: sinon.stub(),
            getParent: sinon.stub(),
            resolveTreeItem: sinon.stub()
        };
    }
}

/**
 * Performance testing utilities
 */
export class PerformanceTestUtils {
    /**
     * Measures execution time of a function
     */
    static async measureExecutionTime<T>(
        fn: () => Promise<T> | T,
        description?: string
    ): Promise<{ result: T; duration: number }> {
        const startTime = performance.now();
        const result = await fn();
        const endTime = performance.now();
        const duration = endTime - startTime;

        if (description) {
            console.log(`${description}: ${duration.toFixed(2)}ms`);
        }

        return { result, duration };
    }

    /**
     * Asserts that a function executes within a time limit
     */
    static async assertExecutionTime<T>(
        fn: () => Promise<T> | T,
        maxDurationMs: number,
        description?: string
    ): Promise<T> {
        const { result, duration } = await this.measureExecutionTime(fn, description);
        
        if (duration > maxDurationMs) {
            throw new Error(
                `${description || 'Function'} took ${duration.toFixed(2)}ms, ` +
                `which exceeds the limit of ${maxDurationMs}ms`
            );
        }

        return result;
    }

    /**
     * Creates a performance benchmark for repeated operations
     */
    static async benchmark<T>(
        fn: () => Promise<T> | T,
        iterations: number = 100,
        description?: string
    ): Promise<{ average: number; min: number; max: number; total: number }> {
        const durations: number[] = [];

        for (let i = 0; i < iterations; i++) {
            const { duration } = await this.measureExecutionTime(fn);
            durations.push(duration);
        }

        const total = durations.reduce((sum, d) => sum + d, 0);
        const average = total / iterations;
        const min = Math.min(...durations);
        const max = Math.max(...durations);

        if (description) {
            console.log(`${description} benchmark (${iterations} iterations):`);
            console.log(`  Average: ${average.toFixed(2)}ms`);
            console.log(`  Min: ${min.toFixed(2)}ms`);
            console.log(`  Max: ${max.toFixed(2)}ms`);
            console.log(`  Total: ${total.toFixed(2)}ms`);
        }

        return { average, min, max, total };
    }

    /**
     * Sleep utility for performance tests
     */
    static sleep(ms: number): Promise<void> {
        return AsyncTestUtils.sleep(ms);
    }
}

/**
 * Async test utilities
 */
export class AsyncTestUtils {
    /**
     * Waits for a condition to be true with timeout
     */
    static async waitFor(
        condition: () => boolean | Promise<boolean>,
        timeoutMs: number = 5000,
        intervalMs: number = 100
    ): Promise<void> {
        const startTime = Date.now();
        
        while (Date.now() - startTime < timeoutMs) {
            if (await condition()) {
                return;
            }
            await this.sleep(intervalMs);
        }
        
        throw new Error(`Condition not met within ${timeoutMs}ms`);
    }

    /**
     * Sleep utility for async tests
     */
    static sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Creates a deferred promise for testing async operations
     */
    static createDeferred<T>(): {
        promise: Promise<T>;
        resolve: (value: T) => void;
        reject: (reason?: any) => void;
    } {
        let resolve!: (value: T) => void;
        let reject!: (reason?: any) => void;
        
        const promise = new Promise<T>((res, rej) => {
            resolve = res;
            reject = rej;
        });

        return { promise, resolve, reject };
    }
}

/**
 * File system test utilities
 */
export class FileSystemTestUtils {
    /**
     * Creates a temporary file path for testing
     */
    static createTempFilePath(extension: string = '.json'): string {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(7);
        return `/tmp/test-${timestamp}-${random}${extension}`;
    }

    /**
     * Creates a mock file URI
     */
    static createMockFileUri(path: string): vscode.Uri {
        return vscode.Uri.file(path);
    }

    /**
     * Creates test file content
     */
    static createTestFileContent(type: 'agent' | 'json' | 'text', data?: any): string {
        switch (type) {
            case 'agent':
                return JSON.stringify(TestDataBuilder.createValidAgentConfig(data), null, 2);
            case 'json':
                return JSON.stringify(data || { test: true }, null, 2);
            case 'text':
                return data || 'Test file content';
            default:
                return 'Test content';
        }
    }
}