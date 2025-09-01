import { Result } from '../errors/result';

export interface IFileSystemAdapter {
    readFile(path: string): Promise<Result<string>>;
    writeFile(path: string, content: string): Promise<Result<void>>;
    deleteFile(path: string): Promise<Result<void>>;
    exists(path: string): Promise<Result<boolean>>;
    ensureDirectory(path: string): Promise<Result<void>>;
    readDirectory(path: string): Promise<Result<string[]>>;
    watchFile(path: string, callback: (event: FileEvent) => void): Promise<Result<FileWatcher>>;
    watchDirectory(path: string, callback: (event: FileEvent) => void): Promise<Result<FileWatcher>>;
}

export interface FileEvent {
    type: 'created' | 'modified' | 'deleted';
    path: string;
    timestamp: Date;
}

export interface FileWatcher {
    dispose(): void;
}

export interface FileStats {
    size: number;
    mtime: Date;
    isFile: boolean;
    isDirectory: boolean;
}
