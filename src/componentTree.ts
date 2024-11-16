import * as vscode from 'vscode';
import ts from 'typescript';
import * as fs from 'fs';
import * as fspath from 'path';

const STENCIL_CONFIG_FILE_NAME = 'stencil.config.ts';
const DOCS_JSON_FILE_NAME = 'docs.json';

type Component = {
    tag: string;
    docs: string;
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

    constructor(private path: string | null) {
    }

    refresh(path: string | null): void {
        this.path = path;
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: Node): vscode.TreeItem | Thenable<vscode.TreeItem> {
        return element;
    }

    getChildren(element?: Node): vscode.ProviderResult<Node[]> {
        if (!this.path) {
            this.setDocsJsonNotFound();
            return;
        }

        const docsJson = this.getDocsJson(this.path);

        if (element) {
            return this.getElementNodes(this.rootNodes, element);
        } else {
            this.rootNodes = this.getRootNodesInDocsJson(docsJson);
            return this.rootNodes;
        }
    }

    private getElementNodes(root: Node[], element: Node): Node[] {
        const dependencies = element.dependencies;

        return dependencies.flatMap(dependency => {
            const component = root.find(component => component.tag === dependency);

            if (!component) {
                return [];
            }

            const { tag, docs, dependents, dependencies } = component;
            const collapsibleState = dependencies.length > 0
                ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None;

            return [new Node(tag, docs, dependents, dependencies, collapsibleState)];
        });
    }

    private getRootNodesInDocsJson(docsJson: DocsJson | undefined): Node[] {
        if (!docsJson) {
            return [];
        }

        const components = docsJson.components;

        return components.map(component => {
            const { tag, docs, dependents, dependencies } = component;
            const filteredDependencies = dependencies.filter(dependency => components.find(component => component.tag === dependency));
            const collapsibleState = filteredDependencies.length > 0
                ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None;

            return new Node(tag, docs, dependents, filteredDependencies, collapsibleState);
        });
    }

    private getDocsJson(path: string): DocsJson | undefined {
        try {
            if (!path.endsWith(DOCS_JSON_FILE_NAME)) {
                const stencilConfigPath = fspath.join(path, STENCIL_CONFIG_FILE_NAME);
                path = fspath.join(path, this.getDocsJsonPath(stencilConfigPath));
            }
            if (this.pathExists(path)) {
                return JSON.parse(fs.readFileSync(path, 'utf-8'));
            } else {
                this.setDocsJsonNotFound();
            }
        } catch (error) {
            console.error(`Error reading ${DOCS_JSON_FILE_NAME}: ${error}`);
            this.setDocsJsonNotFound();
        }

        return;
    }

    private getDocsJsonPath(stencilConfigPath: string): string {
        try {
            if (this.pathExists(stencilConfigPath)) {
                const stencilConfigFile = fs.readFileSync(stencilConfigPath, 'utf-8');
                const stencilConfigSourceFile = ts.createSourceFile(STENCIL_CONFIG_FILE_NAME, stencilConfigFile, ts.ScriptTarget.ESNext, false);

                return this.findDocsJsonPath(stencilConfigSourceFile);
            } else {
                this.setDocsJsonNotFound();
            }
        } catch (error) {
            console.error(`Error reading ${STENCIL_CONFIG_FILE_NAME}: ${error}`);
            this.setDocsJsonNotFound();
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

    private setDocsJsonNotFound() {
        vscode.commands.executeCommand('setContext', 'extension.docsJsonNotFound', true);
    }
}

export class Node extends vscode.TreeItem {
    constructor(
        public readonly tag: string,
        public readonly docs: string,
        public readonly dependents: string[],
        public readonly dependencies: string[],
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    ) {
        super(tag, collapsibleState);

        this.label = this.tag;
        this.tooltip = this.docs;
    }
}