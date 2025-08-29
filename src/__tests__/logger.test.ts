/**
 * Unit tests for logger service
 */

import * as vscode from 'vscode';
import { ExtensionLogger } from '../services/logger';
import { LogLevel } from '../types/extension';

jest.mock('vscode');

describe('Logger Service Tests', () => {
  let mockOutputChannel: vscode.OutputChannel;
  let logger: ExtensionLogger;

  beforeEach(() => {
    mockOutputChannel = {
      appendLine: jest.fn(),
      show: jest.fn(),
      dispose: jest.fn(),
      name: 'Test Logger',
      append: jest.fn(),
      clear: jest.fn(),
      hide: jest.fn(),
      replace: jest.fn()
    };
    
    logger = new ExtensionLogger(mockOutputChannel, LogLevel.DEBUG, true);
  });

  test('should initialize with correct log level and debug mode', () => {
    expect(logger.getLogLevel()).toBe(LogLevel.DEBUG);
    expect(logger.isDebugMode()).toBe(true);
  });

  test('should update log level correctly', () => {
    logger.setLogLevel(LogLevel.ERROR);
    expect(logger.getLogLevel()).toBe(LogLevel.ERROR);
  });

  test('should update debug mode correctly', () => {
    logger.setDebugMode(false);
    expect(logger.isDebugMode()).toBe(false);
  });

  test('should log debug messages when debug level is enabled', () => {
    logger.debug('Debug message');
    expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(
      expect.stringContaining('[DEBUG]')
    );
    expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(
      expect.stringContaining('Debug message')
    );
  });

  test('should log info messages', () => {
    logger.info('Info message');
    expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(
      expect.stringContaining('[INFO]')
    );
    expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(
      expect.stringContaining('Info message')
    );
  });

  test('should log warning messages', () => {
    logger.warn('Warning message');
    expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(
      expect.stringContaining('[WARN]')
    );
    expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(
      expect.stringContaining('Warning message')
    );
  });

  test('should log error messages', () => {
    logger.error('Error message');
    expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(
      expect.stringContaining('[ERROR]')
    );
    expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(
      expect.stringContaining('Error message')
    );
  });

  test('should log error messages with error objects', () => {
    const testError = new Error('Test error');
    logger.error('Error message', testError);
    
    expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(
      expect.stringContaining('[ERROR]')
    );
    expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(
      expect.stringContaining('Error message')
    );
    expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(
      expect.stringContaining('Test error')
    );
  });

  test('should not log debug messages when log level is higher', () => {
    // Create a new logger with INFO level
    const infoLogger = new ExtensionLogger(mockOutputChannel, LogLevel.INFO, false);
    
    // Clear previous calls
    jest.clearAllMocks();
    
    infoLogger.debug('Debug message');
    
    // Should not have been called for debug message at INFO level
    expect(mockOutputChannel.appendLine).not.toHaveBeenCalled();
  });

  test('should log timing information', () => {
    const startTime = Date.now() - 100; // 100ms ago
    logger.logTiming('Test operation', startTime);
    
    expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(
      expect.stringContaining('Test operation')
    );
    expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(
      expect.stringContaining('ms')
    );
  });

  test('should log lifecycle events', () => {
    logger.logLifecycle('Extension activated', { version: '1.0.0' });
    
    expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(
      expect.stringContaining('Lifecycle: Extension activated')
    );
  });

  test('should log user actions', () => {
    logger.logUserAction('Command executed', { command: 'openContextManager' });
    
    expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(
      expect.stringContaining('User Action: Command executed')
    );
  });

  test('should show output channel on error when configured', () => {
    const loggerWithShowOnError = new ExtensionLogger(mockOutputChannel, LogLevel.DEBUG, true, true);
    
    loggerWithShowOnError.error('Error message');
    
    expect(mockOutputChannel.show).toHaveBeenCalled();
  });

  test('should not show output channel on error when not configured', () => {
    const loggerWithoutShowOnError = new ExtensionLogger(mockOutputChannel, LogLevel.DEBUG, true, false);
    
    loggerWithoutShowOnError.error('Error message');
    
    expect(mockOutputChannel.show).not.toHaveBeenCalled();
  });

  test('should handle cleanup correctly', () => {
    // Test that logger can be used without errors
    logger.info('Test cleanup');
    expect(mockOutputChannel.appendLine).toHaveBeenCalled();
  });
});