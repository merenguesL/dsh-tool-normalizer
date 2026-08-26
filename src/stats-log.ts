/**
 * Durable JSONL event log for normalizer statistics.
 *
 * Every intercepted event appends one JSON line — O(1) per write, no size
 * ceiling. Boot-time replay rebuilds the in-memory aggregates and the
 * dashboard's recent-window from the full history, so statistics accumulate
 * across restarts.
 *
 * @module dsh-tool-normalizer/stats-log
 */

import { appendFile, mkdir, readFile, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { ToolNormalizerTracker, type NormalizerRecord, type NormalizerStats } from './tracker.ts'

/** Event log lives under the DSH home directory (default ~/.dsh). */
export function statsLogPath(): string {
  const home = process.env['DSH_HOME'] ?? join(homedir(), '.dsh')
  return join(home, 'tool-normalizer-events.jsonl')
}

function num(v: unknown): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : 0
}

/** Per-healed-call cost estimate; set at apply time so replay matches live accounting. */
let retryTokenCost = 0

/** Configure the projection cost before `restoreFromLog` runs. */
export function setRetryTokenCost(cost: number): void {
  retryTokenCost = Number.isFinite(cost) && cost > 0 ? Math.round(cost) : 0
}

/**
 * Replay the whole log and restore cumulative aggregates into the tracker.
 * One malformed line (torn tail from a crash mid-write) skips that line only.
 */
export async function restoreFromLog(tracker: ToolNormalizerTracker): Promise<void> {
  let raw: string
  try {
    raw = await readFile(statsLogPath(), 'utf-8')
  } catch {
    return
  }
  const totals = {
    totalIntercepted: 0, healedSuccess: 0, healedFailed: 0, passThrough: 0,
    estimatedTokensSaved: 0,
  }
  const byTool: Record<string, number> = {}
  const byCategory: Record<string, number> = {}
  const records: NormalizerRecord[] = []
  for (const line of raw.split('\n')) {
    if (!line.trim()) continue
    let record: NormalizerRecord
    try {
      const parsed = JSON.parse(line) as NormalizerRecord
      if (typeof parsed !== 'object' || parsed === null || typeof parsed.time !== 'number') continue
      record = parsed
    } catch {
      continue
    }
    totals.totalIntercepted++
    if (record.status === 'success' && record.wasHealed) totals.healedSuccess++
    else if (record.status === 'failed') totals.healedFailed++
    else totals.passThrough++
    byTool[record.toolName] = (byTool[record.toolName] ?? 0) + 1
    byCategory[record.category] = (byCategory[record.category] ?? 0) + 1
    records.push(record)
  }
  tracker.restore({
    ...totals,
    estimatedTokensSaved: totals.healedSuccess * retryTokenCost,
    healingSuccessRate: 100,
    byTool,
    byCategory,
    recentRecords: records.sort((a, b) => b.time - a.time),
  })
}

/** Append one event line; flush errors never break tool execution. */
export function appendEvent(record: NormalizerRecord): void {
  void mkdir(join(statsLogPath(), '..'), { recursive: true })
    .then(() => appendFile(statsLogPath(), JSON.stringify(record) + '\n'))
    .catch(() => {
      // An unwritable home directory must never break tool execution; the
      // in-memory tracker stays authoritative.
    })
}

/** Reset clears the log file so a dashboard clear is durable too. */
export function clearLog(): void {
  void writeFile(statsLogPath(), '').catch(() => { /* same tolerance as append */ })
}
