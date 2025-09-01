import * as fs from 'fs';
import * as path from 'path';

describe('Split View Integration Tests', () => {
    let packageJson: any;

    beforeAll(() => {
        const packageJsonPath = path.join(__dirname, '../../package.json');
        const packageJsonContent = fs.readFileSync(packageJsonPath, 'utf8');
        packageJson = JSON.parse(packageJsonContent);
    });

    describe('Package.json Configuration', () => {
        test('should have both agent and context tree views defined', () => {
            expect(packageJson.contributes.views['qcli-context']).toBeDefined();
            expect(packageJson.contributes.views['qcli-context']).toHaveLength(2);
            
            const views = packageJson.contributes.views['qcli-context'];
            const agentView = views.find((v: any) => v.id === 'qcli-agents-tree');
            const contextView = views.find((v: any) => v.id === 'qcli-context-tree');
            
            expect(agentView).toBeDefined();
            expect(agentView.name).toBe('Q CLI Agents');
            
            expect(contextView).toBeDefined();
            expect(contextView.name).toBe('Context Files');
        });

        test('should have agent management commands defined', () => {
            const commands = packageJson.contributes.commands;
            
            const refreshAgentCommand = commands.find((c: any) => c.command === 'qcli-agents.refreshTree');
            const createAgentCommand = commands.find((c: any) => c.command === 'qcli-agents.createAgent');
            
            expect(refreshAgentCommand).toBeDefined();
            expect(refreshAgentCommand.title).toBe('새로고침');
            expect(refreshAgentCommand.icon).toBe('$(refresh)');
            
            expect(createAgentCommand).toBeDefined();
            expect(createAgentCommand.title).toBe('Create New Agent');
            expect(createAgentCommand.icon).toBe('$(add)');
        });

        test('should have proper menu configuration for both views', () => {
            const menus = packageJson.contributes.menus['view/title'];
            
            const agentRefreshMenu = menus.find((m: any) => 
                m.command === 'qcli-agents.refreshTree' && m.when === 'view == qcli-agents-tree'
            );
            const agentCreateMenu = menus.find((m: any) => 
                m.command === 'qcli-agents.createAgent' && m.when === 'view == qcli-agents-tree'
            );
            const contextRefreshMenu = menus.find((m: any) => 
                m.command === 'qcli-context.refreshTree' && m.when === 'view == qcli-context-tree'
            );
            
            expect(agentRefreshMenu).toBeDefined();
            expect(agentCreateMenu).toBeDefined();
            expect(contextRefreshMenu).toBeDefined();
        });

        test('should maintain existing view container structure', () => {
            expect(packageJson.contributes.viewsContainers.activitybar).toBeDefined();
            expect(packageJson.contributes.viewsContainers.activitybar).toHaveLength(1);
            
            const container = packageJson.contributes.viewsContainers.activitybar[0];
            expect(container.id).toBe('qcli-context');
            expect(container.title).toBe('Q CLI Context Manager');
            expect(container.icon).toBe('$(symbol-class)');
        });
    });

    describe('View Ordering', () => {
        test('should have agent view before context view', () => {
            const views = packageJson.contributes.views['qcli-context'];
            
            expect(views[0].id).toBe('qcli-agents-tree');
            expect(views[0].name).toBe('Q CLI Agents');
            
            expect(views[1].id).toBe('qcli-context-tree');
            expect(views[1].name).toBe('Context Files');
        });
    });
});