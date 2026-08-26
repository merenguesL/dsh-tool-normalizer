import { describe, expect, it, beforeEach } from 'vitest'
import { ToolNormalizerTracker } from '../src/tracker.ts'

describe('ToolNormalizerTracker', () => {
  let tracker: ToolNormalizerTracker

  beforeEach(() => {
    tracker = ToolNormalizerTracker.getInstance()
    tracker.setPersistPassthrough(false)
    tracker.setRetryTokenCost(0)
    tracker.reset()
  })

  it('records successful healed events and updates aggregates', () => {
    tracker.record({
      id: 'e1',
      time: 1000,
      toolName: 'run_code',
      category: 'INVALID_ARGS',
      wasHealed: true,
      originalArgsPreview: '{"command":"ls"}',
      normalizedArgsPreview: '{"code":"await tools.bash(...)"}',
      status: 'success',
    })

    const snap = tracker.getSnapshot()
    expect(snap.totalIntercepted).toBe(1)
    expect(snap.healedSuccess).toBe(1)
    expect(snap.healedFailed).toBe(0)
    expect(snap.passThroughFailed).toBe(0)
    expect(snap.healingSuccessRate).toBe(100)
    expect(snap.byTool['run_code']).toBe(1)
    expect(snap.byCategory['INVALID_ARGS']).toBe(1)
    expect(snap.recentRecords.length).toBe(1)
  })

  it('calculates healing success rate accurately when failures happen', () => {
    tracker.record({
      id: 'e1',
      time: 1000,
      toolName: 'run_code',
      category: 'INVALID_ARGS',
      wasHealed: true,
      originalArgsPreview: '{"command":"ls"}',
      status: 'success',
    })

    tracker.record({
      id: 'e2',
      time: 2000,
      toolName: 'run_code',
      category: 'INVALID_ARGS',
      wasHealed: true,
      originalArgsPreview: 'bad',
      status: 'failed',
      errorMessage: 'syntax error',
    })

    const snap = tracker.getSnapshot()
    expect(snap.totalIntercepted).toBe(2)
    expect(snap.healedSuccess).toBe(1)
    expect(snap.healedFailed).toBe(1)
    expect(snap.passThroughFailed).toBe(0)
    expect(snap.healingSuccessRate).toBe(50.0)
  })

  it('keeps untouched failures out of healing failures and rate', () => {
    tracker.record({
      id: 'e1',
      time: 1000,
      toolName: 'bash',
      category: 'PASSTHROUGH',
      wasHealed: false,
      originalArgsPreview: '{}',
      status: 'failed',
      errorMessage: 'tool failed',
    })

    const snap = tracker.getSnapshot()
    expect(snap.healedFailed).toBe(0)
    expect(snap.passThroughFailed).toBe(1)
    expect(snap.healingSuccessRate).toBe(0)
  })

  it('keeps normal pass-through calls out of the detailed ring by default', () => {
    tracker.setPersistPassthrough(false)
    tracker.record({
      id: 'e1',
      time: 1000,
      toolName: 'read',
      category: 'PASSTHROUGH',
      wasHealed: false,
      originalArgsPreview: '{}',
      status: 'passthrough',
    })
    expect(tracker.getSnapshot().totalIntercepted).toBe(1)
    expect(tracker.getSnapshot().passThrough).toBe(1)
    expect(tracker.getSnapshot().recentRecords).toHaveLength(0)
  })

  it('projects configured retry token cost for healed calls', () => {
    tracker.setRetryTokenCost(8000)
    tracker.record({
      id: 'e1',
      time: 1000,
      toolName: 'run_code',
      category: 'RUN_CODE_DESC',
      wasHealed: true,
      originalArgsPreview: '{}',
      status: 'success',
    })

    expect(tracker.getSnapshot().estimatedTokensSaved).toBe(8000)
  })
})
