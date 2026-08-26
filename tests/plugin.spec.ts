import { describe, expect, it, vi } from 'vitest'
import { apply } from '../src/index.ts'

function createMockContext() {
  const listeners: Record<string, ((...args: any[]) => any)[]> = {}
  return {
    tools: {
      get: vi.fn(),
      execute: vi.fn(),
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

  it('observes an unread file and retries a guarded mutation through the host dispatcher', async () => {
    const ctx = createMockContext()
    const agent = { session: { header: { cwd: '/workspace' } } }
    const calls: Array<Record<string, unknown>> = []
    ctx.tools.get.mockImplementation((name: string) => {
      if (name === 'read' || name === 'edit') return { name }
      return undefined
    })
    ctx.tools.execute.mockImplementation(async (input: Record<string, unknown>) => {
      calls.push(input)
      return {
        isError: false,
        value: { ok: true },
        content: [{ type: 'text', text: `${String(input.name)} ok` }],
      }
    })

    apply(ctx as any, { autoObserveFiles: true })

    const token = Symbol('token')
    const exec = {
      name: 'edit',
      arguments: { file_path: 'src/file.ts', old_string: 'a', new_string: 'b' },
      callId: 'c3',
      rootCallId: 'root-3',
      token,
      agent,
      signal: new AbortController().signal,
    }
    const next = vi.fn().mockResolvedValue({
      isError: true,
      content: [{ type: 'text', text: 'read first' }],
      error: { message: 'edit requires reading first', info: { code: 'FS_NOT_OBSERVED' } },
    })

    const result = await ctx.runWaterfall('tools/execute', exec, next)

    expect(result.isError).toBe(false)
    expect(next).toHaveBeenCalledOnce()
    expect(calls.map(call => call.name)).toEqual(['read', 'edit'])
    expect(calls[0]).toMatchObject({
      arguments: { file_path: '/workspace/src/file.ts' },
      rootCallId: 'root-3',
      parent: token,
      agent,
    })
    expect(calls[1]).toMatchObject({
      arguments: { file_path: '/workspace/src/file.ts', old_string: 'a', new_string: 'b' },
      rootCallId: 'root-3',
      parent: token,
      agent,
    })
  })

  it('bridges only an observed UNKNOWN_TOOL result through nested tools.execute', async () => {
    const ctx = createMockContext()
    const agent = { session: { id: 'session-4' } }
    const calls: Array<Record<string, unknown>> = []
    ctx.tools.get.mockImplementation((name: string) => {
      if (name === 'run_code' || name === 'bash') return { name }
      return undefined
    })
    ctx.tools.execute.mockImplementation(async (input: Record<string, unknown>) => {
      calls.push(input)
      return { isError: false, value: { stdout: 'ok' }, content: [{ type: 'text', text: 'ok' }] }
    })

    apply(ctx as any, { autoBridgeDirectTools: true })

    const token = Symbol('token')
    const exec = {
      name: 'bash',
      arguments: { command: 'echo ok' },
      callId: 'c4',
      rootCallId: 'root-4',
      token,
      agent,
      signal: new AbortController().signal,
    }
    const next = vi.fn().mockResolvedValue({
      isError: true,
      content: [{ type: 'text', text: 'unknown tool' }],
      error: { message: 'unknown tool "bash"', info: { code: 'UNKNOWN_TOOL' } },
    })

    const result = await ctx.runWaterfall('tools/execute', exec, next)

    expect(result.isError).toBe(false)
    expect(next).toHaveBeenCalledOnce()
    expect(calls).toHaveLength(1)
    expect(calls[0]).toMatchObject({
      name: 'bash',
      arguments: { command: 'echo ok' },
      rootCallId: 'root-4',
      parent: token,
      agent,
    })
  })

  it('uses the editor-reported line count to retry an out-of-bounds view range', async () => {
    const ctx = createMockContext()
    const agent = { session: { header: { cwd: '/workspace' } } }
    const calls: Array<Record<string, unknown>> = []
    ctx.tools.get.mockImplementation((name: string) => name === 'str_replace_editor' ? { name } : undefined)
    ctx.tools.execute.mockImplementation(async (input: Record<string, unknown>) => {
      calls.push(input)
      return { isError: false, value: 'view ok', content: [{ type: 'text', text: 'view ok' }] }
    })

    apply(ctx as any, { autoClampRanges: true, autoObserveFiles: false })

    const exec = {
      name: 'str_replace_editor',
      arguments: { command: 'view', path: 'notes.md', view_range: [1, 99] },
      callId: 'c5',
      rootCallId: 'root-5',
      token: Symbol('token'),
      agent,
      signal: new AbortController().signal,
    }
    const next = vi.fn().mockResolvedValue({
      isError: true,
      content: [{ type: 'text', text: 'range invalid' }],
      error: { message: 'Invalid `view_range`: its second element should be smaller than the number of lines in the file: `10`' },
    })

    const result = await ctx.runWaterfall('tools/execute', exec, next)

    expect(result.isError).toBe(false)
    expect(calls).toHaveLength(1)
    expect(calls[0]).toMatchObject({
      name: 'str_replace_editor',
      arguments: { path: '/workspace/notes.md', view_range: [1, 10] },
    })
  })
})
