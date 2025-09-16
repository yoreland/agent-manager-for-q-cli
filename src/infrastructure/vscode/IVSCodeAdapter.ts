import * as vscode from 'vscode';

export interface IVSCodeAdapter {
    // Message dialogs
    showInformationMessage(message: string, ...items: string[]): Promise<string | undefined>;
    showWarningMessage(message: string, ...items: string[]): Promise<string | undefined>;
    showErrorMessage(message: string, ...items: string[]): Promise<string | undefined>;
    
    // Input dialogs
    showInputBox(options?: vscode.InputBoxOptions): Promise<string | undefined>;
    showQuickPick<T extends vscode.QuickPickItem>(items: T[], options?: vscode.QuickPickOptions): Promise<T | undefined>;
    
    // Commands
    registerCommand(command: string, callback: (...args: any[]) => any): vscode.Disposable;
    executeCommand<T = unknown>(command: string, ...args: any[]): Promise<T>;
    
    // Tree views
    createTreeView<T>(viewId: string, options: vscode.TreeViewOptions<T>): vscode.TreeView<T>;
    
    // File operations
    openTextDocument(uri: vscode.Uri): Promise<vscode.TextDocument>;
    showTextDocument(document: vscode.TextDocument, options?: vscode.TextDocumentShowOptions): Promise<vscode.TextEditor>;
    
    // Workspace
    getWorkspaceFolders(): readonly vscode.WorkspaceFolder[] | undefined;
    getConfiguration(section?: string): vscode.WorkspaceConfiguration;
    
    // Output
    createOutputChannel(name: string): vscode.OutputChannel;
    
    // Progress
    withProgress<R>(
        options: vscode.ProgressOptions,
        task: (progress: vscode.Progress<{ message?: string; increment?: number }>) => Promise<R>
    ): Promise<R>;
}
