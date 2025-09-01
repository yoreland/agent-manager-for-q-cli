import * as vscode from 'vscode';
import { IVSCodeAdapter } from './IVSCodeAdapter';
import { ILogger } from './ILogger';

export class VSCodeAdapter implements IVSCodeAdapter {
    constructor(private logger: ILogger) {}

    async showInformationMessage(message: string, ...items: string[]): Promise<string | undefined> {
        this.logger.info('Showing information message', { message, items });
        return vscode.window.showInformationMessage(message, ...items);
    }

    async showWarningMessage(message: string, ...items: string[]): Promise<string | undefined> {
        this.logger.warn('Showing warning message', { message, items });
        return vscode.window.showWarningMessage(message, ...items);
    }

    async showErrorMessage(message: string, ...items: string[]): Promise<string | undefined> {
        this.logger.error('Showing error message', undefined, { message, items });
        return vscode.window.showErrorMessage(message, ...items);
    }

    async showInputBox(options?: vscode.InputBoxOptions): Promise<string | undefined> {
        this.logger.debug('Showing input box', { options });
        return vscode.window.showInputBox(options);
    }

    async showQuickPick<T extends vscode.QuickPickItem>(
        items: T[], 
        options?: vscode.QuickPickOptions
    ): Promise<T | undefined> {
        this.logger.debug('Showing quick pick', { itemCount: items.length, options });
        return vscode.window.showQuickPick(items, options);
    }

    registerCommand(command: string, callback: (...args: any[]) => any): vscode.Disposable {
        this.logger.debug('Registering command', { command });
        return vscode.commands.registerCommand(command, callback);
    }

    async executeCommand<T = unknown>(command: string, ...args: any[]): Promise<T> {
        this.logger.debug('Executing command', { command, args });
        return vscode.commands.executeCommand<T>(command, ...args);
    }

    createTreeView<T>(viewId: string, options: vscode.TreeViewOptions<T>): vscode.TreeView<T> {
        this.logger.debug('Creating tree view', { viewId });
        return vscode.window.createTreeView(viewId, options);
    }

    async openTextDocument(uri: vscode.Uri): Promise<vscode.TextDocument> {
        this.logger.debug('Opening text document', { uri: uri.toString() });
        return vscode.workspace.openTextDocument(uri);
    }

    async showTextDocument(
        document: vscode.TextDocument, 
        options?: vscode.TextDocumentShowOptions
    ): Promise<vscode.TextEditor> {
        this.logger.debug('Showing text document', { uri: document.uri.toString(), options });
        return vscode.window.showTextDocument(document, options);
    }

    getWorkspaceFolders(): readonly vscode.WorkspaceFolder[] | undefined {
        return vscode.workspace.workspaceFolders;
    }

    getConfiguration(section?: string): vscode.WorkspaceConfiguration {
        return vscode.workspace.getConfiguration(section);
    }

    createOutputChannel(name: string): vscode.OutputChannel {
        this.logger.debug('Creating output channel', { name });
        return vscode.window.createOutputChannel(name);
    }

    async withProgress<R>(
        options: vscode.ProgressOptions,
        task: (progress: vscode.Progress<{ message?: string; increment?: number }>) => Promise<R>
    ): Promise<R> {
        this.logger.debug('Starting progress task', { title: options.title });
        return vscode.window.withProgress(options, task);
    }
}
