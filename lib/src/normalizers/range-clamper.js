/**
 * Normalizer for editor arguments and view ranges.
 *
 * @module dsh-tool-normalizer/normalizers/range-clamper
 */
import { isAbsolute, resolve } from 'node:path';
/**
 * Normalizes file paths and parameters for editor tools like `str_replace_editor` or `edit`.
 * Ensures paths are absolute and view ranges are valid.
 *
 * @param toolName - Name of the editor tool.
 * @param rawArgs - Raw arguments object from model.
 * @param cwd - Current working directory.
 * @returns Normalized arguments.
 */
export function normalizeEditorArguments(toolName, rawArgs, cwd = process.cwd()) {
    if (!rawArgs || typeof rawArgs !== 'object') {
        return {};
    }
    const args = { ...rawArgs };
    // Normalize path / file_path / TargetFile
    const pathKey = 'path' in args ? 'path' : ('file_path' in args ? 'file_path' : ('TargetFile' in args ? 'TargetFile' : undefined));
    if (pathKey && typeof args[pathKey] === 'string') {
        const rawPath = args[pathKey].trim();
        if (rawPath && !isAbsolute(rawPath) && !rawPath.startsWith('/')) {
            args[pathKey] = resolve(cwd, rawPath);
        }
    }
    // Normalize view_range if present
    if (Array.isArray(args['view_range']) && args['view_range'].length === 2) {
        const [start, end] = args['view_range'];
        if (typeof start === 'number' && typeof end === 'number') {
            const validStart = Math.max(1, Math.floor(start));
            const validEnd = Math.max(validStart, Math.floor(end));
            args['view_range'] = [validStart, validEnd];
        }
    }
    return args;
}
