import { mkdtemp, readFile, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import {
  appendEvent,
  clearLog,
  compactLogIfOversized,
  flushStatsLog,
  restoreFromLog,
  statsLogPath,
  statsSummaryPath,
} from '../src/stats-log.ts'
import { ToolNormalizerTracker, type NormalizerRecord } from '../src/tracker.ts'

const originalVitest = process.env['VITEST']
const originalNodeEnv = process.env['NODE_ENV']
const originalDshHome = process.env['DSH_HOME']

afterEach(() => {
  if (originalVitest === undefined) delete process.env['VITEST']
  else process.env['VITEST'] = originalVitest
  if (originalNodeEnv === undefined) delete process.env['NODE_ENV']
  else process.env['NODE_ENV'] = originalNodeEnv
  if (originalDshHome === undefined) delete process.env['DSH_HOME']
  else process.env['DSH_HOME'] = originalDshHome
})

function record(overrides: Partial<NormalizerRecord>): NormalizerRecord {
  return {
    id: 'event',
    time: Date.now(),
    toolName: 'read',
    category: 'PASSTHROUGH',
    wasHealed: false,
    originalArgsPreview: '{}',
    status: 'passthrough',
    ...overrides,
  }
}

describe('stats-log persistence policy', () => {
  it('aggregates normal pass-through calls without writing a detail line', async () => {
    const home = await mkdtemp(join(tmpdir(), 'dsh-tool-normalizer-'))
    process.env['DSH_HOME'] = home
    delete process.env['VITEST']
    delete process.env['NODE_ENV']

    const tracker = new ToolNormalizerTracker()
    tracker.setPersistPassthrough(false)
    tracker.record(record({ id: 'pass' }))
    appendEvent(record({ id: 'pass' }), tracker.getSnapshot())
    tracker.record(record({ id: 'failure', status: 'failed', errorMessage: 'failed' }))
    appendEvent(record({ id: 'failure', status: 'failed', errorMessage: 'failed' }), tracker.getSnapshot())
    await flushStatsLog()

    const lines = (await readFile(statsLogPath(), 'utf8')).trim().split('\n')
    const summary = JSON.parse(await readFile(statsSummaryPath(), 'utf8')) as { passThrough: number; passThroughFailed: number }
    expect(lines).toHaveLength(1)
    expect(JSON.parse(lines[0]!).id).toBe('failure')
    expect(summary).toMatchObject({ passThrough: 1, passThroughFailed: 1 })

    await clearLog()
    await flushStatsLog()
    expect((await readFile(statsLogPath(), 'utf8'))).toBe('')
  })

  it('round-trips RUN_CODE_SYNTAX diagnostic records across restarts', async () => {
    const home = await mkdtemp(join(tmpdir(), 'dsh-tool-normalizer-'))
    process.env['DSH_HOME'] = home
    delete process.env['VITEST']
    delete process.env['NODE_ENV']

    const tracker = new ToolNormalizerTracker()
    const event = record({
      id: 'syntax-1',
      toolName: 'run_code',
      category: 'RUN_CODE_SYNTAX',
      wasHealed: true,
      status: 'failed',
      errorMessage: 'parse failed',
    })
    tracker.record(event)
    appendEvent(event, tracker.getSnapshot())
    await flushStatsLog()

    const revived = new ToolNormalizerTracker()
    await restoreFromLog(revived)
    expect(revived.getSnapshot()).toMatchObject({ healedFailed: 1 })
    expect(revived.getSnapshot().byCategory['RUN_CODE_SYNTAX']).toBe(1)

    await clearLog()
    await flushStatsLog()
  })

  it('round-trips READ_ARGS diagnostic records across restarts', async () => {
    const home = await mkdtemp(join(tmpdir(), 'dsh-tool-normalizer-'))
    process.env['DSH_HOME'] = home
    delete process.env['VITEST']
    delete process.env['NODE_ENV']

    const tracker = new ToolNormalizerTracker()
    const event = record({
      id: 'read-args-1',
      toolName: 'read',
      category: 'READ_ARGS',
      wasHealed: true,
      status: 'success',
    })
    tracker.record(event)
    appendEvent(event, tracker.getSnapshot())
    await flushStatsLog()

    const revived = new ToolNormalizerTracker()
    await restoreFromLog(revived)
    expect(revived.getSnapshot()).toMatchObject({ healedSuccess: 1 })
    expect(revived.getSnapshot().byCategory['READ_ARGS']).toBe(1)

    await clearLog()
    await flushStatsLog()
  })

  it('writes a rotated-safe detail line and keeps counters flowing when a record carries a live reference', async () => {
    const home = await mkdtemp(join(tmpdir(), 'dsh-tool-normalizer-'))
    process.env['DSH_HOME'] = home
    delete process.env['VITEST']
    delete process.env['NODE_ENV']

    const tracker = new ToolNormalizerTracker()
    // Simulates the pre-fix path: a live host reference reached the record.
    const live: Record<string, unknown> = { session: { id: 's' } }
    live['self'] = live
    const event = record({
      id: 'live-ref',
      status: 'failed',
      errorMessage: 'boom',
    }) as unknown as Record<string, unknown>
    event['agent'] = live
    const poisoned = event as unknown as NormalizerRecord

    tracker.record(poisoned)
    appendEvent(poisoned, tracker.getAggregate())
    await flushStatsLog()

    // The counters must survive even when the detail line cannot round-trip verbatim.
    const summary = JSON.parse(await readFile(statsSummaryPath(), 'utf8')) as {
      passThroughFailed: number
      failuresByTool: Record<string, number>
    }
    expect(summary.passThroughFailed).toBe(1)
    expect(summary.failuresByTool['read']).toBe(1)

    const lines = (await readFile(statsLogPath(), 'utf8')).trim().split('\n')
    expect(lines).toHaveLength(1)
    expect(JSON.parse(lines[0]!).id).toBe('live-ref')

    await clearLog()
    await flushStatsLog()
  })

  it('round-trips failure breakdowns across restarts', async () => {
    const home = await mkdtemp(join(tmpdir(), 'dsh-tool-normalizer-'))
    process.env['DSH_HOME'] = home
    delete process.env['VITEST']
    delete process.env['NODE_ENV']

    const tracker = new ToolNormalizerTracker()
    const event = record({
      id: 'failure-1',
      toolName: 'edit',
      category: 'FS_OBSERVED',
      wasHealed: true,
      status: 'failed',
      errorMessage: 'stale',
    })
    tracker.record(event)
    appendEvent(event, tracker.getAggregate())
    await flushStatsLog()

    const revived = new ToolNormalizerTracker()
    await restoreFromLog(revived)
    expect(revived.getSnapshot().failuresByTool['edit']).toBe(1)
    expect(revived.getSnapshot().failuresByCategory['FS_OBSERVED']).toBe(1)

    await clearLog()
    await flushStatsLog()
  })

  it('compacts an oversized detail log to its newest valid slice', async () => {
    const home = await mkdtemp(join(tmpdir(), 'dsh-tool-normalizer-'))
    process.env['DSH_HOME'] = home
    delete process.env['VITEST']
    delete process.env['NODE_ENV']

    const line = (id: string): string =>
      `${JSON.stringify(record({ id, toolName: 'bash', category: 'PASSTHROUGH', wasHealed: false, status: 'failed', errorMessage: `boom-${'x'.repeat(240)}` }))}\n`
    const lines: string[] = ['not json\n', '{"id":1}\n']
    for (let i = 0; i < 9000; i++) lines.push(line(`event-${i}`))
    lines.push('{"torn": ')
    await writeFile(statsLogPath(), lines.join(''), 'utf8')
    expect((await stat(statsLogPath())).size).toBeGreaterThan(2 * 1024 * 1024)

    await compactLogIfOversized()

    const size = (await stat(statsLogPath())).size
    expect(size).toBeLessThanOrEqual(1024 * 1024 + 512)
    const kept = (await readFile(statsLogPath(), 'utf8')).trim().split('\n')
    expect(JSON.parse(kept[0]!).id).not.toBe('event-0')
    expect(JSON.parse(kept[kept.length - 1]!).id).toBe('event-8999')

    await clearLog()
    await flushStatsLog()
  })
})
