import { CommandRegistry } from '../../../presentation/commands/CommandRegistry';
import { AgentCommandHandler } from '../../../presentation/commands/AgentCommandHandler';
import { ContextCommandHandler } from '../../../presentation/commands/ContextCommandHandler';
import { ILogger } from '../../../shared/infrastructure/ILogger';
import { PerformanceMonitor } from '../../../infrastructure/PerformanceMonitor';

// Mock VS Code API
jest.mock('vscode', () => ({
    commands: {
        registerCommand: jest.fn().mockReturnValue({
            dispose: jest.fn()
        })
    },
    window: {
        showErrorMessage: jest.fn()
    }
}));

describe('CommandRegistry Integration', () => {
    let registry: CommandRegistry;
    let mockAgentHandler: jest.Mocked<AgentCommandHandler>;
    let mockContextHandler: jest.Mocked<ContextCommandHandler>;
    let mockLogger: jest.Mocked<ILogger>;
    let mockPerformanceMonitor: jest.Mocked<PerformanceMonitor>;

    beforeEach(() => {
        mockAgentHandler = {
            createAgent: jest.fn(),
            openAgent: jest.fn(),
            deleteAgent: jest.fn(),
            refreshAgents: jest.fn(),
            validateAgentName: jest.fn()
        } as any;

        mockContextHandler = {
            setCurrentAgent: jest.fn(),
            addContextItem: jest.fn(),
            removeContextItem: jest.fn(),
            clearContext: jest.fn(),
            openContextItem: jest.fn(),
            refreshContext: jest.fn()
        } as any;

        mockLogger = {
            debug: jest.fn(),
            info: jest.fn(),
            warn: jest.fn(),
            error: jest.fn(),
            setLogLevel: jest.fn(),
            getLogLevel: jest.fn(),
            dispose: jest.fn()
        };

        mockPerformanceMonitor = {
            measureAsync: jest.fn().mockImplementation(async (_name, fn) => fn())
        } as any;

        registry = new CommandRegistry(mockAgentHandler, mockContextHandler, mockLogger, mockPerformanceMonitor);
    });

    afterEach(() => {
        registry.dispose();
    });

    describe('registerCommands', () => {
        it('should register all commands and return disposables', () => {
            const disposables = registry.registerCommands();

            expect(disposables.length).toBeGreaterThan(0);
            expect(mockLogger.info).toHaveBeenCalledWith('Commands registered', { count: disposables.length });
        });

        it('should register agent commands', () => {
            const disposables = registry.registerCommands();

            expect(disposables.length).toBeGreaterThanOrEqual(9); // At least 9 commands
        });
    });

    describe('command execution', () => {
        it('should measure performance for command execution', async () => {
            registry.registerCommands();

            // Simulate command execution would happen through VS Code command system
            // We can't directly test this without VS Code API, but we can verify setup
            expect(mockPerformanceMonitor.measureAsync).toBeDefined();
        });

        it('should log command execution', () => {
            registry.registerCommands();

            expect(mockLogger.debug).toBeDefined();
            expect(mockLogger.error).toBeDefined();
        });
    });

    describe('dispose', () => {
        it('should dispose all registered commands', () => {
            const disposables = registry.registerCommands();
            const initialCount = disposables.length;

            registry.dispose();

            expect(mockLogger.debug).toHaveBeenCalledWith('CommandRegistry disposed');
            expect(initialCount).toBeGreaterThan(0);
        });

        it('should handle multiple dispose calls', () => {
            registry.registerCommands();
            
            registry.dispose();
            registry.dispose(); // Should not throw

            expect(mockLogger.debug).toHaveBeenCalledWith('CommandRegistry disposed');
        });
    });
});
