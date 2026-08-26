import { describe, expect, it } from 'vitest'
import { NormalizerStore } from '../src/client/store.ts'
import { ToolNormalizerTracker } from '../src/tracker.ts'

describe('NormalizerStore', () => {
  it('subscribes and receives updates on refresh', async () => {
    const store = new NormalizerStore()
    const tracker = ToolNormalizerTracker.getInstance()
    tracker.reset()

    let notified = false
    store.subscribe(() => {
      notified = true
    })

    tracker.record({
      id: 'e1',
      time: Date.now(),
      toolName: 'bash',
      category: 'UNKNOWN_TOOL',
      wasHealed: true,
      originalArgsPreview: '{"command":"ls"}',
      status: 'success',
    })

    store.refresh()
    // refresh adopts asynchronously (host feed attempt, then local tracker)
    await new Promise((resolve) => setTimeout(resolve, 20))
    expect(notified).toBe(true)
    expect(store.getSnapshot().stats.totalIntercepted).toBe(1)
    expect(store.getSnapshot().stats.healedSuccess).toBe(1)
    expect(store.getSnapshot().stats.estimatedTokensSaved).toBeGreaterThanOrEqual(0)
  })
})
