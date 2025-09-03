import { ExperimentalToolsService } from '../../core/agent/ExperimentalToolsService';

describe('ExperimentalToolsService', () => {
    let service: ExperimentalToolsService;

    beforeEach(() => {
        service = new ExperimentalToolsService();
    });

    describe('getExperimentalTools', () => {
        it('should return all experimental tools', () => {
            const tools = service.getExperimentalTools();
            
            expect(tools).toHaveLength(3);
            expect(tools.map(t => t.name)).toEqual(['knowledge', 'thinking', 'todo_list']);
            
            tools.forEach(tool => {
                expect(tool.isExperimental).toBe(true);
                expect(tool).toHaveProperty('displayName');
                expect(tool).toHaveProperty('description');
                expect(tool).toHaveProperty('warningLevel');
                expect(tool).toHaveProperty('stabilityNote');
                expect(tool).toHaveProperty('features');
            });
        });

        it('should return a copy of the tools array', () => {
            const tools1 = service.getExperimentalTools();
            const tools2 = service.getExperimentalTools();
            
            expect(tools1).not.toBe(tools2);
            expect(tools1).toEqual(tools2);
        });
    });

    describe('isExperimentalTool', () => {
        it('should return true for experimental tools', () => {
            expect(service.isExperimentalTool('knowledge')).toBe(true);
            expect(service.isExperimentalTool('thinking')).toBe(true);
            expect(service.isExperimentalTool('todo_list')).toBe(true);
        });

        it('should return false for non-experimental tools', () => {
            expect(service.isExperimentalTool('fs_read')).toBe(false);
            expect(service.isExperimentalTool('fs_write')).toBe(false);
            expect(service.isExperimentalTool('execute_bash')).toBe(false);
            expect(service.isExperimentalTool('nonexistent')).toBe(false);
        });

        it('should be case sensitive', () => {
            expect(service.isExperimentalTool('Knowledge')).toBe(false);
            expect(service.isExperimentalTool('THINKING')).toBe(false);
        });
    });

    describe('getExperimentalToolInfo', () => {
        it('should return tool info for existing experimental tools', () => {
            const knowledgeTool = service.getExperimentalToolInfo('knowledge');
            
            expect(knowledgeTool).not.toBeNull();
            expect(knowledgeTool?.name).toBe('knowledge');
            expect(knowledgeTool?.displayName).toBe('Knowledge Base');
            expect(knowledgeTool?.isExperimental).toBe(true);
            expect(knowledgeTool?.warningLevel).toBe('warning');
            expect(knowledgeTool?.features).toContain('Semantic search capabilities');
        });

        it('should return null for non-experimental tools', () => {
            expect(service.getExperimentalToolInfo('fs_read')).toBeNull();
            expect(service.getExperimentalToolInfo('nonexistent')).toBeNull();
        });

        it('should return correct info for thinking tool', () => {
            const thinkingTool = service.getExperimentalToolInfo('thinking');
            
            expect(thinkingTool?.name).toBe('thinking');
            expect(thinkingTool?.displayName).toBe('Thinking Process');
            expect(thinkingTool?.warningLevel).toBe('info');
            expect(thinkingTool?.features).toContain('Step-by-step reasoning display');
        });

        it('should return correct info for todo_list tool', () => {
            const todoTool = service.getExperimentalToolInfo('todo_list');
            
            expect(todoTool?.name).toBe('todo_list');
            expect(todoTool?.displayName).toBe('TODO List Manager');
            expect(todoTool?.warningLevel).toBe('caution');
            expect(todoTool?.features).toContain('Multi-step task tracking');
            expect(todoTool?.usage).toContain('create - Create new TODO list');
        });
    });

    describe('getWarningMessage', () => {
        it('should return consistent warning message', () => {
            const message = service.getWarningMessage();
            
            expect(message).toContain('Experimental features');
            expect(message).toContain('active development');
            expect(message).toContain('may change or be removed');
            expect(message).toContain('production workflows');
        });

        it('should return the same message on multiple calls', () => {
            const message1 = service.getWarningMessage();
            const message2 = service.getWarningMessage();
            
            expect(message1).toBe(message2);
        });
    });

    describe('experimental tools data integrity', () => {
        it('should have valid warning levels', () => {
            const tools = service.getExperimentalTools();
            const validLevels = ['info', 'warning', 'caution'];
            
            tools.forEach(tool => {
                expect(validLevels).toContain(tool.warningLevel);
            });
        });

        it('should have non-empty features arrays', () => {
            const tools = service.getExperimentalTools();
            
            tools.forEach(tool => {
                expect(Array.isArray(tool.features)).toBe(true);
                expect(tool.features.length).toBeGreaterThan(0);
                tool.features.forEach(feature => {
                    expect(typeof feature).toBe('string');
                    expect(feature.length).toBeGreaterThan(0);
                });
            });
        });

        it('should have valid usage arrays when present', () => {
            const tools = service.getExperimentalTools();
            
            tools.forEach(tool => {
                if (tool.usage) {
                    expect(Array.isArray(tool.usage)).toBe(true);
                    tool.usage.forEach(usage => {
                        expect(typeof usage).toBe('string');
                        expect(usage.length).toBeGreaterThan(0);
                    });
                }
            });
        });

        it('should have required string properties', () => {
            const tools = service.getExperimentalTools();
            
            tools.forEach(tool => {
                expect(typeof tool.name).toBe('string');
                expect(tool.name.length).toBeGreaterThan(0);
                
                expect(typeof tool.displayName).toBe('string');
                expect(tool.displayName.length).toBeGreaterThan(0);
                
                expect(typeof tool.description).toBe('string');
                expect(tool.description.length).toBeGreaterThan(0);
                
                expect(typeof tool.stabilityNote).toBe('string');
                expect(tool.stabilityNote.length).toBeGreaterThan(0);
            });
        });
    });
});
