/**
 * Reactive store for tool normalizer statistics and live trace.
 *
 * The browser never fabricates events: every statistic and record comes from
 * a real snapshot adopted into the store (tracker snapshot today; a server
 * feed can adopt through the same path). When nothing has been adopted the
 * store reports an empty state and the UI renders its designed empty face.
 *
 * @module dsh-tool-normalizer/client/store
 */

import { ToolNormalizerTracker, type NormalizerStats } from '../tracker.ts'

export interface NormalizerState {
  status: 'idle' | 'ready'
  stats: NormalizerStats
  activeTab: 'live' | 'analytics' | 'rules'
  searchQuery: string
  statusFilter: 'all' | 'healed' | 'failed' | 'direct'
}

const STORAGE_KEY = 'dsh_tool_normalizer_stats_v2'

/** Fresh zeroed statistics; shared by construction and reset. */
function emptyStats(): NormalizerStats {
  return {
    totalIntercepted: 0,
    healedSuccess: 0,
    healedFailed: 0,
    passThrough: 0,
    passThroughFailed: 0,
    estimatedTokensSaved: 0,
    healingSuccessRate: 0,
    byTool: {},
    byCategory: {},
    recentRecords: [],
  }
}

/** Per-key counter view the UI consumes: one plain number per key. */
type CountMap = Record<string, number>

/**
 * Coerce persisted `byTool`/`byCategory` members that may still carry the
 * retired counter-object shapes (`{ intercepted, ... }` /`{ count, ... }`)
 * into the flat numeric maps the UI ranks and renders.
 */
function coerceCounts(source: unknown): CountMap {
  if (source === null || typeof source !== 'object') return {}
  const out: CountMap = {}
  for (const [key, value] of Object.entries(source as Record<string, unknown>)) {
    if (typeof value === 'number') out[key] = value
    else if (value !== null && typeof value === 'object') {
      const counter = value as { intercepted?: unknown; count?: unknown }
      out[key] = typeof counter.intercepted === 'number'
        ? counter.intercepted
        : typeof counter.count === 'number' ? counter.count : 0
    }
  }
  return out
}

function coerceStats(stats: NormalizerStats): NormalizerStats {
  const records = Array.isArray(stats.recentRecords) ? stats.recentRecords : []
  const legacyHealedFailed = records.filter(record => record.wasHealed && record.status === 'failed').length
  const legacyPassThroughFailed = records.filter(record => !record.wasHealed && record.status === 'failed').length
  return {
    ...stats,
    healedFailed: typeof stats.passThroughFailed === 'number' ? stats.healedFailed : legacyHealedFailed,
    passThroughFailed: typeof stats.passThroughFailed === 'number'
      ? stats.passThroughFailed
      : legacyPassThroughFailed,
    estimatedTokensSaved: typeof stats.estimatedTokensSaved === 'number' ? stats.estimatedTokensSaved : 0,
    byTool: coerceCounts(stats.byTool),
    byCategory: coerceCounts(stats.byCategory),
  }
}

/** Structural check separating a real persisted snapshot from foreign JSON. */
function isPersistedStats(value: unknown): value is NormalizerStats {
  if (value === null || typeof value !== 'object') return false
  const candidate = value as Partial<NormalizerStats>
  return typeof candidate.totalIntercepted === 'number'
    && Array.isArray(candidate.recentRecords)
}

export class NormalizerStore {
  private current: NormalizerState

  private listeners = new Set<() => void>()

  constructor() {
    this.current = {
      status: 'idle',
      stats: this.loadFromStorage() ?? emptyStats(),
      activeTab: 'live',
      searchQuery: '',
      statusFilter: 'all',
    }
  }

  public getSnapshot = (): NormalizerState => {
    return this.current
  }

  public subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    return () => { this.listeners.delete(listener) }
  }

  public setActiveTab = (tab: 'live' | 'analytics' | 'rules'): void => {
    this.current = { ...this.current, activeTab: tab }
    this.notify()
  }

  public setSearchQuery = (query: string): void => {
    this.current = { ...this.current, searchQuery: query }
    this.notify()
  }

  public setStatusFilter = (filter: 'all' | 'healed' | 'failed' | 'direct'): void => {
    this.current = { ...this.current, statusFilter: filter }
    this.notify()
  }

  /** Adopt the freshest available snapshot; keeps the newest non-empty source. */
  /** Adopt the freshest available snapshot: host feed first, tracker fallback. */
  public refresh = (): void => {
    void this.refreshAsync()
  }

  private refreshAsync = async (): Promise<void> => {
    let adoptedFromFeed = false
    // Same-origin host feed (registered by the plugin's node half). The
    // server snapshot is authoritative whenever it answers with valid data.
    if (typeof fetch === 'function') {
      try {
        const res = await fetch('/plugin-api/tool-normalizer/stats', { cache: 'no-store' })
        if (res.ok) {
          const data = (await res.json()) as unknown
          if (isPersistedStats(data)) {
            this.current.stats = coerceStats(data)
            this.saveToStorage()
            adoptedFromFeed = true
          }
        }
      } catch {
        // Endpoint absent (older host, deployment without the webserver):
        // fall through to the local sources below.
      }
    }
    if (!adoptedFromFeed) {
      try {
        const liveSnapshot = ToolNormalizerTracker.getInstance().getSnapshot()
        if (liveSnapshot.totalIntercepted > this.current.stats.totalIntercepted) {
          this.current.stats = coerceStats(liveSnapshot)
          this.saveToStorage()
        }
      } catch {
        // Tracker unavailable in this environment; keep current view.
      }
    }
    this.current.status = 'ready'
    this.notify()
  }

  public reset = (): void => {
    if (typeof fetch === 'function') {
      void fetch('/plugin-api/tool-normalizer/reset', { method: 'POST', cache: 'no-store' }).catch(() => {
        // Older hosts have no reset route; the local view still clears safely.
      })
    }
    try {
      ToolNormalizerTracker.getInstance().reset()
    } catch {
      // The tracker lives outside the browser half when no host bridge is
      // mounted; clearing the local view is still the requested outcome.
    }
    this.current = {
      ...this.current,
      stats: emptyStats(),
      statusFilter: 'all',
      searchQuery: '',
    }
    this.saveToStorage()
    this.notify()
  }

  public exportReport = (): void => {
    try {
      const payload = JSON.stringify(this.current.stats, null, 2)
      const anchor = document.createElement('a')
      anchor.setAttribute('href', 'data:text/json;charset=utf-8,' + encodeURIComponent(payload))
      anchor.setAttribute('download', `dsh_tool_normalizer_report_${new Date().toISOString().slice(0, 10)}.json`)
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
    } catch {
      // Download gestures can be blocked by embedders; the view stays usable.
    }
  }

  private loadFromStorage(): NormalizerStats | null {
    if (typeof localStorage === 'undefined') return null
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw && isPersistedStats(JSON.parse(raw))) {
        return coerceStats(JSON.parse(raw) as NormalizerStats)
      }
    } catch {
      // Corrupt or unavailable storage degrades to the empty state.
    }
    return null
  }

  private saveToStorage(): void {
    if (typeof localStorage === 'undefined') return
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.current.stats))
    } catch {
      // Quota or privacy-mode failures must not break rendering.
    }
  }

  private notify(): void {
    for (const listener of this.listeners) {
      listener()
    }
  }
}
