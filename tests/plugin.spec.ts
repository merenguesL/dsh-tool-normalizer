import { Context } from '@deepseek-ai/cordis'
import { describe, expect, it, vi } from 'vitest'
import { apply } from '../src/index.ts'
import type { ToolDispatchExecution } from '@deepseek-ai/dsh-tools'

describe('dsh-tool-normalizer plugin', () => {
  it('intercepts run_code calls and auto-fixes command argument', async () => {
    const ctx = new Context()
    // Mock tools runtime service
    ctx.tools = {
      get: vi.fn().mockReturnValue(undefined),
    } as any

    apply(ctx, { autoWrapRunCode: true })

    const exec: ToolDispatchExecution = {
      name: 'run_code',
      arguments: { command: 'pnpm test' },
      callId: 'c1' as any,
      rootCallId: 'c1' as any,
      token: 'tok' as any,
      signal: new AbortController().signal,
    }

    const next = vi.fn().mockResolvedValue({ content: [{ type: 'text', text: 'OK' }], isError: false })

    await ctx.waterfall(ctx, 'tools/execute', exec, next)

    expect(next).toHaveBeenCalled()
    expect(exec.arguments).toMatchObject({
      description: 'Execute command: pnpm test',
    })
    expect((exec.arguments as any).code).toContain('await tools.bash({"command":"pnpm test"})')
  })

  it('normalizes editor path and view ranges', async () => {
    const ctx = new Context()
    ctx.tools = {
      get: vi.fn().mockReturnValue({ name: 'edit' }),
    } as any

    apply(ctx, { autoClampRanges: true })

    const exec: ToolDispatchExecution = {
      name: 'edit',
      arguments: { path: 'relative/file.ts', view_range: [-1, 20] },
      callId: 'c2' as any,
      rootCallId: 'c2' as any,
      token: 'tok' as any,
      signal: new AbortController().signal,
    }

    const next = vi.fn().mockResolvedValue({ content: [{ type: 'text', text: 'OK' }], isError: false })

    await ctx.waterfall(ctx, 'tools/execute', exec, next)

    expect(next).toHaveBeenCalled()
    expect((exec.arguments as any).path).toMatch(/^\//)
    expect((exec.arguments as any).view_range).toEqual([1, 20])
  })
})
