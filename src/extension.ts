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

	console.log({rootPath});

	const componentTreeDataProvider = new ComponentTreeDataProvider(rootPath);

	vscode.window.registerTreeDataProvider('componentTree', componentTreeDataProvider);

	console.log('Congratulations, your extension "web-comp-analyzer" is now active!');
}

export function deactivate() {}
