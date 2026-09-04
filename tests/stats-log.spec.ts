import { mkdtemp, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import {
  appendEvent,
  clearLog,
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
})
