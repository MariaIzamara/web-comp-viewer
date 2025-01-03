import * as vscode from 'vscode';
import ts from 'typescript';
import * as fs from 'fs';
import * as fspath from 'path';
import { findAbsoluteFilePath } from './utils';

const STENCIL_CONFIG_FILE_NAME = 'stencil.config.ts';
const DOCS_JSON_FILE_NAME = 'docs.json';

type Component = {
    tag: string;
    docs: string;
    filePath: string;
    dependents: string[];
    dependencies: string[];
};

type DocsJson = {
    components: Component[];
}

export class ComponentTreeDataProvider implements vscode.TreeDataProvider<Node> {
    private rootNodes: Node[] = [];

    private _onDidChangeTreeData: vscode.EventEmitter<Node | undefined | void> = new vscode.EventEmitter<Node | undefined | void>();
    readonly onDidChangeTreeData: vscode.Event<Node | undefined | void> = this._onDidChangeTreeData.event;

    constructor(private path: string | undefined) {
    }

    refresh(path: string | undefined): void {
        this.path = path;
        this._onDidChangeTreeData.fire();
    }

    getPath(): string | undefined {
        return this.path;
    }

    getTreeItem(element: Node): vscode.TreeItem | Thenable<vscode.TreeItem> {
        return element;
    }

    getChildren(element?: Node): vscode.ProviderResult<Node[]> {
        if (!this.path) {
            console.log('[ComponentTreeDataProvider] No defined path.');
            this.setDocsJsonNotFound();
            return;
        }

        const docsJson = this.getDocsJson(this.path);

        if (element) {
            return this.getElementNodesFromRootNodes(this.rootNodes, element);
        } else {
            this.rootNodes = this.getRootNodesFromDocsJson(docsJson);
            return this.rootNodes;
        }
    }

    private getElementNodesFromRootNodes(root: Node[], element: Node): Node[] {
        const dependencies = element.dependencies;

        return dependencies.flatMap(dependency => {
            const component = root.find(component => component.tag === dependency);

            if (!component) {
                return [];
            }

            const { tag, docs, path, dependents, dependencies } = component;
            const collapsibleState = dependencies.length > 0
                ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None;

            return [new Node(tag, docs, path, dependents, dependencies, collapsibleState)];
        });
    }

    private getRootNodesFromDocsJson(docsJson: DocsJson | undefined): Node[] {
        if (!docsJson) {
            return [];
        }

        const components = docsJson.components;

        return components.map(component => {
            const { tag, docs, filePath, dependents, dependencies } = component;
            const path = this.getAbsoluteFilePath(filePath);
            const filteredDependencies = dependencies.filter(dependency => components.find(component => component.tag === dependency));
            const collapsibleState = filteredDependencies.length > 0
                ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None;

            return new Node(tag, docs, path, dependents, filteredDependencies, collapsibleState);
        });
    }

    private getAbsoluteFilePath(relativeFilePath: string): string | undefined {
        if (this.path && !this.path.endsWith(DOCS_JSON_FILE_NAME)) {
            return fspath.join(this.path, relativeFilePath);
        }

        return findAbsoluteFilePath(this.path, relativeFilePath);
    }

    private getDocsJson(path: string): DocsJson | undefined {
        try {
            if (!path.endsWith(DOCS_JSON_FILE_NAME)) {
                const stencilConfigPath = fspath.join(path, STENCIL_CONFIG_FILE_NAME);
                const docsJsonPath = this.getDocsJsonPath(stencilConfigPath);
                if (!docsJsonPath) {
                    throw Error('Path not found.');
                }
                path = fspath.join(path, docsJsonPath);
            }
            if (fs.existsSync(path)) {
                return JSON.parse(fs.readFileSync(path, 'utf-8'));
            } else {
                throw Error('File not found.');
            }
        } catch (error) {
            console.error(`[${DOCS_JSON_FILE_NAME}] ${error}`);
            this.setDocsJsonNotFound();
        }
    }

    private getDocsJsonPath(stencilConfigPath: string): string | undefined {
        try {
            if (fs.existsSync(stencilConfigPath)) {
                const stencilConfigFile = fs.readFileSync(stencilConfigPath, 'utf-8');
                const stencilConfigSourceFile = ts.createSourceFile(STENCIL_CONFIG_FILE_NAME, stencilConfigFile, ts.ScriptTarget.ESNext, false);

                return this.findDocsJsonPath(stencilConfigSourceFile);
            } else {
                throw Error('File not found.');
            }
        } catch (error) {
            console.error(`[${STENCIL_CONFIG_FILE_NAME}] ${error}`);
        }
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

    private setDocsJsonNotFound() {
        vscode.commands.executeCommand('setContext', 'extension.docsJsonNotFound', true);
    }
}

export class Node extends vscode.TreeItem {
    constructor(
        public readonly tag: string,
        public readonly docs: string,
        public readonly path: string | undefined,
        public readonly dependents: string[],
        public readonly dependencies: string[],
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    ) {
        super(tag, collapsibleState);

        this.label = this.tag;
        this.tooltip = this.docs;
    }
}