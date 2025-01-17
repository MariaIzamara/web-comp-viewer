import * as fs from 'fs';
import * as fspath from 'path';
import ts from 'typescript';
import { DOCS_JSON_FILE_NAME, STENCIL_CONFIG_FILE_NAME } from './constants';
import { setDocsJsonNotFoundContext } from './contexts';
import { DocsJson } from './types';

/**
 * Retrieves the content of the `docs.json` file based on the provided path.
 * 1. Find `docs.json` in the given folder.
 * 2. Look for the `stencil.config.js` file and extract the `docs.json` path from the `outputTargets` property.
 * If none of these options succeed, an error is logged.
 * 
 * @param {string} path - The path to the `docs.json` or the project folder containing it.
 * @returns {DocsJson | undefined} - Parsed `docs.json` content, or `undefined` if not found.
 */
export const getDocsJsonPath = (path: string | undefined): string | undefined => {
    try {
        if (!path) {
            console.log('[fileUtils] No defined path.');
            setDocsJsonNotFoundContext();
            return;
        }

        let docsJsonPath = fspath.join(path, DOCS_JSON_FILE_NAME);
        if (fs.existsSync(docsJsonPath)) {
            path = docsJsonPath;
        }
        else {
            const stencilConfigPath = fspath.join(path, STENCIL_CONFIG_FILE_NAME);
            const relativeDocsJsonPath = getDocsJsonPathInStencilConfig(stencilConfigPath);
            if (!relativeDocsJsonPath) {
                throw Error('Path not found.');
            }
            docsJsonPath = fspath.join(path, relativeDocsJsonPath);
            if (fs.existsSync(docsJsonPath)) {
                path = docsJsonPath;
            } else {
                throw Error('File not found.');
            }
        }
        return path;
    } catch (error) {
        console.error(`[${DOCS_JSON_FILE_NAME}] ${error}`);
        setDocsJsonNotFoundContext();
    }
}

/**
 * Retrieves the path to the `docs.json` file from the `stencil.config.js` file.
 * It parses the configuration file and looks for the `outputTargets` property within the `config` object.
 * 
 * @param {string} stencilConfigPath - Path to the `stencil.config.js` file.
 * @returns {string | undefined} - Relative path to the `docs.json`, or `undefined` if not found.
 */
const getDocsJsonPathInStencilConfig = (stencilConfigPath: string): string | undefined => {
    try {
        if (fs.existsSync(stencilConfigPath)) {
            const stencilConfigFile = fs.readFileSync(stencilConfigPath, 'utf-8');
            const stencilConfigSourceFile = ts.createSourceFile(STENCIL_CONFIG_FILE_NAME, stencilConfigFile, ts.ScriptTarget.ESNext, false);

            return findDocsJsonPathInStencilConfig(stencilConfigSourceFile);
        } else {
            throw Error('File not found.');
        }
    } catch (error) {
        console.error(`[${STENCIL_CONFIG_FILE_NAME}] ${error}`);
    }
}

/**
 * Parses the `stencil.config.js` file to extract the relative path to the `docs.json` file.
 * It navigates through the `config` object, looking for the `outputTargets` array and identifying 
 * entries with a `type` of `'docs-json'` and a `file` property indicating the file path.
 * 
 * @param {ts.SourceFile} stencilConfigSourceFile - Parsed TypeScript source file of `stencil.config.js`.
 * @returns {string} - The relative path to the `docs.json` file, or an empty string if not found.
 */
const findDocsJsonPathInStencilConfig = (stencilConfigSourceFile: ts.SourceFile): string => {
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

/**
 * Finds the absolute file path for a given relative path by traversing up the directory tree.
 *
 * This function is useful when searching for a specific file within a project structure
 * by starting from a given path and moving up until the file is found or the root directory is reached.
 *
 * @param {string | undefined} basePath - The starting path to begin the search.
 * @param {string} targetFileName - The name of the file or relative path to search for.
 * @returns {string | undefined} - The absolute path to the file if found; otherwise, `undefined`.
 */
export const findAbsoluteFilePath = (basePath: string | undefined, targetFileName: string): string | undefined => {
    if (!basePath) {
        console.error('[fileUtils] No base path provided.');
        return undefined;
    }

    let absolutePath = fspath.isAbsolute(basePath) ? basePath : fspath.resolve(basePath);
    let absoluteFilePath = fspath.join(absolutePath, targetFileName);

    while (!fs.existsSync(absoluteFilePath) && absolutePath !== fspath.dirname(absolutePath)) {
        absolutePath = fspath.dirname(absolutePath);
        absoluteFilePath = fspath.join(absolutePath, targetFileName);
    }

    if (!fs.existsSync(absoluteFilePath)) {
        console.error('[fileUtils] Absolute file not found:', absoluteFilePath);
        return undefined;
    }

    return absoluteFilePath;
};