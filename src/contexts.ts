import * as vscode from 'vscode';

export const setDocsJsonPathContext = (docsJsonPath: string | null = null) =>
    vscode.commands.executeCommand('setContext', 'docsJsonPath', docsJsonPath);

export const setDocsJsonNotFoundContext = () =>
    vscode.commands.executeCommand('setContext', 'docsJsonNotFound', true);