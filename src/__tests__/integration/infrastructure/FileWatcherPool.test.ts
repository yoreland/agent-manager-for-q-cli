import { FileWatcherPool } from '../../../infrastructure/FileWatcherPool';
import { IFileSystemAdapter, FileWatcher, FileEvent } from '../../../shared/infrastructure/IFileSystemAdapter';
import { ILogger } from '../../../shared/infrastructure/ILogger';
import { success } from '../../../shared/errors/result';

describe('FileWatcherPool Integration', () => {
    let pool: FileWatcherPool;
    let mockFileSystem: jest.Mocked<IFileSystemAdapter>;
    let mockLogger: jest.Mocked<ILogger>;

    beforeEach(() => {
        mockFileSystem = {
            readFile: jest.fn(),
            writeFile: jest.fn(),
            deleteFile: jest.fn(),
            exists: jest.fn(),
            ensureDirectory: jest.fn(),
            readDirectory: jest.fn(),
            watchFile: jest.fn(),
            watchDirectory: jest.fn()
        };

        mockLogger = {
            debug: jest.fn(),
            info: jest.fn(),
            warn: jest.fn(),
            error: jest.fn(),
            setLogLevel: jest.fn(),
            getLogLevel: jest.fn(),
            dispose: jest.fn()
        };

        pool = new FileWatcherPool(mockFileSystem, mockLogger);
    });

    afterEach(() => {
        pool.dispose();
    });

    describe('watchFile', () => {
        it('should create new watcher for first request', async () => {
            const mockWatcher: FileWatcher = { dispose: jest.fn() };
            mockFileSystem.watchFile.mockResolvedValue(success(mockWatcher));

            const callback = jest.fn();
            const result = await pool.watchFile('/test/file.txt', callback);

            expect(result.success).toBe(true);
            expect(mockFileSystem.watchFile).toHaveBeenCalledWith('/test/file.txt', expect.any(Function));
        });

        it('should reuse existing watcher for same path', async () => {
            const mockWatcher: FileWatcher = { dispose: jest.fn() };
            mockFileSystem.watchFile.mockResolvedValue(success(mockWatcher));

            const callback1 = jest.fn();
            const callback2 = jest.fn();

            const result1 = await pool.watchFile('/test/file.txt', callback1);
            const result2 = await pool.watchFile('/test/file.txt', callback2);

            expect(result1.success).toBe(true);
            expect(result2.success).toBe(true);
            expect(mockFileSystem.watchFile).toHaveBeenCalledTimes(1);
        });

        it('should notify all callbacks when event occurs', async () => {
            const mockWatcher: FileWatcher = { dispose: jest.fn() };
            let eventHandler: (event: FileEvent) => void = () => {};
            
            mockFileSystem.watchFile.mockImplementation(async (_path, handler) => {
                eventHandler = handler;
                return success(mockWatcher);
            });

            const callback1 = jest.fn();
            const callback2 = jest.fn();

            await pool.watchFile('/test/file.txt', callback1);
            await pool.watchFile('/test/file.txt', callback2);

            const event: FileEvent = {
                type: 'modified',
                path: '/test/file.txt',
                timestamp: new Date()
            };

            eventHandler(event);

            expect(callback1).toHaveBeenCalledWith(event);
            expect(callback2).toHaveBeenCalledWith(event);
        });

        it('should dispose watcher when all references are released', async () => {
            const mockWatcher: FileWatcher = { dispose: jest.fn() };
            mockFileSystem.watchFile.mockResolvedValue(success(mockWatcher));

            const callback1 = jest.fn();
            const callback2 = jest.fn();

            const result1 = await pool.watchFile('/test/file.txt', callback1);
            const result2 = await pool.watchFile('/test/file.txt', callback2);

            expect(result1.success).toBe(true);
            expect(result2.success).toBe(true);

            if (result1.success && result2.success) {
                // Release first reference
                result1.data.dispose();
                expect(mockWatcher.dispose).not.toHaveBeenCalled();

                // Release second reference
                result2.data.dispose();
                expect(mockWatcher.dispose).toHaveBeenCalled();
            }
        });
    });

    describe('watchDirectory', () => {
        it('should create directory watcher', async () => {
            const mockWatcher: FileWatcher = { dispose: jest.fn() };
            mockFileSystem.watchDirectory.mockResolvedValue(success(mockWatcher));

            const callback = jest.fn();
            const result = await pool.watchDirectory('/test/dir', callback);

            expect(result.success).toBe(true);
            expect(mockFileSystem.watchDirectory).toHaveBeenCalledWith('/test/dir', expect.any(Function));
        });
    });

    describe('dispose', () => {
        it('should dispose all watchers', async () => {
            const mockWatcher1: FileWatcher = { dispose: jest.fn() };
            const mockWatcher2: FileWatcher = { dispose: jest.fn() };
            
            mockFileSystem.watchFile.mockResolvedValueOnce(success(mockWatcher1));
            mockFileSystem.watchDirectory.mockResolvedValueOnce(success(mockWatcher2));

            await pool.watchFile('/test/file.txt', jest.fn());
            await pool.watchDirectory('/test/dir', jest.fn());

            pool.dispose();

            expect(mockWatcher1.dispose).toHaveBeenCalled();
            expect(mockWatcher2.dispose).toHaveBeenCalled();
        });
    });
});
