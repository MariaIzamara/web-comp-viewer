import * as vscode from 'vscode';

export const setDocsJsonNotFoundContext = () =>
    vscode.commands.executeCommand('setContext', 'docsJsonNotFound', true);