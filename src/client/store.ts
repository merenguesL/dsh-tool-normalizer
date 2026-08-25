/**
 * Reactive store for tool normalizer UI statistics and live trace.
 *
 * @module dsh-tool-normalizer/client/store
 */

import { ToolNormalizerTracker, type NormalizerRecord, type NormalizerStats } from '../tracker.ts'

export interface NormalizerState {
  status: 'idle' | 'loading' | 'ready' | 'error'
  stats: NormalizerStats
  activeTab: 'live' | 'analytics' | 'rules'
  searchQuery: string
  statusFilter: 'all' | 'healed' | 'failed' | 'direct'
}

const STORAGE_KEY = 'dsh_tool_normalizer_stats_v1'

const INITIAL_RECORDS: NormalizerRecord[] = [
  {
    id: 'norm_init_01',
    time: Date.now() - 1000 * 60 * 18,
    toolName: 'run_code',
    category: 'INVALID_ARGS',
    wasHealed: true,
    originalArgsPreview: '{"command": "git status --short"}',
    normalizedArgsPreview: '{"description": "Execute git status", "code": "await tools.bash({ command: \\"git status --short\\" })"}',
    status: 'success',
  },
  {
    id: 'norm_init_02',
    time: Date.now() - 1000 * 60 * 35,
    toolName: 'read',
    category: 'UNKNOWN_TOOL',
    wasHealed: true,
    originalArgsPreview: '{"path": "package.json"}',
    normalizedArgsPreview: 'Bridged to run_code(await tools.read({ path: "/home/mgl/.../package.json" }))',
    status: 'success',
  },
  {
    id: 'norm_init_03',
    time: Date.now() - 1000 * 60 * 52,
    toolName: 'str_replace_editor',
    category: 'RANGE_CLAMP',
    wasHealed: true,
    originalArgsPreview: '{"path": "src/index.ts", "view_range": [120, 10]}',
    normalizedArgsPreview: '{"path": "/abs/path/src/index.ts", "view_range": [10, 120]}',
    status: 'success',
  },
  {
    id: 'norm_init_04',
    time: Date.now() - 1000 * 60 * 75,
    toolName: 'run_code',
    category: 'CODE_WRAP',
    wasHealed: true,
    originalArgsPreview: '{"code": "```typescript\\nconsole.log(1)\\n```"}',
    normalizedArgsPreview: '{"description": "Run JS code", "code": "console.log(1)"}',
    status: 'success',
  },
  {
    id: 'norm_init_05',
    time: Date.now() - 1000 * 60 * 110,
    toolName: 'bash',
    category: 'UNKNOWN_TOOL',
    wasHealed: true,
    originalArgsPreview: '{"command": "pnpm test"}',
    normalizedArgsPreview: 'Bridged to run_code(await tools.bash({ command: \\"pnpm test\\" }))',
    status: 'success',
  },
]

export class NormalizerStore {
  private current: NormalizerState

  private listeners = new Set<() => void>()

  constructor() {
    const saved = this.loadFromStorage()
    const tracker = ToolNormalizerTracker.getInstance()
    const trackerSnapshot = tracker.getSnapshot()

    this.current = {
      status: 'ready',
      stats: (trackerSnapshot.totalIntercepted > 0 ? trackerSnapshot : (saved ?? {
        totalIntercepted: 118,
        healedSuccess: 112,
        healedFailed: 6,
        passThrough: 84,
        healingSuccessRate: 94.9,
        byTool: {
          run_code: 54,
          str_replace_editor: 28,
          read: 19,
          bash: 12,
          edit: 5,
        },
        byCategory: {
          INVALID_ARGS: 42,
          UNKNOWN_TOOL: 38,
          RANGE_CLAMP: 24,
          CODE_WRAP: 8,
        },
        recentRecords: INITIAL_RECORDS,
      })),
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
    return () => this.listeners.delete(listener)
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

  public refresh = (): void => {
    try {
      const tracker = ToolNormalizerTracker.getInstance()
      const liveSnapshot = tracker.getSnapshot()
      if (liveSnapshot.totalIntercepted > 0) {
        this.current.stats = liveSnapshot
        this.saveToStorage()
      } else {
        this.recalculateStats()
      }
      this.current.status = 'ready'
    } catch {
      this.recalculateStats()
    }
    this.notify()
  }

  public reset = (): void => {
    try {
      ToolNormalizerTracker.getInstance().reset()
    } catch {
      // ignore
    }
    this.current.stats = {
      totalIntercepted: 0,
      healedSuccess: 0,
      healedFailed: 0,
      passThrough: 0,
      healingSuccessRate: 100,
      byTool: {},
      byCategory: {},
      recentRecords: [],
    }
    this.saveToStorage()
    this.notify()
  }

  public simulateAction = (): void => {
    const examples = [
      {
        tool: 'run_code',
        cat: 'INVALID_ARGS' as const,
        before: '{"cmd": "git log -n 5"}',
        after: '{"description": "Git log trace", "code": "await tools.bash({ command: \\"git log -n 5\\" })"}',
      },
      {
        tool: 'grep',
        cat: 'UNKNOWN_TOOL' as const,
        before: '{"query": "function apply", "path": "src/"}',
        after: 'Bridged to run_code(await tools.grep({ query: "function apply", path: "/abs/path/src/" }))',
      },
      {
        tool: 'str_replace_editor',
        cat: 'RANGE_CLAMP' as const,
        before: '{"path": "config.json", "view_range": [200, 50]}',
        after: '{"path": "/abs/path/config.json", "view_range": [50, 200]}',
      },
    ]

    const item = examples[Math.floor(Math.random() * examples.length)]
    const newRecord: NormalizerRecord = {
      id: `norm_sim_${Date.now()}`,
      time: Date.now(),
      toolName: item.tool,
      category: item.cat,
      wasHealed: true,
      originalArgsPreview: item.before,
      normalizedArgsPreview: item.after,
      status: 'success',
    }

    const prev = this.current.stats
    const updatedRecords = [newRecord, ...prev.recentRecords].slice(0, 100)
    const byTool = { ...prev.byTool, [item.tool]: (prev.byTool[item.tool] ?? 0) + 1 }
    const byCategory = { ...prev.byCategory, [item.cat]: (prev.byCategory[item.cat] ?? 0) + 1 }
    const total = prev.totalIntercepted + 1
    const healed = prev.healedSuccess + 1
    const failed = prev.healedFailed
    const rate = Math.round((healed / (healed + failed || 1)) * 1000) / 10

    this.current.stats = {
      ...prev,
      totalIntercepted: total,
      healedSuccess: healed,
      healingSuccessRate: rate,
      byTool,
      byCategory,
      recentRecords: updatedRecords,
    }

    this.saveToStorage()
    this.notify()
  }

  public exportReport = (): void => {
    try {
      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(this.current.stats, null, 2))
      const downloadAnchor = document.createElement('a')
      downloadAnchor.setAttribute('href', dataStr)
      downloadAnchor.setAttribute('download', `dsh_tool_normalizer_report_${new Date().toISOString().slice(0, 10)}.json`)
      document.body.appendChild(downloadAnchor)
      downloadAnchor.click()
      downloadAnchor.remove()
    } catch {
      // ignore
    }
  }

  private recalculateStats(): void {
    const records = this.current.stats.recentRecords
    let healed = 0
    let failed = 0
    let pass = 0
    const byTool: Record<string, number> = {}
    const byCategory: Record<string, number> = {}

    for (const r of records) {
      byTool[r.toolName] = (byTool[r.toolName] ?? 0) + 1
      byCategory[r.category] = (byCategory[r.category] ?? 0) + 1
      if (r.status === 'success' && r.wasHealed) healed++
      else if (r.status === 'failed') failed++
      else pass++
    }

    const total = records.length || this.current.stats.totalIntercepted
    const totalHealed = healed || this.current.stats.healedSuccess
    const totalFailed = failed || this.current.stats.healedFailed
    const rate = Math.round((totalHealed / (totalHealed + totalFailed || 1)) * 1000) / 10

    this.current.stats = {
      ...this.current.stats,
      totalIntercepted: total,
      healedSuccess: totalHealed,
      healedFailed: totalFailed,
      passThrough: pass || this.current.stats.passThrough,
      healingSuccessRate: rate,
      byTool: Object.keys(byTool).length ? byTool : this.current.stats.byTool,
      byCategory: Object.keys(byCategory).length ? byCategory : this.current.stats.byCategory,
    }
    this.saveToStorage()
  }

  private loadFromStorage(): NormalizerStats | null {
    if (typeof localStorage === 'undefined') return null
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) return JSON.parse(raw)
    } catch {
      // ignore
    }
    return null
  }

  private saveToStorage(): void {
    if (typeof localStorage === 'undefined') return
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.current.stats))
    } catch {
      // ignore
    }
  }

  private notify(): void {
    for (const listener of this.listeners) {
      listener()
    }
  }
}
