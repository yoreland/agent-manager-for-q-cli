import { VSCodeAdapter } from '../../../shared/infrastructure/VSCodeAdapter';
import { EnhancedLogger } from '../../../shared/infrastructure/EnhancedLogger';
import { LogLevel } from '../../../shared/infrastructure/ILogger';

// Mock VS Code
jest.mock('vscode', () => ({
    window: {
        showInformationMessage: jest.fn(),
        showWarningMessage: jest.fn(),
        showErrorMessage: jest.fn(),
        showInputBox: jest.fn(),
        showQuickPick: jest.fn(),
        createTreeView: jest.fn(),
        showTextDocument: jest.fn(),
        createOutputChannel: jest.fn(),
        withProgress: jest.fn()
    },
    commands: {
        registerCommand: jest.fn(),
        executeCommand: jest.fn()
    },
    workspace: {
        workspaceFolders: [],
        getConfiguration: jest.fn(),
        openTextDocument: jest.fn()
    }
}));

import * as vscode from 'vscode';
const mockWindow = vscode.window as jest.Mocked<typeof vscode.window>;
const mockCommands = vscode.commands as jest.Mocked<typeof vscode.commands>;
const mockWorkspace = vscode.workspace as jest.Mocked<typeof vscode.workspace>;

describe('VSCodeAdapter', () => {
    let adapter: VSCodeAdapter;
    let logger: EnhancedLogger;
    let mockOutputChannel: any;

    beforeEach(() => {
        jest.clearAllMocks();
        mockOutputChannel = {
            appendLine: jest.fn(),
            dispose: jest.fn()
        };
        logger = new EnhancedLogger(mockOutputChannel, LogLevel.DEBUG);
        adapter = new VSCodeAdapter(logger);
    });

    afterEach(() => {
        logger.dispose();
    });

    describe('message dialogs', () => {
        it('should show information message', async () => {
            const expectedResult = 'OK';
            (mockWindow.showInformationMessage as jest.Mock).mockResolvedValue(expectedResult);

            const result = await adapter.showInformationMessage('Test message', 'OK', 'Cancel');

            expect(result).toBe(expectedResult);
            expect(mockWindow.showInformationMessage).toHaveBeenCalledWith('Test message', 'OK', 'Cancel');
        });

        it('should show warning message', async () => {
            const expectedResult = 'Yes';
            (mockWindow.showWarningMessage as jest.Mock).mockResolvedValue(expectedResult);

            const result = await adapter.showWarningMessage('Warning message', 'Yes', 'No');

            expect(result).toBe(expectedResult);
            expect(mockWindow.showWarningMessage).toHaveBeenCalledWith('Warning message', 'Yes', 'No');
        });

        it('should show error message', async () => {
            const expectedResult = 'Retry';
            (mockWindow.showErrorMessage as jest.Mock).mockResolvedValue(expectedResult);

            const result = await adapter.showErrorMessage('Error message', 'Retry', 'Cancel');

            expect(result).toBe(expectedResult);
            expect(mockWindow.showErrorMessage).toHaveBeenCalledWith('Error message', 'Retry', 'Cancel');
        });
    });

    describe('input dialogs', () => {
        it('should show input box', async () => {
            const expectedResult = 'user input';
            const options = { prompt: 'Enter value' };
            mockWindow.showInputBox.mockResolvedValue(expectedResult);

            const result = await adapter.showInputBox(options);

            expect(result).toBe(expectedResult);
            expect(mockWindow.showInputBox).toHaveBeenCalledWith(options);
        });

        it('should show quick pick', async () => {
            const items = [{ label: 'Item 1' }, { label: 'Item 2' }];
            const options = { placeHolder: 'Select item' };
            const expectedResult = items[0];
            mockWindow.showQuickPick.mockResolvedValue(expectedResult);

            const result = await adapter.showQuickPick(items, options);

            expect(result).toBe(expectedResult);
            expect(mockWindow.showQuickPick).toHaveBeenCalledWith(items, options);
        });
    });

    describe('commands', () => {
        it('should register command', () => {
            const callback = jest.fn();
            const mockDisposable = { dispose: jest.fn() };
            mockCommands.registerCommand.mockReturnValue(mockDisposable);

            const result = adapter.registerCommand('test.command', callback);

            expect(result).toBe(mockDisposable);
            expect(mockCommands.registerCommand).toHaveBeenCalledWith('test.command', callback);
        });

        it('should execute command', async () => {
            const expectedResult = 'command result';
            mockCommands.executeCommand.mockResolvedValue(expectedResult);

            const result = await adapter.executeCommand('test.command', 'arg1', 'arg2');

            expect(result).toBe(expectedResult);
            expect(mockCommands.executeCommand).toHaveBeenCalledWith('test.command', 'arg1', 'arg2');
        });
    });

    describe('workspace', () => {
        it('should get workspace folders', () => {
            const folders = [{ uri: { fsPath: '/test' } }] as any;
            Object.defineProperty(mockWorkspace, 'workspaceFolders', {
                value: folders,
                configurable: true
            });

            const result = adapter.getWorkspaceFolders();

            expect(result).toBe(folders);
        });

        it('should get configuration', () => {
            const mockConfig = { 
                get: jest.fn(),
                has: jest.fn(),
                inspect: jest.fn(),
                update: jest.fn()
            } as any;
            (mockWorkspace.getConfiguration as jest.Mock).mockReturnValue(mockConfig);

            const result = adapter.getConfiguration('test.section');

            expect(result).toBe(mockConfig);
            expect(mockWorkspace.getConfiguration).toHaveBeenCalledWith('test.section');
        });
    });
});
