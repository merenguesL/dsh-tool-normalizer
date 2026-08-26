import { describe, expect, it, vi } from 'vitest'
import { apply } from '../src/index.ts'

function createMockContext() {
  const listeners: Record<string, ((...args: any[]) => any)[]> = {}
  return {
    tools: {
      get: vi.fn(),
    },
    systemPrompt: {
      section: vi.fn(),
    },
    on(event: string, fn: (...args: any[]) => any) {
      if (!listeners[event]) listeners[event] = []
      listeners[event].push(fn)
    },
    async runWaterfall(event: string, exec: any, next: () => Promise<any>) {
      const handlers = listeners[event] || []
      if (handlers.length === 0) return next()
      let index = 0
      const dispatch = async (): Promise<any> => {
        if (index < handlers.length) {
          const handler = handlers[index++]!
          return handler(exec, dispatch)
        }
        return next()
      }
      return dispatch()
    },
  }
}

describe('dsh-tool-normalizer plugin', () => {
  it('intercepts run_code calls and auto-fixes command argument', async () => {
    const ctx = createMockContext()
    ctx.tools.get.mockReturnValue(undefined)

    apply(ctx as any, { autoWrapRunCode: true })

    const exec = {
      name: 'run_code',
      arguments: { command: 'pnpm test' },
      callId: 'c1',
      rootCallId: 'c1',
      token: 'tok',
      signal: new AbortController().signal,
    }

    const next = vi.fn().mockResolvedValue({ content: [{ type: 'text', text: 'OK' }], isError: false })

    await ctx.runWaterfall('tools/execute', exec, next)

    expect(next).toHaveBeenCalled()
    expect(exec.arguments).toMatchObject({
      description: 'Execute command: pnpm test',
    })
    const healedCode = (exec.arguments as any).code as string
    expect(healedCode).toContain('"command":"pnpm test"')
    // v0.3.0: inner sub-calls now carry a generated description (required by
    // sub-dispatch schema validation)
    expect(healedCode).toContain('description:')
  })

  it('normalizes editor path and view ranges', async () => {
    const ctx = createMockContext()
    ctx.tools.get.mockReturnValue({ name: 'edit' })

    apply(ctx as any, { autoClampRanges: true })

    const exec = {
      name: 'edit',
      arguments: { path: 'relative/file.ts', view_range: [-1, 20] },
      callId: 'c2',
      rootCallId: 'c2',
      token: 'tok',
      signal: new AbortController().signal,
    }

    const next = vi.fn().mockResolvedValue({ content: [{ type: 'text', text: 'OK' }], isError: false })

    await ctx.runWaterfall('tools/execute', exec, next)

    expect(next).toHaveBeenCalled()
    expect((exec.arguments as any).path).toMatch(/^\//)
    expect((exec.arguments as any).view_range).toEqual([1, 20])
  })
})
