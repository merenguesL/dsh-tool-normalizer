/**
 * Reactive store for tool normalizer UI statistics.
 *
 * @module dsh-tool-normalizer/client/store
 */

import { ToolNormalizerTracker, type NormalizerStats } from '../tracker.ts'

export interface NormalizerState {
  status: 'idle' | 'loading' | 'ready' | 'error'
  stats: NormalizerStats
}

export class NormalizerStore {
  private current: NormalizerState = {
    status: 'idle',
    stats: {
      totalIntercepted: 0,
      healedSuccess: 0,
      healedFailed: 0,
      passThrough: 0,
      healingSuccessRate: 100,
      byTool: {},
      byCategory: {},
      recentRecords: [],
    },
  }

  private listeners = new Set<() => void>()

  constructor() {
    this.refresh()
  }

  public getSnapshot = (): NormalizerState => {
    return this.current
  }

  public subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  public refresh = (): void => {
    try {
      const tracker = ToolNormalizerTracker.getInstance()
      const stats = tracker.getSnapshot()
      this.current = {
        status: 'ready',
        stats,
      }
    } catch {
      this.current = {
        ...this.current,
        status: 'error',
      }
    }
    this.notify()
  }

  public reset = (): void => {
    try {
      const tracker = ToolNormalizerTracker.getInstance()
      tracker.reset()
      this.refresh()
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
