import * as vscode from 'vscode';
import * as path from 'path';
import { ResourceFileItem } from '../../shared/types/context';
import { ExtensionLogger } from '../../application/shared/logger';

/**
 * Commands for Context Resource file interactions
 */
export class ContextResourceCommands {
    constructor(private logger: ExtensionLogger) {}

    /**
     * Open file in VS Code editor
     */
    async openFile(item: ResourceFileItem): Promise<void> {
        if (!item.exists) {
            vscode.window.showWarningMessage(`File not found: ${item.relativePath}`);
            return;
        }

        try {
            // Check if file is binary
            if (this.isBinaryFile(item.filePath)) {
                const choice = await vscode.window.showWarningMessage(
                    `"${item.label}" appears to be a binary file. Do you want to open it anyway?`,
                    'Open', 'Cancel'
                );
                
                if (choice !== 'Open') {
                    return;
                }
            }

            const document = await vscode.workspace.openTextDocument(item.filePath);
            await vscode.window.showTextDocument(document);
            
            this.logger.debug(`Opened file: ${item.filePath}`);
        } catch (error) {
            this.logger.error('Failed to open file', error as Error);
            vscode.window.showErrorMessage(`Failed to open file: ${(error as Error).message}`);
        }
    }

    /**
     * Reveal file in OS explorer
     */
    async revealInExplorer(item: ResourceFileItem): Promise<void> {
        try {
            await vscode.commands.executeCommand('revealFileInOS', vscode.Uri.file(item.filePath));
            this.logger.debug(`Revealed in explorer: ${item.filePath}`);
        } catch (error) {
            this.logger.error('Failed to reveal file in explorer', error as Error);
            vscode.window.showErrorMessage('Failed to reveal file in explorer');
        }
    }

    /**
     * Copy file path to clipboard
     */
    async copyPath(item: ResourceFileItem): Promise<void> {
        try {
            await vscode.env.clipboard.writeText(item.filePath);
            vscode.window.showInformationMessage('File path copied to clipboard');
            this.logger.debug(`Copied path: ${item.filePath}`);
        } catch (error) {
            this.logger.error('Failed to copy path', error as Error);
            vscode.window.showErrorMessage('Failed to copy file path');
        }
    }

    /**
     * Copy relative path to clipboard
     */
    async copyRelativePath(item: ResourceFileItem): Promise<void> {
        try {
            await vscode.env.clipboard.writeText(item.relativePath);
            vscode.window.showInformationMessage('Relative path copied to clipboard');
            this.logger.debug(`Copied relative path: ${item.relativePath}`);
        } catch (error) {
            this.logger.error('Failed to copy relative path', error as Error);
            vscode.window.showErrorMessage('Failed to copy relative path');
        }
    }

    /**
     * Search files in context resources
     */
    async searchFiles(contextTreeProvider: any): Promise<void> {
        const searchTerm = await vscode.window.showInputBox({
            prompt: 'Search resource files',
            placeHolder: 'Enter search term (file name or path)',
            validateInput: (value) => {
                if (value && value.length < 2) {
                    return 'Search term must be at least 2 characters';
                }
                return null;
            }
        });

        if (searchTerm !== undefined) {
            if (searchTerm.trim() === '') {
                contextTreeProvider.clearSearchFilter();
                vscode.window.showInformationMessage('Search filter cleared');
            } else {
                contextTreeProvider.setSearchFilter(searchTerm.trim());
                vscode.window.showInformationMessage(`Searching for: "${searchTerm}"`);
            }
        }
    }

    /**
     * Check if file is likely binary based on extension
     */
    private isBinaryFile(filePath: string): boolean {
        const ext = path.extname(filePath).toLowerCase();
        const binaryExtensions = [
            '.exe', '.dll', '.so', '.dylib', '.bin', '.dat',
            '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.ico',
            '.mp3', '.mp4', '.avi', '.mov', '.wav',
            '.zip', '.tar', '.gz', '.rar', '.7z',
            '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx'
        ];
        
        return binaryExtensions.includes(ext);
    }
}
