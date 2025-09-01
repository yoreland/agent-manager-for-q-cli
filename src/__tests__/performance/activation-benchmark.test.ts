/**
 * Performance benchmarks for extension activation
 */

import * as vscode from 'vscode';
import { PerformanceTestUtils } from '../utils/testUtils';

describe('Extension Activation Performance', () => {
    const ACTIVATION_TIME_LIMIT_MS = 100; // Target: under 100ms
    const COMMAND_REGISTRATION_LIMIT_MS = 50; // Target: under 50ms

    test('Extension activation should complete under 100ms', async () => {
        const extension = vscode.extensions.getExtension('qcli-context-manager.context-manager-for-q-cli');
        expect(extension).toBeTruthy();
        
        if (!extension) return;

        // Measure activation time
        const activationTime = await PerformanceTestUtils.assertExecutionTime(
            async () => {
                if (!extension.isActive) {
                    await extension.activate();
                }
                return extension.isActive;
            },
            ACTIVATION_TIME_LIMIT_MS,
            'Extension activation'
        );

        expect(activationTime).toBe(true);
    }, 5000);

    test('Command registration should be fast', async () => {
        const extension = vscode.extensions.getExtension('qcli-context-manager.context-manager-for-q-cli');
        expect(extension).toBeTruthy();
        
        if (!extension) return;

        if (!extension.isActive) {
            await extension.activate();
        }

        // Measure command registration time
        await PerformanceTestUtils.assertExecutionTime(
            async () => {
                const commands = await vscode.commands.getCommands(true);
                const extensionCommands = commands.filter(cmd => 
                    cmd.startsWith('qcli-context.') || cmd.startsWith('qcli-agents.')
                );
                return extensionCommands.length > 0;
            },
            COMMAND_REGISTRATION_LIMIT_MS,
            'Command registration check'
        );
    }, 3000);

    test('Memory usage should be reasonable after activation', async () => {
        const extension = vscode.extensions.getExtension('qcli-context-manager.context-manager-for-q-cli');
        expect(extension).toBeTruthy();
        
        if (!extension) return;

        // Get initial memory usage
        const initialMemory = process.memoryUsage();

        // Activate extension
        if (!extension.isActive) {
            await extension.activate();
        }

        // Wait a bit for memory to stabilize
        await PerformanceTestUtils.sleep(1000);

        // Get memory usage after activation
        const afterActivationMemory = process.memoryUsage();

        // Calculate memory increase
        const heapUsedIncrease = afterActivationMemory.heapUsed - initialMemory.heapUsed;
        const heapUsedIncreaseMB = heapUsedIncrease / (1024 * 1024);

        console.log(`Memory increase after activation: ${heapUsedIncreaseMB.toFixed(2)}MB`);

        // Assert reasonable memory usage (should be under 10MB for a simple extension)
        expect(heapUsedIncreaseMB).toBeLessThan(10);
    }, 5000);

    test('Repeated activations should be consistent', async () => {
        const extension = vscode.extensions.getExtension('qcli-context-manager.context-manager-for-q-cli');
        expect(extension).toBeTruthy();
        
        if (!extension) return;

        // Benchmark multiple activation checks
        const benchmark = await PerformanceTestUtils.benchmark(
            async () => {
                if (!extension.isActive) {
                    await extension.activate();
                }
                return extension.isActive;
            },
            10, // 10 iterations
            'Repeated activation checks'
        );

        // Assert that average time is reasonable
        expect(benchmark.average).toBeLessThan(ACTIVATION_TIME_LIMIT_MS);

        // Assert that there's not too much variance (max shouldn't be more than 10x average for mocked tests)
        expect(benchmark.max).toBeLessThan(benchmark.average * 10);
    }, 10000);

    test('Extension should handle concurrent activation attempts', async () => {
        const extension = vscode.extensions.getExtension('qcli-context-manager.context-manager-for-q-cli');
        expect(extension).toBeTruthy();
        
        if (!extension) return;

        // Create multiple concurrent activation attempts
        const activationPromises = Array.from({ length: 5 }, () => 
            PerformanceTestUtils.measureExecutionTime(async () => {
                if (!extension.isActive) {
                    await extension.activate();
                }
                return extension.isActive;
            })
        );

        const results = await Promise.all(activationPromises);

        // All should succeed
        results.forEach((result) => {
            expect(result.result).toBe(true);
            expect(result.duration).toBeLessThan(ACTIVATION_TIME_LIMIT_MS * 2);
        });
    }, 5000);
});