import { MemoryOptimizer } from '../../../shared/performance/MemoryOptimizer';
import { ILogger } from '../../../shared/infrastructure/ILogger';

describe('MemoryOptimizer Integration', () => {
    let optimizer: MemoryOptimizer;
    let mockLogger: jest.Mocked<ILogger>;
    let mockMemoryPressureHandler: jest.Mock;

    beforeEach(() => {
        mockLogger = {
            debug: jest.fn(),
            info: jest.fn(),
            warn: jest.fn(),
            error: jest.fn(),
            setLogLevel: jest.fn(),
            getLogLevel: jest.fn(),
            dispose: jest.fn()
        };

        mockMemoryPressureHandler = jest.fn().mockResolvedValue(undefined);
        optimizer = new MemoryOptimizer(mockLogger, mockMemoryPressureHandler);
    });

    afterEach(() => {
        optimizer.dispose();
    });

    describe('memory monitoring', () => {
        it('should start and stop monitoring', () => {
            optimizer.startMonitoring();
            expect(mockLogger.debug).toHaveBeenCalledWith('Memory monitoring started');

            optimizer.stopMonitoring();
            expect(mockLogger.debug).toHaveBeenCalledWith('Memory monitoring stopped');
        });

        it('should not start monitoring twice', () => {
            optimizer.startMonitoring();
            optimizer.startMonitoring(); // Should not start again

            expect(mockLogger.debug).toHaveBeenCalledTimes(1);
        });

        it('should not start monitoring when disposed', () => {
            optimizer.dispose();
            optimizer.startMonitoring();

            expect(mockLogger.debug).not.toHaveBeenCalledWith('Memory monitoring started');
        });
    });

    describe('memory usage tracking', () => {
        it('should get current memory usage', () => {
            const usage = optimizer.getMemoryUsage();

            expect(usage).toHaveProperty('heapUsed');
            expect(usage).toHaveProperty('heapTotal');
            expect(usage).toHaveProperty('external');
            expect(usage).toHaveProperty('rss');
            expect(usage).toHaveProperty('timestamp');

            expect(typeof usage.heapUsed).toBe('number');
            expect(typeof usage.heapTotal).toBe('number');
            expect(typeof usage.external).toBe('number');
            expect(typeof usage.rss).toBe('number');
            expect(typeof usage.timestamp).toBe('number');

            expect(usage.heapUsed).toBeGreaterThan(0);
            expect(usage.heapTotal).toBeGreaterThan(0);
            expect(usage.timestamp).toBeGreaterThan(0);
        });

        it('should track memory usage over time', async () => {
            const usage1 = optimizer.getMemoryUsage();
            
            // Wait a bit to ensure different timestamps
            await new Promise(resolve => setTimeout(resolve, 1));
            
            // Simulate some memory allocation
            new Array(1000).fill('test');
            
            const usage2 = optimizer.getMemoryUsage();

            expect(usage2.timestamp).toBeGreaterThan(usage1.timestamp);
            // Memory usage might increase, but this is not guaranteed in tests
        });
    });

    describe('garbage collection', () => {
        it('should attempt garbage collection', async () => {
            await optimizer.forceGarbageCollection();

            if (global.gc) {
                expect(mockLogger.debug).toHaveBeenCalledWith('Forced garbage collection');
            } else {
                expect(mockLogger.warn).toHaveBeenCalledWith('Garbage collection not available');
            }
        });
    });

    describe('disposal', () => {
        it('should dispose properly', () => {
            optimizer.startMonitoring();
            optimizer.dispose();

            expect(mockLogger.debug).toHaveBeenCalledWith('MemoryOptimizer disposed');
        });

        it('should handle multiple disposal calls', () => {
            optimizer.dispose();
            optimizer.dispose(); // Should not throw

            expect(mockLogger.debug).toHaveBeenCalledWith('MemoryOptimizer disposed');
        });
    });
});
