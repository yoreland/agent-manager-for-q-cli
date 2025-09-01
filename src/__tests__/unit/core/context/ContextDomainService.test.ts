import { ContextDomainService } from '../../../../core/context/ContextDomainService';
import { IContextRepository } from '../../../../core/context/IContextRepository';
import { ContextItem, ContextType } from '../../../../core/context/ContextItem';
import { ContextValidationRule } from '../../../../core/context/ContextValidationRule';
import { success } from '../../../../shared/errors/result';

describe('ContextDomainService', () => {
    let service: ContextDomainService;
    let mockRepository: jest.Mocked<IContextRepository>;

    beforeEach(() => {
        mockRepository = {
            getContextItems: jest.fn(),
            addContextItem: jest.fn(),
            removeContextItem: jest.fn(),
            clearContext: jest.fn(),
            hasContextItem: jest.fn()
        };
        service = new ContextDomainService(mockRepository);
    });

    describe('addContextItem', () => {
        it('should add context item successfully', async () => {
            mockRepository.hasContextItem.mockResolvedValue(success(false));
            mockRepository.addContextItem.mockResolvedValue(success(undefined));

            const result = await service.addContextItem('test-agent', 'src/test.ts', ContextType.FILE);

            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data.path).toBe('src/test.ts');
                expect(result.data.type).toBe(ContextType.FILE);
            }
            expect(mockRepository.addContextItem).toHaveBeenCalled();
        });

        it('should fail if item already exists', async () => {
            mockRepository.hasContextItem.mockResolvedValue(success(true));

            const result = await service.addContextItem('test-agent', 'src/test.ts', ContextType.FILE);

            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error.message).toBe("Context item 'src/test.ts' already exists");
            }
        });

        it('should fail for invalid agent name', async () => {
            const result = await service.addContextItem('', 'src/test.ts', ContextType.FILE);

            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error.message).toBe('Agent name is required');
            }
        });

        it('should fail for invalid path', async () => {
            const result = await service.addContextItem('test-agent', '', ContextType.FILE);

            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error.message).toContain('Context path is required');
            }
        });

        it('should apply validation rules', async () => {
            const rule: ContextValidationRule = {
                pattern: /^src\//,
                message: 'Path must start with src/',
                severity: 'error'
            };
            service.addValidationRule(rule);
            mockRepository.hasContextItem.mockResolvedValue(success(false));

            const result = await service.addContextItem('test-agent', 'lib/test.ts', ContextType.FILE);

            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error.message).toBe('Path must start with src/');
            }
        });
    });

    describe('removeContextItem', () => {
        it('should remove context item successfully', async () => {
            mockRepository.hasContextItem.mockResolvedValue(success(true));
            mockRepository.removeContextItem.mockResolvedValue(success(undefined));

            const result = await service.removeContextItem('test-agent', 'src/test.ts');

            expect(result.success).toBe(true);
            expect(mockRepository.removeContextItem).toHaveBeenCalledWith('test-agent', 'src/test.ts');
        });

        it('should fail if item not found', async () => {
            mockRepository.hasContextItem.mockResolvedValue(success(false));

            const result = await service.removeContextItem('test-agent', 'nonexistent.ts');

            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error.message).toBe("Context item 'nonexistent.ts' not found");
            }
        });
    });

    describe('getContextItems', () => {
        it('should get context items successfully', async () => {
            const mockItems = [
                new ContextItem('src/test.ts', ContextType.FILE),
                new ContextItem('src/', ContextType.DIRECTORY)
            ];
            mockRepository.getContextItems.mockResolvedValue(success(mockItems));

            const result = await service.getContextItems('test-agent');

            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data).toEqual(mockItems);
            }
        });

        it('should fail for invalid agent name', async () => {
            const result = await service.getContextItems('');

            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error.message).toBe('Agent name is required');
            }
        });
    });

    describe('clearContext', () => {
        it('should clear context successfully', async () => {
            mockRepository.clearContext.mockResolvedValue(success(undefined));

            const result = await service.clearContext('test-agent');

            expect(result.success).toBe(true);
            expect(mockRepository.clearContext).toHaveBeenCalledWith('test-agent');
        });
    });

    describe('validateContextPath', () => {
        it('should validate correct file path', () => {
            const result = service.validateContextPath('src/test.ts', ContextType.FILE);

            expect(result.success).toBe(true);
        });

        it('should validate correct directory path', () => {
            const result = service.validateContextPath('src/', ContextType.DIRECTORY);

            expect(result.success).toBe(true);
        });

        it('should reject empty path', () => {
            const result = service.validateContextPath('', ContextType.FILE);

            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error.message).toBe('Context path is required');
            }
        });

        it('should reject long path', () => {
            const longPath = 'a'.repeat(501);
            const result = service.validateContextPath(longPath, ContextType.FILE);

            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error.message).toBe('Context path must be 500 characters or less');
            }
        });

        it('should reject file path with wildcards', () => {
            const result = service.validateContextPath('src/*.ts', ContextType.FILE);

            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error.message).toBe('File paths cannot contain wildcards');
            }
        });

        it('should reject directory path without trailing slash', () => {
            const result = service.validateContextPath('src', ContextType.DIRECTORY);

            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error.message).toBe('Directory paths should end with /');
            }
        });
    });
});
