/**
 * Normalizer for editor arguments and view ranges.
 *
 * @module dsh-tool-normalizer/normalizers/range-clamper
 */
/**
 * Normalizes file paths and parameters for editor tools like `str_replace_editor` or `edit`.
 * Ensures paths are absolute and view ranges are valid.
 *
 * @param toolName - Name of the editor tool.
 * @param rawArgs - Raw arguments object from model.
 * @param cwd - Current working directory.
 * @returns Normalized arguments.
 */
export declare function normalizeEditorArguments(toolName: string, rawArgs: unknown, cwd?: string): Record<string, unknown>;
