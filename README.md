# WebCompViewer

The Web Components Viewer is an extension for Stencil projects that makes it easier to view and navigate component structures. With this extension, you can explore and access the hierarchy of components directly in VS Code, without wasting time on manual searches or struggling to track project updates.

## Features

- **Component Tree:** View the complete hierarchy of components defined in your project's `docs.json`. Each component displays its relationships and may appear in different parts of the tree.
- **Quick Edit:** Click the pencil icon to open the component's file directly in the editor, saving time and effort.
- **Simplified Updates:** Capture the latest changes in `docs.json` after the project's build with the refresh button.
- **Guaranteed Compatibility:** Works seamlessly with all VS Code themes (dark, light, etc.) and on all supported operating systems.

## Requirements

To use Web Components Viewer, your project must meet the following criteria:

1. Be a Stencil project configured to generate the `docs.json` file. Check the official documentation for more details: [Stencil JSON Docs](https://stenciljs.com/docs/docs-json).
2. The `docs.json` file must be located in a way that the extension can automatically find it (see below).

### How Does the Extension Locate `docs.json`?

The extension performs an automated process to find the `docs.json` file:

1. **Search in the project root:** Checks if the file is in the root of the workspace.
2. **Search in `stencil.config.js`:** If the file is not in the root, the extension checks the outputTargets property within the config object in the `stencil.config.js` file to locate the `docs.json` path.
3. **Guidance message:** If the file is still not found, the extension will display a message asking you to:
    - Open a folder containing the `docs.json`, or
    - Open the `docs.json` file directly in the editor.

With Web Components Viewer, you gain productivity, organization, and agility when working with Stencil projects. Install it now and see the difference in your workflow! 🚀
