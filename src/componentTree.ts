import * as vscode from 'vscode';
import * as fs from 'fs';
import * as ts from 'typescript';
import * as path from 'path';

const STENCIL_CONFIG_FILE_NAME = 'stencil.config.ts';

export class ComponentTreeDataProvider implements vscode.TreeDataProvider<Dependency> {
    private _onDidChangeTreeData: vscode.EventEmitter<Dependency | undefined | void> = new vscode.EventEmitter<Dependency | undefined | void>();
    readonly onDidChangeTreeData: vscode.Event<Dependency | undefined | void> = this._onDidChangeTreeData.event;

    constructor(private workspaceRoot: string | undefined) {
    }

    getTreeItem(element: Dependency): vscode.TreeItem | Thenable<vscode.TreeItem> {
        return element;
    }

    getChildren(element?: any): vscode.ProviderResult<Dependency[]> {
        if (!this.workspaceRoot) {
            vscode.window.showInformationMessage('No Web Component in empty workspace');
            return Promise.resolve([]);
        }

        if (element) {

        } else {
            const stencilConfigPath = path.join(this.workspaceRoot, STENCIL_CONFIG_FILE_NAME);
            const docsJsonPath = path.join(this.workspaceRoot, this.getDocsJsonPath(stencilConfigPath));
            if(docsJsonPath && this.pathExists(docsJsonPath)) {
			    const docsJson = JSON.parse(fs.readFileSync(docsJsonPath, 'utf-8'));
                console.log(docsJson);
            }
        }
    }

    // getParent?(element: Dependency) {
    //     throw new Error('Method not implemented.');
    // }

    resolveTreeItem?(item: vscode.TreeItem, element: Dependency, token: vscode.CancellationToken): vscode.ProviderResult<vscode.TreeItem> {
        throw new Error('Method not implemented.');
    }

    private getDocsJsonPath(stencilConfigPath: string): string {
        if (this.pathExists(stencilConfigPath)) {
            try {
                const stencilConfigFile = fs.readFileSync(stencilConfigPath, 'utf-8');
                const stencilConfigSourceFile = ts.createSourceFile(STENCIL_CONFIG_FILE_NAME, stencilConfigFile, ts.ScriptTarget.ESNext, false);

                return this.findDocsJsonPath(stencilConfigSourceFile);
            } catch (error) {
                console.error(`Error reading ${STENCIL_CONFIG_FILE_NAME}: ${error}`);
            }
        }

        return '';
    }

    private findDocsJsonPath(stencilConfigSourceFile: ts.SourceFile): string {
        let docsJsonPath: string = '';

        stencilConfigSourceFile.forEachChild(node => {
            if (
                ts.isVariableStatement(node) &&
                node.declarationList.declarations.length > 0
            ) {
                const declaration = node.declarationList.declarations[0];
                
                if (
                    ts.isIdentifier(declaration.name) &&
                    declaration.name.text === 'config' &&
                    declaration.initializer &&
                    ts.isObjectLiteralExpression(declaration.initializer)
                ) {
                    const outputTargetsProperty = declaration.initializer.properties.find(prop =>
                            ts.isPropertyAssignment(prop) &&
                            ts.isIdentifier(prop.name) &&
                            prop.name.text === 'outputTargets'
                        ) as ts.PropertyAssignment | undefined;
                
                    if (outputTargetsProperty && ts.isArrayLiteralExpression(outputTargetsProperty.initializer)) {
                        const outputTargetsArray = outputTargetsProperty.initializer.elements;
                
                        for (const element of outputTargetsArray) {
                            if (ts.isObjectLiteralExpression(element)) {
                                const typeProperty = element.properties.find(prop =>
                                        ts.isPropertyAssignment(prop) &&
                                        ts.isIdentifier(prop.name) &&
                                        prop.name.text === 'type' &&
                                        ts.isStringLiteral(prop.initializer) &&
                                        prop.initializer.text === 'docs-json'
                                    );
                
                                if (typeProperty) {
                                    element.properties.forEach(prop => {
                                        if (ts.isPropertyAssignment(prop) && ts.isIdentifier(prop.name) && prop.name.text === 'file') {
                                            docsJsonPath = ts.isStringLiteral(prop.initializer)
                                                ? prop.initializer.text
                                                : prop.initializer.getText();
                                        }
                                    });
                                }
                            }
                        }
                    }
                }
            }
        });
    
        return docsJsonPath;
    }

    private pathExists(path: string): boolean {
        try {
            fs.accessSync(path);
        } catch {
            return false;
        }

        return true;
    }
}

export class Dependency extends vscode.TreeItem {
    constructor(
        public readonly fileName: string,
        public readonly filePath: string,
        public readonly tag: string,
        public readonly docs: string,
        public readonly dependents: Array<string>,
        public readonly dependencies: Array<string>,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly command?: vscode.Command
    ) {
        super(tag, collapsibleState);

        this.label = this.tag;
        this.tooltip = this.tag;
        this.description = this.docs;
    }

    contextValue = 'dependency';
}