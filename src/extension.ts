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

	const componentTreeDataProvider = new ComponentTreeDataProvider(rootPath);
	vscode.window.registerTreeDataProvider('tree-view', componentTreeDataProvider);

	const openFile = vscode.commands.registerCommand(
		"extension.openFile",
		async () => {
			const fileUri = await vscode.window.showOpenDialog({
				canSelectMany: false,
				openLabel: 'Open',
				filters: { 'JSON Files': ['json'] }
			});

			let docsJsonPath: string | undefined;

			if (fileUri && fileUri[0]) {
				await vscode.commands.executeCommand('vscode.open', fileUri[0]);
				docsJsonPath = fileUri[0].path.replaceAll('/', '\\').slice(1);
			} else {
				console.log('[extension.openFile] No files were selected.');
			}
			componentTreeDataProvider.refresh(docsJsonPath);
		}
	);

	context.subscriptions.push(openFile);
}

export function deactivate() { }
