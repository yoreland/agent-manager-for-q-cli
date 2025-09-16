import { ContextItem, ContextType, ContextMetadata } from '../../../../core/context/ContextItem';

describe('ContextItem', () => {
    const mockMetadata: ContextMetadata = {
        size: 1024,
        lastModified: new Date('2023-01-01'),
        encoding: 'utf-8',
        description: 'Test file'
    };

    describe('constructor', () => {
        it('should create context item with valid properties', () => {
            const item = new ContextItem('src/test.ts', ContextType.FILE, mockMetadata);

            expect(item.path).toBe('src/test.ts');
            expect(item.type).toBe(ContextType.FILE);
            expect(item.metadata).toBe(mockMetadata);
        });

        it('should create context item without metadata', () => {
            const item = new ContextItem('src/test.ts', ContextType.FILE);

            expect(item.path).toBe('src/test.ts');
            expect(item.type).toBe(ContextType.FILE);
            expect(item.metadata).toBeUndefined();
        });
    });

    describe('validate', () => {
        it('should return valid for correct file item', () => {
            const item = new ContextItem('src/test.ts', ContextType.FILE);

            const result = item.validate();

            expect(result.isValid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        it('should return valid for correct directory item', () => {
            const item = new ContextItem('src/', ContextType.DIRECTORY);

            const result = item.validate();

            expect(result.isValid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        it('should return valid for correct glob pattern', () => {
            const item = new ContextItem('src/**/*.ts', ContextType.GLOB_PATTERN);

            const result = item.validate();

            expect(result.isValid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        it('should return invalid for empty path', () => {
            const item = new ContextItem('', ContextType.FILE);

            const result = item.validate();

            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('Context path is required');
        });

        it('should return invalid for file with wildcards', () => {
            const item = new ContextItem('src/*.ts', ContextType.FILE);

            const result = item.validate();

            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('Invalid file path format');
        });

        it('should return invalid for glob without wildcards', () => {
            const item = new ContextItem('src/test.ts', ContextType.GLOB_PATTERN);

            const result = item.validate();

            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('Invalid glob pattern format');
        });
    });

    describe('withMetadata', () => {
        it('should return new item with updated metadata', () => {
            const item = new ContextItem('src/test.ts', ContextType.FILE, mockMetadata);
            const newMetadata = { description: 'Updated description' };

            const updatedItem = item.withMetadata(newMetadata);

            expect(updatedItem).not.toBe(item);
            expect(updatedItem.metadata?.description).toBe('Updated description');
            expect(updatedItem.metadata?.size).toBe(mockMetadata.size); // Should merge
            expect(updatedItem.path).toBe(item.path);
            expect(updatedItem.type).toBe(item.type);
        });
    });

    describe('create', () => {
        it('should create valid context item', () => {
            const result = ContextItem.create('src/test.ts', ContextType.FILE, mockMetadata);

            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data.path).toBe('src/test.ts');
                expect(result.data.type).toBe(ContextType.FILE);
                expect(result.data.metadata).toBe(mockMetadata);
            }
        });

        it('should fail for empty path', () => {
            const result = ContextItem.create('', ContextType.FILE);

            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error.message).toBe('Context path is required');
            }
        });

        it('should fail for invalid item', () => {
            const result = ContextItem.create('src/*.ts', ContextType.FILE);

            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error.message).toContain('Invalid context item');
            }
        });
    });
});
