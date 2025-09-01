import { TypeGuards } from '../../../shared/validation/TypeGuards';

describe('TypeGuards Integration', () => {
    describe('basic type guards', () => {
        it('should validate strings', () => {
            expect(TypeGuards.isString('hello')).toBe(true);
            expect(TypeGuards.isString(123)).toBe(false);
            expect(TypeGuards.isString(null)).toBe(false);
            expect(TypeGuards.isString(undefined)).toBe(false);
        });

        it('should validate numbers', () => {
            expect(TypeGuards.isNumber(123)).toBe(true);
            expect(TypeGuards.isNumber(0)).toBe(true);
            expect(TypeGuards.isNumber(-123)).toBe(true);
            expect(TypeGuards.isNumber(NaN)).toBe(false);
            expect(TypeGuards.isNumber('123')).toBe(false);
        });

        it('should validate booleans', () => {
            expect(TypeGuards.isBoolean(true)).toBe(true);
            expect(TypeGuards.isBoolean(false)).toBe(true);
            expect(TypeGuards.isBoolean(0)).toBe(false);
            expect(TypeGuards.isBoolean('true')).toBe(false);
        });

        it('should validate objects', () => {
            expect(TypeGuards.isObject({})).toBe(true);
            expect(TypeGuards.isObject({ key: 'value' })).toBe(true);
            expect(TypeGuards.isObject([])).toBe(false);
            expect(TypeGuards.isObject(null)).toBe(false);
            expect(TypeGuards.isObject('object')).toBe(false);
        });

        it('should validate arrays', () => {
            expect(TypeGuards.isArray([])).toBe(true);
            expect(TypeGuards.isArray([1, 2, 3])).toBe(true);
            expect(TypeGuards.isArray({})).toBe(false);
            expect(TypeGuards.isArray('array')).toBe(false);
        });
    });

    describe('specialized validators', () => {
        it('should validate agent names', () => {
            expect(TypeGuards.isValidAgentName('valid-agent')).toBe(true);
            expect(TypeGuards.isValidAgentName('agent_123')).toBe(true);
            expect(TypeGuards.isValidAgentName('invalid agent')).toBe(false);
            expect(TypeGuards.isValidAgentName('invalid@agent')).toBe(false);
            expect(TypeGuards.isValidAgentName('')).toBe(false);
        });

        it('should validate paths', () => {
            expect(TypeGuards.isValidPath('/valid/path')).toBe(true);
            expect(TypeGuards.isValidPath('relative/path')).toBe(true);
            expect(TypeGuards.isValidPath('file.txt')).toBe(true);
            expect(TypeGuards.isValidPath('')).toBe(false);
        });

        it('should validate URLs', () => {
            expect(TypeGuards.isValidUrl('https://example.com')).toBe(true);
            expect(TypeGuards.isValidUrl('http://localhost:3000')).toBe(true);
            expect(TypeGuards.isValidUrl('invalid-url')).toBe(false);
            expect(TypeGuards.isValidUrl('')).toBe(false);
        });

        it('should validate JSON strings', () => {
            expect(TypeGuards.isValidJsonString('{"key": "value"}')).toBe(true);
            expect(TypeGuards.isValidJsonString('[]')).toBe(true);
            expect(TypeGuards.isValidJsonString('"string"')).toBe(true);
            expect(TypeGuards.isValidJsonString('invalid json')).toBe(false);
            expect(TypeGuards.isValidJsonString('{"key": value}')).toBe(false);
        });
    });

    describe('property validators', () => {
        it('should check for properties', () => {
            const obj = { name: 'test', age: 25 };
            
            expect(TypeGuards.hasProperty(obj, 'name')).toBe(true);
            expect(TypeGuards.hasProperty(obj, 'age')).toBe(true);
            expect(TypeGuards.hasProperty(obj, 'missing')).toBe(false);
        });

        it('should check for string properties', () => {
            const obj = { name: 'test', age: 25 };
            
            expect(TypeGuards.hasStringProperty(obj, 'name')).toBe(true);
            expect(TypeGuards.hasStringProperty(obj, 'age')).toBe(false);
            expect(TypeGuards.hasStringProperty(obj, 'missing')).toBe(false);
        });

        it('should check for number properties', () => {
            const obj = { name: 'test', age: 25 };
            
            expect(TypeGuards.hasNumberProperty(obj, 'age')).toBe(true);
            expect(TypeGuards.hasNumberProperty(obj, 'name')).toBe(false);
            expect(TypeGuards.hasNumberProperty(obj, 'missing')).toBe(false);
        });
    });
});
