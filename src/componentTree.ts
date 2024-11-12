import * as vscode from 'vscode';
import * as fs from 'fs';
import ts from 'typescript';
import * as path from 'path';

const STENCIL_CONFIG_FILE_NAME = 'stencil.config.ts';

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

    readonly onDidChangeTreeData!: vscode.Event<Node | undefined | void>;

    constructor(private workspaceRoot: string) {
    }

    getTreeItem(element: Node): vscode.TreeItem | Thenable<vscode.TreeItem> {
        return element;
    }

    getChildren(element?: Node): vscode.ProviderResult<Node[]> {
        const docsJson = this.getDocsJson(this.workspaceRoot);

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

    private getDocsJson(workspaceRoot: string): DocsJson | undefined {
        try {
            const stencilConfigPath = path.join(workspaceRoot, STENCIL_CONFIG_FILE_NAME);
            const docsJsonPath = path.join(workspaceRoot, this.getDocsJsonPath(stencilConfigPath));
            if (docsJsonPath && this.pathExists(docsJsonPath)) {
                return JSON.parse(fs.readFileSync(docsJsonPath, 'utf-8'));
            }
        } catch (error) {
            console.error(`Error reading docs-json: ${error}`);
        }

        return;
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