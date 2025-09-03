import { WizardValidationService } from '../services/wizardValidationService';
import { WizardStep } from '../types/wizard';

describe('WizardValidationService', () => {
    let validationService: WizardValidationService;

    beforeEach(() => {
        validationService = new WizardValidationService();
    });

    describe('Basic Properties Validation', () => {
        test('should validate required agent name', async () => {
            const result = await validationService.validateStep(WizardStep.BasicProperties, {
                basicProperties: { name: '', description: '', prompt: 'test prompt' }
            });
            
            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('Agent name is required');
        });

        test('should validate agent name characters', async () => {
            const result = await validationService.validateStep(WizardStep.BasicProperties, {
                basicProperties: { name: 'test<>agent', description: '', prompt: 'test prompt' }
            });
            
            expect(result.isValid).toBe(false);
            expect(result.errors.some(e => e.includes('invalid characters'))).toBe(true);
        });

        test('should pass valid basic properties', async () => {
            const result = await validationService.validateStep(WizardStep.BasicProperties, {
                basicProperties: { name: 'test-agent', description: 'Test description', prompt: 'You are a helpful assistant' }
            });
            
            expect(result.isValid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });
    });

    describe('Resources Validation', () => {
        test('should validate file:// prefix requirement', async () => {
            const result = await validationService.validateStep(WizardStep.Resources, {
                resources: { resources: ['invalid-path.txt'] }
            });
            
            expect(result.isValid).toBe(false);
            expect(result.errors.some(e => e.includes('must start with \'file://\''))).toBe(true);
        });

        test('should allow glob patterns with asterisks', async () => {
            const result = await validationService.validateStep(WizardStep.Resources, {
                resources: { resources: ['file://.amazonq/rules/**/*.md'] }
            });
            
            expect(result.isValid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });
    });
});
