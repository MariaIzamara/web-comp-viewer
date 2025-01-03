import * as os from 'os';
import * as fs from 'fs';
import * as fspath from 'path';

/**
 * Normalizes a file path to ensure compatibility across different operating systems.
 * 
 * - On all platforms, the path is normalized by resolving unnecessary segments like `.` and `..`.
 * - On Windows, it adjusts paths that start with a forward slash (`/`) to remove the leading slash.
 * 
 * @param {string} path - The file path to be normalized.
 * @returns {string} - The normalized file path.
 */
export const normalizePath = (path: string): string | undefined => {
    let newPath = fspath.normalize(path);

    if (os.platform() === 'win32' && newPath.startsWith('/')) {
        newPath = newPath.slice(1);
    }

    return newPath;
};

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
        console.error('[path.utils] No base path provided.');
        return undefined;
    }

    let absolutePath = fspath.isAbsolute(basePath) ? basePath : fspath.resolve(basePath);
    let absoluteFilePath = fspath.join(absolutePath, targetFileName);

    while (!fs.existsSync(absoluteFilePath) && absolutePath !== fspath.dirname(absolutePath)) {
        absolutePath = fspath.dirname(absolutePath);
        absoluteFilePath = fspath.join(absolutePath, targetFileName);
    }

    if (!fs.existsSync(absoluteFilePath)) {
        console.error('[path.utils] Absolute file not found:', absoluteFilePath);
        return undefined;
    }

    return absoluteFilePath;
};