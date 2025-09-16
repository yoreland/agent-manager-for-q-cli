import { BUILT_IN_TEMPLATES } from '../../../../core/agent/AgentTemplate';

describe('AgentTemplate', () => {
    describe('BUILT_IN_TEMPLATES', () => {
        it('should have basic template', () => {
            const basicTemplate = BUILT_IN_TEMPLATES.find(t => t.name === 'basic');

            expect(basicTemplate).toBeDefined();
            expect(basicTemplate?.description).toBe('Basic agent template');
            expect(basicTemplate?.tools).toEqual(['filesystem', 'terminal']);
            expect(basicTemplate?.allowedTools).toEqual(['filesystem', 'terminal']);
        });

        it('should have developer template', () => {
            const devTemplate = BUILT_IN_TEMPLATES.find(t => t.name === 'developer');

            expect(devTemplate).toBeDefined();
            expect(devTemplate?.description).toBe('Developer-focused agent template');
            expect(devTemplate?.tools).toEqual(['filesystem', 'terminal', 'git', 'npm']);
            expect(devTemplate?.resources).toEqual(['src/**/*', 'package.json', 'README.md']);
        });

        it('should have documentation template', () => {
            const docTemplate = BUILT_IN_TEMPLATES.find(t => t.name === 'documentation');

            expect(docTemplate).toBeDefined();
            expect(docTemplate?.description).toBe('Documentation writing agent template');
            expect(docTemplate?.tools).toEqual(['filesystem']);
            expect(docTemplate?.resources).toEqual(['docs/**/*', '*.md', 'README.md']);
        });

        it('should have all required properties', () => {
            BUILT_IN_TEMPLATES.forEach(template => {
                expect(template.name).toBeDefined();
                expect(typeof template.name).toBe('string');
                expect(template.name.length).toBeGreaterThan(0);
            });
        });

        it('should have unique names', () => {
            const names = BUILT_IN_TEMPLATES.map(t => t.name);
            const uniqueNames = new Set(names);

            expect(uniqueNames.size).toBe(names.length);
        });
    });
});
