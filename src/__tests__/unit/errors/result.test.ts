import { ResultBuilder, ResultUtils } from '../../../shared/errors/result';

describe('Result Pattern', () => {
    describe('ResultBuilder', () => {
        describe('success', () => {
            it('should create a successful result with data', () => {
                const data = { value: 42 };
                const result = ResultBuilder.success(data);

                expect(result.success).toBe(true);
                if (result.success) {
                    expect(result.data).toEqual(data);
                }
            });

            it('should handle null and undefined data', () => {
                const nullResult = ResultBuilder.success(null);
                const undefinedResult = ResultBuilder.success(undefined);

                expect(nullResult.success).toBe(true);
                expect(undefinedResult.success).toBe(true);
                
                if (nullResult.success) {
                    expect(nullResult.data).toBeNull();
                }
                if (undefinedResult.success) {
                    expect(undefinedResult.data).toBeUndefined();
                }
            });
        });

        describe('failure', () => {
            it('should create a failed result with error', () => {
                const error = new Error('Test error');
                const result = ResultBuilder.failure(error);

                expect(result.success).toBe(false);
                if (!result.success) {
                    expect(result.error).toBe(error);
                }
            });

            it('should create a failed result with custom error type', () => {
                const customError = { code: 'CUSTOM_ERROR', message: 'Custom error' };
                const result = ResultBuilder.failure(customError);

                expect(result.success).toBe(false);
                if (!result.success) {
                    expect(result.error).toEqual(customError);
                }
            });
        });

        describe('fromError', () => {
            it('should create a failed result from Error instance', () => {
                const error = new Error('Test error');
                const result = ResultBuilder.fromError(error);

                expect(result.success).toBe(false);
                if (!result.success) {
                    expect(result.error).toBe(error);
                }
            });
        });

        describe('fromMessage', () => {
            it('should create a failed result from error message', () => {
                const message = 'Test error message';
                const result = ResultBuilder.fromMessage(message);

                expect(result.success).toBe(false);
                if (!result.success) {
                    expect(result.error.message).toBe(message);
                    expect(result.error).toBeInstanceOf(Error);
                }
            });
        });
    });

    describe('ResultUtils', () => {
        describe('map', () => {
            it('should map successful result to new value', () => {
                const result = ResultBuilder.success(5);
                const mapped = ResultUtils.map(result, x => x * 2);

                expect(mapped.success).toBe(true);
                if (mapped.success) {
                    expect(mapped.data).toBe(10);
                }
            });

            it('should not map failed result', () => {
                const error = new Error('Test error');
                const result = ResultBuilder.failure(error);
                const mapped = ResultUtils.map(result, x => x * 2);

                expect(mapped.success).toBe(false);
                if (!mapped.success) {
                    expect(mapped.error).toBe(error);
                }
            });
        });

        describe('flatMap', () => {
            it('should chain successful results', () => {
                const result = ResultBuilder.success(5);
                const chained = ResultUtils.flatMap(result, x => ResultBuilder.success(x * 2));

                expect(chained.success).toBe(true);
                if (chained.success) {
                    expect(chained.data).toBe(10);
                }
            });

            it('should not chain failed results', () => {
                const error = new Error('Test error');
                const result = ResultBuilder.failure(error);
                const chained = ResultUtils.flatMap(result, x => ResultBuilder.success(x * 2));

                expect(chained.success).toBe(false);
                if (!chained.success) {
                    expect(chained.error).toBe(error);
                }
            });

            it('should handle failure in mapper function', () => {
                const result = ResultBuilder.success(5);
                const error = new Error('Mapper error');
                const chained = ResultUtils.flatMap(result, _ => ResultBuilder.failure(error));

                expect(chained.success).toBe(false);
                if (!chained.success) {
                    expect(chained.error).toBe(error);
                }
            });
        });

        describe('combine', () => {
            it('should combine multiple successful results', () => {
                const result1 = ResultBuilder.success(1);
                const result2 = ResultBuilder.success(2);
                const result3 = ResultBuilder.success(3);
                
                const combined = ResultUtils.combine(result1, result2, result3);

                expect(combined.success).toBe(true);
                if (combined.success) {
                    expect(combined.data).toEqual([1, 2, 3]);
                }
            });

            it('should fail if any result fails', () => {
                const result1 = ResultBuilder.success(1);
                const error = new Error('Test error');
                const result2 = ResultBuilder.failure(error);
                const result3 = ResultBuilder.success(3);
                
                const combined = ResultUtils.combine(result1, result2, result3);

                expect(combined.success).toBe(false);
                if (!combined.success) {
                    expect(combined.error).toBe(error);
                }
            });

            it('should handle empty array', () => {
                const combined = ResultUtils.combine();

                expect(combined.success).toBe(true);
                if (combined.success) {
                    expect(combined.data).toEqual([]);
                }
            });
        });

        describe('unwrap', () => {
            it('should extract value from successful result', () => {
                const result = ResultBuilder.success(42);
                const value = ResultUtils.unwrap(result);

                expect(value).toBe(42);
            });

            it('should throw error from failed result', () => {
                const error = new Error('Test error');
                const result = ResultBuilder.failure(error);

                expect(() => ResultUtils.unwrap(result)).toThrow(error);
            });
        });

        describe('unwrapOr', () => {
            it('should extract value from successful result', () => {
                const result = ResultBuilder.success(42);
                const value = ResultUtils.unwrapOr(result, 0);

                expect(value).toBe(42);
            });

            it('should return default value from failed result', () => {
                const error = new Error('Test error');
                const result = ResultBuilder.failure(error);
                const value = ResultUtils.unwrapOr(result, 0);

                expect(value).toBe(0);
            });
        });
    });
});