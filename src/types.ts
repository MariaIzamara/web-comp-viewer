type Component = {
    tag: string;
    docs: string;
    filePath: string;
    dependents: string[];
    dependencies: string[];
};

export type DocsJson = {
    components: Component[];
}