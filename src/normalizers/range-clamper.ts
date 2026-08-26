/**
 * Normalizer for editor arguments and view ranges.
 *
 * @module dsh-tool-normalizer/normalizers/range-clamper
 */

import { isAbsolute, resolve } from 'node:path'

/**
 * Normalizes file paths and parameters for editor tools like `str_replace_editor` or `edit`.
 * Ensures paths are absolute and view ranges are structurally valid. The
 * optional line count is used by a retry path after a real editor response
 * reports the file length; the pre-dispatch pass cannot know it safely.
 *
 * @param toolName - Name of the editor tool.
 * @param rawArgs - Raw arguments object from model.
 * @param cwd - Current working directory.
 * @param maxLines - Known file line count, when available.
 * @returns Normalized arguments.
 */
export function normalizeEditorArguments(
  toolName: string,
  rawArgs: unknown,
  cwd: string = process.cwd(),
  maxLines?: number,
): Record<string, unknown> {
  if (!rawArgs || typeof rawArgs !== 'object') {
    return {}
  }

  const args = { ...(rawArgs as Record<string, unknown>) }

  // Normalize path / file_path / TargetFile
  const pathKey = ['path', 'file_path', 'TargetFile']
    .find(key => typeof args[key] === 'string')
  if (pathKey && typeof args[pathKey] === 'string') {
    const rawPath = args[pathKey].trim()
    if (rawPath && !isAbsolute(rawPath)) {
      args[pathKey] = resolve(cwd, rawPath)
    }
  }

  // Normalize view_range if present
  if (Array.isArray(args['view_range']) && args['view_range'].length === 2) {
    const [start, end] = args['view_range'] as [unknown, unknown]
    if (typeof start === 'number' && Number.isFinite(start)
      && typeof end === 'number' && Number.isFinite(end)) {
      let validStart = Math.max(1, Math.floor(start))
      const isToEnd = toolName === 'str_replace_editor' && end === -1
      let validEnd = isToEnd ? -1 : Math.max(validStart, Math.floor(end))
      if (maxLines !== undefined && Number.isSafeInteger(maxLines) && maxLines > 0) {
        validStart = Math.min(validStart, maxLines)
        validEnd = isToEnd ? -1 : Math.min(validEnd, maxLines)
        if (!isToEnd) validEnd = Math.max(validStart, validEnd)
      }
      args['view_range'] = [validStart, validEnd]
    }
  }

  return args
}
