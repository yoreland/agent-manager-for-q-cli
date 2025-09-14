import { Result, success, failure } from '../../shared/errors/result';

export class ContextItem {
    constructor(
        public readonly path: string,
        public readonly type: ContextType,
        public readonly metadata?: ContextMetadata
    ) {}

    validate(): ValidationResult {
        const errors: string[] = [];

        if (!this.path || this.path.trim().length === 0) {
            errors.push('Context path is required');
        }

        if (this.type === ContextType.FILE && !this.isValidFilePath(this.path)) {
            errors.push('Invalid file path format');
        }

        if (this.type === ContextType.GLOB_PATTERN && !this.isValidGlobPattern(this.path)) {
            errors.push('Invalid glob pattern format');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    withMetadata(metadata: ContextMetadata): ContextItem {
        return new ContextItem(this.path, this.type, { ...this.metadata, ...metadata });
    }

    static create(path: string, type: ContextType, metadata?: ContextMetadata): Result<ContextItem> {
        if (!path || path.trim().length === 0) {
            return failure(new Error('Context path is required'));
        }

        const item = new ContextItem(path, type, metadata);
        const validation = item.validate();
        
        if (!validation.isValid) {
            return failure(new Error(`Invalid context item: ${validation.errors.join(', ')}`));
        }

        return success(item);
    }

    private isValidFilePath(path: string): boolean {
        // Basic file path validation
        return !path.includes('*') && !path.includes('?') && path.length > 0;
    }

    private isValidGlobPattern(path: string): boolean {
        // Basic glob pattern validation
        return path.includes('*') || path.includes('?') || path.includes('[');
    }
}

export enum ContextType {
    FILE = 'file',
    DIRECTORY = 'directory',
    GLOB_PATTERN = 'glob'
}

export interface ContextMetadata {
    readonly size?: number;
    readonly lastModified?: Date;
    readonly encoding?: string;
    readonly description?: string;
}

export interface ValidationResult {
    isValid: boolean;
    errors: string[];
}
