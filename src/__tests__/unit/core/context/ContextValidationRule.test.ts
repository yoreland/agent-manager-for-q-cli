import { BUILT_IN_VALIDATION_RULES } from '../../../../core/context/ContextValidationRule';

describe('ContextValidationRule', () => {
    describe('BUILT_IN_VALIDATION_RULES', () => {
        it('should have invalid characters rule', () => {
            const rule = BUILT_IN_VALIDATION_RULES.find(r => r.message.includes('invalid characters'));

            expect(rule).toBeDefined();
            expect(rule?.severity).toBe('error');
            expect(rule?.pattern.test('valid/path.ts')).toBe(true);
            expect(rule?.pattern.test('invalid<path.ts')).toBe(false);
            expect(rule?.pattern.test('invalid>path.ts')).toBe(false);
            expect(rule?.pattern.test('invalid:path.ts')).toBe(false);
            expect(rule?.pattern.test('invalid"path.ts')).toBe(false);
            expect(rule?.pattern.test('invalid|path.ts')).toBe(false);
            expect(rule?.pattern.test('invalid?path.ts')).toBe(false);
            expect(rule?.pattern.test('invalid*path.ts')).toBe(false);
        });

        it('should have path traversal rule', () => {
            const rule = BUILT_IN_VALIDATION_RULES.find(r => r.message.includes('Path traversal'));

            expect(rule).toBeDefined();
            expect(rule?.severity).toBe('error');
            expect(rule?.pattern.test('valid/path.ts')).toBe(true);
            expect(rule?.pattern.test('src/../etc/passwd')).toBe(false);
            expect(rule?.pattern.test('../config.json')).toBe(true); // Only matches /../ in middle
        });

        it('should have multiple slashes rule', () => {
            const rule = BUILT_IN_VALIDATION_RULES.find(r => r.message.includes('consecutive slashes'));

            expect(rule).toBeDefined();
            expect(rule?.severity).toBe('warning');
            expect(rule?.pattern.test('valid/path.ts')).toBe(true);
            expect(rule?.pattern.test('invalid//path.ts')).toBe(false);
            expect(rule?.pattern.test('invalid///path.ts')).toBe(false);
        });

        it('should have trailing whitespace rule', () => {
            const rule = BUILT_IN_VALIDATION_RULES.find(r => r.message.includes('whitespace'));

            expect(rule).toBeDefined();
            expect(rule?.severity).toBe('warning');
            expect(rule?.pattern.test('valid/path.ts')).toBe(true);
            expect(rule?.pattern.test('invalid/path.ts ')).toBe(false);
            expect(rule?.pattern.test('invalid/path.ts\t')).toBe(false);
        });

        it('should have all required properties', () => {
            BUILT_IN_VALIDATION_RULES.forEach(rule => {
                expect(rule.pattern).toBeInstanceOf(RegExp);
                expect(typeof rule.message).toBe('string');
                expect(rule.message.length).toBeGreaterThan(0);
                expect(['error', 'warning']).toContain(rule.severity);
            });
        });

        it('should have unique messages', () => {
            const messages = BUILT_IN_VALIDATION_RULES.map(r => r.message);
            const uniqueMessages = new Set(messages);

            expect(uniqueMessages.size).toBe(messages.length);
        });
    });
});
