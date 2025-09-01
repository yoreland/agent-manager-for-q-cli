/**
 * Tests for test utilities to verify the testing framework is working
 */

import { TestDataBuilder, MockFactory, PerformanceTestUtils, AsyncTestUtils } from '../utils/testUtils';

describe('Test Utils', () => {
    describe('TestDataBuilder', () => {
        test('should create valid agent config', () => {
            const config = TestDataBuilder.createValidAgentConfig();
            
            expect(config.name).toBe('test-agent');
            expect(config.description).toBe('Test agent for unit testing');
            expect(config.tools).toEqual(['file_reader', 'web_search']);
            expect(config.resources).toEqual(['file://test/file.txt', 'file://test/directory/']);
        });

        test('should create agent config with overrides', () => {
            const config = TestDataBuilder.createValidAgentConfig({
                name: 'custom-agent',
                tools: ['custom_tool']
            });
            
            expect(config.name).toBe('custom-agent');
            expect(config.tools).toEqual(['custom_tool']);
            expect(config.description).toBe('Test agent for unit testing'); // Should keep default
        });

        test('should create invalid agent config', () => {
            const config = TestDataBuilder.createInvalidAgentConfig(['missing name']);
            
            expect(config.name).toBeUndefined();
            expect(config.description).toBe('Invalid test agent');
        });

        test('should create context item', () => {
            const item = TestDataBuilder.createContextItem();
            
            expect(item.filePath).toBe('file://test/file.txt');
            expect(item.contextValue).toBe('file');
            expect(item.label).toBe('test-file.txt');
        });

        test('should create multiple context items', () => {
            const items = TestDataBuilder.createContextItems(3);
            
            expect(items).toHaveLength(3);
            expect(items[0]?.filePath).toBe('file://test/file0.txt');
            expect(items[1]?.filePath).toBe('file://test/file1.txt');
            expect(items[2]?.filePath).toBe('file://test/file2.txt');
        });
    });

    describe('MockFactory', () => {
        test('should create extension context', () => {
            const context = MockFactory.createExtensionContext();
            
            expect(context.subscriptions).toEqual([]);
            expect(context.extensionPath).toBe('/mock/extension/path');
            expect(typeof context.asAbsolutePath).toBe('function');
        });

        test('should create logger', () => {
            const logger = MockFactory.createLogger();
            
            expect(typeof logger.debug).toBe('function');
            expect(typeof logger.info).toBe('function');
            expect(typeof logger.warn).toBe('function');
            expect(typeof logger.error).toBe('function');
        });

        test('should create output channel', () => {
            const channel = MockFactory.createOutputChannel();
            
            expect(channel.name).toBe('Test Output Channel');
            expect(typeof channel.appendLine).toBe('function');
            expect(typeof channel.show).toBe('function');
        });
    });

    describe('PerformanceTestUtils', () => {
        test('should measure execution time', async () => {
            const result = await PerformanceTestUtils.measureExecutionTime(() => {
                return 'test result';
            });
            
            expect(result.result).toBe('test result');
            expect(result.duration).toBeGreaterThanOrEqual(0);
        });

        test('should assert execution time', async () => {
            const result = await PerformanceTestUtils.assertExecutionTime(
                () => 'fast operation',
                1000 // 1 second limit
            );
            
            expect(result).toBe('fast operation');
        });

        test('should fail assertion for slow operations', async () => {
            await expect(
                PerformanceTestUtils.assertExecutionTime(
                    async () => {
                        await new Promise(resolve => setTimeout(resolve, 100));
                        return 'slow operation';
                    },
                    50 // 50ms limit
                )
            ).rejects.toThrow();
        });

        test('should run benchmark', async () => {
            const benchmark = await PerformanceTestUtils.benchmark(
                () => Math.random(),
                5 // 5 iterations
            );
            
            expect(benchmark.average).toBeGreaterThanOrEqual(0);
            expect(benchmark.min).toBeGreaterThanOrEqual(0);
            expect(benchmark.max).toBeGreaterThanOrEqual(0);
            expect(benchmark.total).toBeGreaterThanOrEqual(0);
        });
    });

    describe('AsyncTestUtils', () => {
        test('should wait for condition', async () => {
            let counter = 0;
            const condition = () => {
                counter++;
                return counter >= 3;
            };
            
            await AsyncTestUtils.waitFor(condition, 1000, 10);
            expect(counter).toBeGreaterThanOrEqual(3);
        });

        test('should timeout when condition not met', async () => {
            const condition = () => false;
            
            await expect(
                AsyncTestUtils.waitFor(condition, 100, 10)
            ).rejects.toThrow('Condition not met within 100ms');
        });

        test('should sleep for specified time', async () => {
            const start = Date.now();
            await AsyncTestUtils.sleep(50);
            const end = Date.now();
            
            expect(end - start).toBeGreaterThanOrEqual(45); // Allow some variance
        });

        test('should create deferred promise', async () => {
            const deferred = AsyncTestUtils.createDeferred<string>();
            
            setTimeout(() => deferred.resolve('resolved'), 10);
            
            const result = await deferred.promise;
            expect(result).toBe('resolved');
        });
    });
});