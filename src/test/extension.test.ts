import * as assert from 'assert';
import * as vscode from 'vscode';
import { getExtensionState } from '../extension';

suite('Extension Test Suite', () => {
	vscode.window.showInformationMessage('Start all tests.');

	test('Extension should be present', () => {
		const extension = vscode.extensions.getExtension('qcli-context-manager.context-manager-for-q-cli');
		assert.ok(extension, 'Extension should be present');
	});

	test('Extension should activate', async () => {
		const extension = vscode.extensions.getExtension('qcli-context-manager.context-manager-for-q-cli');
		assert.ok(extension, 'Extension should be present');
		
		await extension.activate();
		assert.strictEqual(extension.isActive, true, 'Extension should be active');
	});

	test('Extension state should be initialized after activation', async () => {
		const extension = vscode.extensions.getExtension('qcli-context-manager.context-manager-for-q-cli');
		assert.ok(extension, 'Extension should be present');
		
		await extension.activate();
		
		const state = getExtensionState();
		assert.ok(state, 'Extension state should be initialized');
		assert.strictEqual(state.isActivated, true, 'Extension should be marked as activated');
		assert.ok(state.logger, 'Logger should be initialized');
		assert.ok(state.outputChannel, 'Output channel should be initialized');
	});

	test('Open Context Manager command should be registered', async () => {
		const extension = vscode.extensions.getExtension('qcli-context-manager.context-manager-for-q-cli');
		assert.ok(extension, 'Extension should be present');
		
		await extension.activate();
		
		const commands = await vscode.commands.getCommands(true);
		assert.ok(
			commands.includes('qcli-context.openContextManager'),
			'Open Context Manager command should be registered'
		);
	});

	test('Open Context Manager command should execute without error', async () => {
		const extension = vscode.extensions.getExtension('qcli-context-manager.context-manager-for-q-cli');
		assert.ok(extension, 'Extension should be present');
		
		await extension.activate();
		
		// This should not throw an error
		await vscode.commands.executeCommand('qcli-context.openContextManager');
	});
});
