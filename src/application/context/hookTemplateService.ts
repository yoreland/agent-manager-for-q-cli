import { HookTemplate } from '../../shared/types/context';

export class HookTemplateService {
    private readonly predefinedTemplates: HookTemplate[];
    
    constructor() {
        this.predefinedTemplates = this.initializePredefinedTemplates();
    }
    
    getTemplates(): HookTemplate[] {
        return this.predefinedTemplates;
    }
    
    getTemplateById(id: string): HookTemplate | undefined {
        return this.predefinedTemplates.find(t => t.id === id);
    }
    
    getTemplatesByCategory(category: string): HookTemplate[] {
        return this.predefinedTemplates.filter(t => t.category === category);
    }
    
    private initializePredefinedTemplates(): HookTemplate[] {
        return [
            {
                id: 'git-status',
                name: 'Git 상태 확인',
                description: '각 프롬프트마다 현재 Git 상태를 표시합니다',
                trigger: 'userPromptSubmit',
                command: 'git status --short',
                category: 'git',
                isReadOnly: true,
                securityLevel: 'safe'
            },
            {
                id: 'project-info',
                name: '프로젝트 정보',
                description: '대화 시작 시 프로젝트 이름과 기본 정보를 표시합니다',
                trigger: 'agentSpawn',
                command: 'echo "Project: $(basename $(pwd)) | Language: $(find . -name "*.json" -o -name "*.js" -o -name "*.ts" -o -name "*.py" | head -1 | sed \'s/.*\\.//\')"',
                category: 'project',
                isReadOnly: true,
                securityLevel: 'safe'
            },
            {
                id: 'current-branch',
                name: '현재 브랜치 정보',
                description: '대화 시작 시 현재 Git 브랜치를 표시합니다',
                trigger: 'agentSpawn',
                command: 'git branch --show-current',
                category: 'git',
                isReadOnly: true,
                securityLevel: 'safe'
            }
        ];
    }
}
