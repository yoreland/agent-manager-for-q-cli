import { EnhancedLogger } from '../../../shared/infrastructure/EnhancedLogger';
import { LogLevel } from '../../../shared/infrastructure/ILogger';

// Mock VS Code
const mockOutputChannel = {
    appendLine: jest.fn(),
    dispose: jest.fn()
} as any;

jest.mock('vscode', () => ({
    window: {
        createOutputChannel: jest.fn(() => mockOutputChannel)
    }
}));

describe('EnhancedLogger', () => {
    let logger: EnhancedLogger;

    beforeEach(() => {
        jest.clearAllMocks();
        logger = new EnhancedLogger(mockOutputChannel, LogLevel.DEBUG);
    });

    afterEach(() => {
        logger.dispose();
    });

    it('should log debug messages when log level is DEBUG', () => {
        logger.debug('Test debug message', { key: 'value' });
        
        expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(
            expect.stringContaining('DEBUG: Test debug message')
        );
    });

    it('should not log debug messages when log level is INFO', () => {
        logger.setLogLevel(LogLevel.INFO);
        logger.debug('Test debug message');
        
        expect(mockOutputChannel.appendLine).not.toHaveBeenCalled();
    });

    it('should log error messages with stack trace', () => {
        const error = new Error('Test error');
        logger.error('Test error message', error);
        
        expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(
            expect.stringContaining('ERROR: Test error message')
        );
        expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(
            expect.stringContaining('Error: Test error')
        );
    });

    it('should format metadata correctly', () => {
        const metadata = { userId: 123, action: 'test' };
        logger.info('Test message', metadata);
        
        expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(
            expect.stringContaining('{"userId":123,"action":"test"}')
        );
    });

    it('should dispose properly', () => {
        logger.dispose();
        
        expect(mockOutputChannel.dispose).toHaveBeenCalled();
        
        // Should not log after disposal
        logger.info('Should not log');
        expect(mockOutputChannel.appendLine).not.toHaveBeenCalled();
    });
});
