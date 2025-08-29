import * as assert from 'assert';
import * as vscode from 'vscode';
import { ExtensionLogger } from '../services/logger';
import { LogLevel } from '../types/extension';

suite('Logger Test Suite', () => {
    let outputChannel: vscode.OutputChannel;
    let logger: ExtensionLogger;

    setup(() => {
        outputChannel = vscode.window.createOutputChannel('Test Logger');
        logger = new ExtensionLogger(outputChannel, LogLevel.DEBUG, true);
    });

    teardown(() => {
        outputChannel.dispose();
    });

    test('Logger should initialize with correct log level', () => {
        assert.strictEqual(logger.getLogLevel(), LogLevel.DEBUG);
        assert.strictEqual(logger.isDebugMode(), true);
    });

    test('Logger should update log level correctly', () => {
        logger.setLogLevel(LogLevel.ERROR);
        assert.strictEqual(logger.getLogLevel(), LogLevel.ERROR);
    });

    test('Logger should update debug mode correctly', () => {
        logger.setDebugMode(false);
        assert.strictEqual(logger.isDebugMode(), false);
    });

    test('Logger should log messages without throwing errors', () => {
        assert.doesNotThrow(() => {
            logger.debug('Debug message');
            logger.info('Info message');
            logger.warn('Warning message');
            logger.error('Error message');
        });
    });

    test('Logger should handle timing logs correctly', () => {
        const startTime = Date.now();
        assert.doesNotThrow(() => {
            logger.logTiming('Test operation', startTime);
        });
    });

    test('Logger should handle lifecycle logs correctly', () => {
        assert.doesNotThrow(() => {
            logger.logLifecycle('Test lifecycle event', { detail: 'test' });
        });
    });

    test('Logger should handle user action logs correctly', () => {
        assert.doesNotThrow(() => {
            logger.logUserAction('Test user action', { context: 'test' });
        });
    });

    test('Logger should handle error objects correctly', () => {
        const testError = new Error('Test error');
        assert.doesNotThrow(() => {
            logger.error('Test error message', testError);
        });
    });
});