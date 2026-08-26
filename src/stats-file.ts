/**
 * Debounced on-disk mirror of the normalizer statistics snapshot.
 *
 * Gives operators a live observable of what the plugin actually intercepted
 * without any browser channel: read the file at any time to see real counts.
 *
 * @module dsh-tool-normalizer/stats-file
 */

import { mkdir, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'node:path'
import type { ToolNormalizerTracker } from './tracker.ts'

/** Snapshot file lives under the DSH home directory (default ~/.dsh). */
export function statsFilePath(): string {
  const home = process.env['DSH_HOME'] ?? join(homedir(), '.dsh')
  return join(home, 'tool-normalizer-stats.json')
}

let timer: ReturnType<typeof setTimeout> | undefined

/**
 * Schedule a coalesced snapshot write roughly one second after the last call;
 * bursts of tool events collapse into one disk write.
 */
export function persistSnapshotSoon(tracker: ToolNormalizerTracker): void {
  clearTimeout(timer)
  timer = setTimeout(() => {
    void mkdir(join(statsFilePath(), '..'), { recursive: true })
      .then(() => writeFile(statsFilePath(), JSON.stringify(tracker.getSnapshot(), null, 2)))
      .catch(() => {
        // An unwritable home directory must never break tool execution; the
        // in-memory tracker stays authoritative.
      })
  }, 1000)
  // A process exit before the flush loses at most one second of mirror.
  timer.unref?.()
}
