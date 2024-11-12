/**
 * @introduction main file
 *
 * @description application will start from this file
 */
import * as vscode from 'vscode';
import { ComponentTreeDataProvider } from './componentTree';

export function activate(context: vscode.ExtensionContext) {
	const rootPath = (vscode.workspace.workspaceFolders && (vscode.workspace.workspaceFolders.length > 0))
		? vscode.workspace.workspaceFolders[0].uri.fsPath : undefined;

	if (!rootPath) {
		vscode.window.showInformationMessage('No folder opened!');
		return;
	}

	const componentTreeDataProvider = new ComponentTreeDataProvider(rootPath);

	vscode.window.registerTreeDataProvider('componentTree', componentTreeDataProvider);
}

export function deactivate() { }
