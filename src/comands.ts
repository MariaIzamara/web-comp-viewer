/**
 * @introduction comands file
 *
 * @description all of comands are defined here
 */
import * as fspath from 'path';
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

const treeView_open = vscode.commands.registerCommand(
    'treeView.open',
    (node: Node) => {
        const panel = vscode.window.createWebviewPanel(
            'treeView',
            `Tree View: ${node.label}`,
            vscode.ViewColumn.One,
            {
                enableScripts: true,
                localResourceRoots: [vscode.Uri.file(fspath.join(__dirname, 'webview/out'))]
            }
        );

        panel.iconPath = {
            "light": vscode.Uri.file(fspath.join(__dirname, '../assets/light/tree.svg')),
            "dark": vscode.Uri.file(fspath.join(__dirname, '../assets/dark/tree.svg'))
        };

        const webviewPath = vscode.Uri.file(fspath.join(__dirname, '../src/webview/out/index.html'));
        const webviewUri = panel.webview.asWebviewUri(webviewPath);

        panel.webview.html = `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Tree View</title>
            </head>
            <body>
                <iframe src="${webviewUri}" frameborder="0" style="width: 100%; height: 100vh;"></iframe>
            </body>
            </html>
        `;
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

export const comands = [treeView_openFile, treeView_refresh, treeView_open, treeView_edit];