/**
 * @introduction main file
 *
 * @description application will start from this file
 */
import * as vscode from 'vscode';
import { comands } from './comands';
import { ComponentTreeDataProvider } from './componentTree';
import { getDocsJsonPath } from './pathUtils';

export function activate(context: vscode.ExtensionContext) {
	const rootPath = vscode.workspace.workspaceFolders && (vscode.workspace.workspaceFolders.length > 0)
		? vscode.workspace.workspaceFolders[0].uri.fsPath
		: undefined;

	const docsJsonPath = getDocsJsonPath(rootPath);

	const componentTreeDataProvider = new ComponentTreeDataProvider(docsJsonPath);
	vscode.window.registerTreeDataProvider('treeView', componentTreeDataProvider);

	comands.forEach(command => {
		if (typeof command === 'function') {
			context.subscriptions.push(command(componentTreeDataProvider));
			return;
		}
		context.subscriptions.push(command);
	});
}

export function deactivate() { }
