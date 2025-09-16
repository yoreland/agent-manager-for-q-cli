import { CachedFileSystemAdapter } from '../../../shared/infrastructure/CachedFileSystemAdapter';
import { MemoryCache } from '../../../shared/infrastructure/MemoryCache';
import { EnhancedLogger } from '../../../shared/infrastructure/EnhancedLogger';
import { LogLevel } from '../../../shared/infrastructure/ILogger';
import * as fs from 'fs/promises';

// Mock fs
jest.mock('fs/promises');
const mockFs = fs as jest.Mocked<typeof fs>;

// Mock VS Code
const mockOutputChannel = {
    appendLine: jest.fn(),
    dispose: jest.fn()
} as any;

const mockFileSystemWatcher = {
    onDidCreate: jest.fn(),
    onDidChange: jest.fn(),
    onDidDelete: jest.fn(),
    dispose: jest.fn()
} as any;

jest.mock('vscode', () => ({
    workspace: {
        createFileSystemWatcher: jest.fn(() => mockFileSystemWatcher)
    }
}));

describe('CachedFileSystemAdapter', () => {
    let adapter: CachedFileSystemAdapter;
    let cache: MemoryCache;
    let logger: EnhancedLogger;

    beforeEach(() => {
        jest.clearAllMocks();
        cache = new MemoryCache();
        logger = new EnhancedLogger(mockOutputChannel, LogLevel.DEBUG);
        adapter = new CachedFileSystemAdapter(cache, logger);
    });

    afterEach(() => {
        adapter.dispose();
        cache.dispose();
        logger.dispose();
    });

    describe('readFile', () => {
        it('should read file from disk and cache it', async () => {
            const content = 'file content';
            mockFs.readFile.mockResolvedValue(content);

            const result = await adapter.readFile('/test/file.txt');

            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data).toBe(content);
            }
            expect(mockFs.readFile).toHaveBeenCalledWith('/test/file.txt', 'utf-8');
        });

        it('should return cached content on second read', async () => {
            const content = 'file content';
            mockFs.readFile.mockResolvedValue(content);

            // First read
            await adapter.readFile('/test/file.txt');
            
            // Second read should use cache
            const result = await adapter.readFile('/test/file.txt');

            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data).toBe(content);
            }
            expect(mockFs.readFile).toHaveBeenCalledTimes(1);
        });

        it('should handle file read errors', async () => {
            const error = new Error('File not found');
            mockFs.readFile.mockRejectedValue(error);

            const result = await adapter.readFile('/test/nonexistent.txt');

            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error).toBe(error);
            }
        });
    });

    describe('writeFile', () => {
        it('should write file and update cache', async () => {
            const content = 'new content';
            mockFs.writeFile.mockResolvedValue();

            const result = await adapter.writeFile('/test/file.txt', content);

            expect(result.success).toBe(true);
            expect(mockFs.writeFile).toHaveBeenCalledWith('/test/file.txt', content, 'utf-8');
        });

        it('should handle write errors', async () => {
            const error = new Error('Permission denied');
            mockFs.writeFile.mockRejectedValue(error);

            const result = await adapter.writeFile('/test/file.txt', 'content');

            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error).toBe(error);
            }
        });
    });

    describe('exists', () => {
        it('should return true for existing files', async () => {
            mockFs.access.mockResolvedValue();

            const result = await adapter.exists('/test/file.txt');

            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data).toBe(true);
            }
        });

        it('should return false for non-existing files', async () => {
            mockFs.access.mockRejectedValue(new Error('File not found'));

            const result = await adapter.exists('/test/nonexistent.txt');

            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data).toBe(false);
            }
        });
    });

    it('should not operate after disposal', async () => {
        adapter.dispose();

        const result = await adapter.readFile('/test/file.txt');

        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error.message).toBe('FileSystemAdapter is disposed');
        }
    });
});
