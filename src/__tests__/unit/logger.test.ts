import * as vscode from 'vscode';
import { ExtensionLogger } from '../../services/logger';
import { LogLevel } from '../../types/extension';

describe('Logger Test Suite', () => {
    let outputChannel: vscode.OutputChannel;
    let logger: ExtensionLogger;

    beforeEach(() => {
        outputChannel = vscode.window.createOutputChannel('Test Logger');
        logger = new ExtensionLogger(outputChannel, LogLevel.DEBUG, true);
    });

    afterEach(() => {
        outputChannel.dispose();
    });

    test('Logger should initialize with correct log level', () => {
        expect(logger.getLogLevel()).toBe(LogLevel.DEBUG);
        expect(logger.isDebugMode()).toBe(true);
    });

    test('Logger should update log level correctly', () => {
        logger.setLogLevel(LogLevel.ERROR);
        expect(logger.getLogLevel()).toBe(LogLevel.ERROR);
    });

    test('Logger should update debug mode correctly', () => {
        logger.setDebugMode(false);
        expect(logger.isDebugMode()).toBe(false);
    });

    test('Logger should log messages without throwing errors', () => {
        expect(() => {
            logger.debug('Debug message');
            logger.info('Info message');
            logger.warn('Warning message');
            logger.error('Error message');
        }).not.toThrow();
    });

    test('Logger should handle timing logs correctly', () => {
        const startTime = Date.now();
        expect(() => {
            logger.logTiming('Test operation', startTime);
        }).not.toThrow();
    });

    test('Logger should handle lifecycle logs correctly', () => {
        expect(() => {
            logger.logLifecycle('Test lifecycle event', { detail: 'test' });
        }).not.toThrow();
    });

    test('Logger should handle user action logs correctly', () => {
        expect(() => {
            logger.logUserAction('Test user action', { context: 'test' });
        }).not.toThrow();
    });

    test('Logger should handle error objects correctly', () => {
        const testError = new Error('Test error');
        expect(() => {
            logger.error('Test error message', testError);
        }).not.toThrow();
    });
});