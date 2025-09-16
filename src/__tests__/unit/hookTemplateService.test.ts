import { HookTemplateService } from '../../services/hookTemplateService';

describe('HookTemplateService', () => {
    let service: HookTemplateService;

    beforeEach(() => {
        service = new HookTemplateService();
    });

    describe('getTemplates', () => {
        it('should return predefined templates', () => {
            const templates = service.getTemplates();
            
            expect(templates).toHaveLength(3);
            expect(templates.map(t => t.id)).toEqual(['git-status', 'project-info', 'current-branch']);
        });

        it('should return templates with correct properties', () => {
            const templates = service.getTemplates();
            
            templates.forEach(template => {
                expect(template).toHaveProperty('id');
                expect(template).toHaveProperty('name');
                expect(template).toHaveProperty('description');
                expect(template).toHaveProperty('trigger');
                expect(template).toHaveProperty('command');
                expect(template).toHaveProperty('category');
                expect(template).toHaveProperty('isReadOnly');
                expect(template).toHaveProperty('securityLevel');
            });
        });
    });

    describe('getTemplateById', () => {
        it('should return template by id', () => {
            const template = service.getTemplateById('git-status');
            
            expect(template).toBeDefined();
            expect(template?.id).toBe('git-status');
            expect(template?.name).toBe('Git 상태 확인');
            expect(template?.trigger).toBe('userPromptSubmit');
        });

        it('should return undefined for non-existent id', () => {
            const template = service.getTemplateById('non-existent');
            
            expect(template).toBeUndefined();
        });
    });

    describe('getTemplatesByCategory', () => {
        it('should return git templates', () => {
            const gitTemplates = service.getTemplatesByCategory('git');
            
            expect(gitTemplates).toHaveLength(2);
            expect(gitTemplates.map(t => t.id)).toEqual(['git-status', 'current-branch']);
        });

        it('should return project templates', () => {
            const projectTemplates = service.getTemplatesByCategory('project');
            
            expect(projectTemplates).toHaveLength(1);
            expect(projectTemplates[0].id).toBe('project-info');
        });

        it('should return empty array for non-existent category', () => {
            const templates = service.getTemplatesByCategory('non-existent');
            
            expect(templates).toHaveLength(0);
        });
    });
});
