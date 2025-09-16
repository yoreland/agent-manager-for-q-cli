/**
 * Performance benchmarks for file operations
 */

import { PerformanceTestUtils, TestDataBuilder } from '../utils/testUtils';

describe('File Operations Performance', () => {
    const FILE_READ_LIMIT_MS = 50; // Target: under 50ms for small files
    const FILE_WRITE_LIMIT_MS = 100; // Target: under 100ms for small files
    const BATCH_OPERATION_LIMIT_MS = 500; // Target: under 500ms for 10 files

    test('Agent config file reading should be fast', async () => {
        const testConfig = TestDataBuilder.createValidAgentConfig();
        const testContent = JSON.stringify(testConfig, null, 2);

        // Simulate file reading performance
        await PerformanceTestUtils.assertExecutionTime(
            async () => {
                // Simulate JSON parsing (the main bottleneck in file reading)
                const parsed = JSON.parse(testContent);
                return parsed.name === testConfig.name;
            },
            FILE_READ_LIMIT_MS,
            'Agent config parsing'
        );
    }, 3000);

    test('Agent config file writing should be fast', async () => {
        const testConfig = TestDataBuilder.createValidAgentConfig();

        // Simulate file writing performance
        await PerformanceTestUtils.assertExecutionTime(
            async () => {
                // Simulate JSON stringification (the main bottleneck in file writing)
                const content = JSON.stringify(testConfig, null, 2);
                return content.length > 0;
            },
            FILE_WRITE_LIMIT_MS,
            'Agent config serialization'
        );
    }, 3000);

    test('Batch file operations should be efficient', async () => {
        const configs = Array.from({ length: 10 }, (_, i) => 
            TestDataBuilder.createValidAgentConfig({ name: `test-agent-${i}` })
        );

        // Benchmark batch processing
        const benchmark = await PerformanceTestUtils.benchmark(
            async () => {
                // Simulate batch processing of multiple configs
                const results = configs.map(config => {
                    const content = JSON.stringify(config, null, 2);
                    const parsed = JSON.parse(content);
                    return parsed.name;
                });
                return results.length === configs.length;
            },
            5, // 5 iterations
            'Batch config processing'
        );

        expect(benchmark.average).toBeLessThan(BATCH_OPERATION_LIMIT_MS);
    }, 5000);

    test('Large config file handling should be reasonable', async () => {
        // Create a large config with many resources
        const largeConfig = TestDataBuilder.createValidAgentConfig({
            resources: Array.from({ length: 100 }, (_, i) => `file://test/file${i}.txt`),
            tools: Array.from({ length: 50 }, (_, i) => `tool_${i}`),
            description: 'A'.repeat(1000) // Large description
        });

        const largeContent = JSON.stringify(largeConfig, null, 2);
        console.log(`Large config size: ${(largeContent.length / 1024).toFixed(2)}KB`);

        // Should still be reasonably fast even for large configs
        await PerformanceTestUtils.assertExecutionTime(
            async () => {
                const parsed = JSON.parse(largeContent);
                return parsed.resources.length === 100;
            },
            200, // Allow more time for large files
            'Large config parsing'
        );
    }, 5000);

    test('File path validation should be fast', async () => {
        const testPaths = [
            'file://valid/path.txt',
            'file://another/valid/path.json',
            'invalid-path-without-prefix',
            'file://',
            'file://path/with/spaces in name.txt'
        ];

        // Benchmark path validation
        const benchmark = await PerformanceTestUtils.benchmark(
            () => {
                // Simulate path validation logic
                return testPaths.map(path => {
                    const isValid = path.startsWith('file://') && path.length > 7;
                    const hasValidExtension = /\.(txt|json|js|ts|md)$/.test(path);
                    return { path, isValid, hasValidExtension };
                });
            },
            100, // 100 iterations
            'Path validation'
        );

        // Path validation should be very fast
        expect(benchmark.average).toBeLessThan(5);
    }, 3000);

    test('Context item creation should be efficient', async () => {
        const testPaths = Array.from({ length: 50 }, (_, i) => 
            `file://test/directory/file${i}.txt`
        );

        // Benchmark context item creation
        const benchmark = await PerformanceTestUtils.benchmark(
            () => {
                return testPaths.map(filePath => 
                    TestDataBuilder.createContextItem({ filePath })
                );
            },
            20, // 20 iterations
            'Context item creation'
        );

        // Context item creation should be very fast
        expect(benchmark.average).toBeLessThan(10);
    }, 3000);

    test('Memory usage during file operations should be stable', async () => {
        const initialMemory = process.memoryUsage();

        // Perform multiple file operations
        for (let i = 0; i < 100; i++) {
            const config = TestDataBuilder.createValidAgentConfig({ name: `test-${i}` });
            const content = JSON.stringify(config, null, 2);
            const parsed = JSON.parse(content);
            
            // Ensure we're actually using the data
            expect(parsed.name).toBe(`test-${i}`);
        }

        // Force garbage collection if available
        if (global.gc) {
            global.gc();
        }

        await PerformanceTestUtils.sleep(100);

        const finalMemory = process.memoryUsage();
        const heapIncrease = (finalMemory.heapUsed - initialMemory.heapUsed) / (1024 * 1024);

        console.log(`Memory increase after 100 operations: ${heapIncrease.toFixed(2)}MB`);

        // Memory increase should be reasonable (under 5MB for 100 operations)
        expect(heapIncrease).toBeLessThan(5);
    }, 5000);
});