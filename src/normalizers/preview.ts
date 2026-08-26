/**
 * Bounded argument previews used by diagnostic records and the dashboard.
 *
 * Keeping both the beginning and end makes appended top-level fields visible
 * without storing full code payloads in every event.
 *
 * @module dsh-tool-normalizer/normalizers/preview
 */

const PREVIEW_LIMIT = 180
const ELLIPSIS = ' … '

/**
 * Keep a bounded preview while retaining both ends of the serialized value.
 * @param text - Serialized arguments or diagnostic text.
 * @param limit - Maximum returned character count.
 * @returns A complete string or a head/tail preview with an omission marker.
 */
export function compactPreview(text: string, limit = PREVIEW_LIMIT): string {
  if (text.length <= limit) return text
  if (limit <= ELLIPSIS.length) return text.slice(0, Math.max(0, limit))

  const available = limit - ELLIPSIS.length
  const headLength = Math.ceil(available / 2)
  const tailLength = available - headLength
  return `${text.slice(0, headLength)}${ELLIPSIS}${text.slice(-tailLength)}`
}
