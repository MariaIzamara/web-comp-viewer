import * as fs from 'fs';
import * as vscode from 'vscode';
import { findAbsoluteFilePath } from './fileUtils';
import { DocsJson } from './types';

export class ComponentTreeDataProvider implements vscode.TreeDataProvider<Node> {
    private rootNodes: Node[] = [];

    private _onDidChangeTreeData: vscode.EventEmitter<Node | undefined | void> = new vscode.EventEmitter<Node | undefined | void>();
    readonly onDidChangeTreeData: vscode.Event<Node | undefined | void> = this._onDidChangeTreeData.event;

    constructor(private docsJsonPath: string | undefined) {
    }

    refresh(docsJsonPath: string): void {
        this.docsJsonPath = docsJsonPath;
        this._onDidChangeTreeData.fire();
    }

    getDocsJsonPath(): string | undefined {
        return this.docsJsonPath;
    }

    getTreeItem(element: Node): vscode.TreeItem | Thenable<vscode.TreeItem> {
        return element;
    }

    getChildren(element?: Node): vscode.ProviderResult<Node[]> {
        if (element) {
            return this.getElementNodesFromRootNodes(this.rootNodes, element);
        } else {
            if (!this.docsJsonPath) {
                console.log('[ComponentTreeDataProvider] No docsJsonPath defined.');
                return;
            }
            const docsJson = JSON.parse(fs.readFileSync(this.docsJsonPath, 'utf8'));
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
            const path = findAbsoluteFilePath(this.docsJsonPath, filePath);
            const filteredDependencies = dependencies.filter(dependency => components.find(component => component.tag === dependency));
            const collapsibleState = filteredDependencies.length > 0
                ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None;

            return new Node(tag, docs, path, dependents, filteredDependencies, collapsibleState);
        });
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