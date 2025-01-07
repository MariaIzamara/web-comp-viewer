/**
 * @introduction comands file
 *
 * @description all of comands are defined here
 */
import * as vscode from 'vscode';
import { ComponentTreeDataProvider, Node } from './componentTree';

const treeView_openFile = (componentTreeDataProvider: ComponentTreeDataProvider) => vscode.commands.registerCommand(
    "treeView.openFile",
    async () => {
        const fileUri = await vscode.window.showOpenDialog({
            canSelectMany: false,
            openLabel: 'Open',
            filters: { 'JSON Files': ['json'] }
        });

        let docsJsonPath: string | undefined;

        if (fileUri && fileUri[0]) {
            await vscode.commands.executeCommand('vscode.open', fileUri[0]);
            docsJsonPath = fileUri[0].fsPath;
        } else {
            console.log('[treeView.openFile] No files were selected.');
        }
        componentTreeDataProvider.refresh(docsJsonPath);
    }
);

const treeView_refresh = (componentTreeDataProvider: ComponentTreeDataProvider) => vscode.commands.registerCommand(
    'treeView.refresh',
    () => {
        const path = componentTreeDataProvider.getPath();
        if (!path) {
            console.log('[treeView.refresh] No path defined.');
            return;
        }
        componentTreeDataProvider.refresh(path);
    }
);

const treeView_edit = vscode.commands.registerCommand(
    'treeView.edit',
    async (node: Node) => {
        if (!node.path) {
            console.error('[treeView.edit] No path defined.');
            return;
        }
        const fileUri = vscode.Uri.file(node.path);
        await vscode.commands.executeCommand('vscode.open', fileUri);
    }
);

export const comands = [treeView_openFile, treeView_refresh, treeView_edit];