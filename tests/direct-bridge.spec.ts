import { describe, expect, it, vi } from 'vitest'
import { isBridgeableDirectCall, executeBridgeDirectCall } from '../src/normalizers/direct-bridge.ts'
import type { ToolRuntime, ToolDispatchExecution } from '../src/types.ts'

function execution(overrides: Partial<ToolDispatchExecution> = {}): ToolDispatchExecution {
  return {
    name: 'bash',
    arguments: { command: 'echo hello' },
    callId: 'c1',
    rootCallId: 'root-1',
    token: Symbol('token'),
    agent: { session: { id: 'session-1' } },
    signal: new AbortController().signal,
    ...overrides,
  }
}

describe('direct-bridge normalizer', () => {
  it('identifies a recoverable direct call only when the target and dispatcher exist', () => {
    const mockTools = {
      get: (name: string) => {
        if (name === 'run_code' || name === 'bash') return { name }
        return undefined
      },
      execute: vi.fn(),
    } as unknown as ToolRuntime

    expect(isBridgeableDirectCall(execution(), mockTools)).toBe(true)
    expect(isBridgeableDirectCall(execution({ name: 'unknown_custom_tool' }), mockTools)).toBe(false)
    expect(isBridgeableDirectCall(execution({ parent: Symbol('parent') }), mockTools)).toBe(false)
  })

  it('does not claim a bridge when the target tool is absent', () => {
    const mockTools = {
      get: (name: string) => name === 'run_code' ? { name } : undefined,
      execute: vi.fn(),
    } as unknown as ToolRuntime

    expect(isBridgeableDirectCall(execution(), mockTools)).toBe(false)
  })

  it('re-dispatches through tools.execute and preserves execution context', async () => {
    let dispatched: Record<string, unknown> | undefined
    const result = {
      isError: false as const,
      value: { ok: true },
      content: [{ type: 'text', text: 'hello' }],
      additionalContexts: [{ source: 'tool' }],
      concludesTurn: true as const,
    }
    const mockTools = {
      get: (name: string) => ({ name }),
      execute: vi.fn(async (input: Record<string, unknown>) => {
        dispatched = input
        return result
      }),
    } as unknown as ToolRuntime
    const agent = { session: { id: 'session-1' } }
    const signal = new AbortController().signal
    const mockExec = execution({ agent, signal })

    await expect(executeBridgeDirectCall(mockExec, mockTools)).resolves.toBe(result)
    expect(dispatched).toMatchObject({
      name: 'bash',
      arguments: { command: 'echo hello' },
      rootCallId: 'root-1',
      agent,
      parent: mockExec.token,
      signal,
    })
    expect(dispatched?.['callId']).toBe('c1:normalizer:bridge-bash')
  })

  it('returns an explicit failure when the original token is unavailable', async () => {
    const mockTools = {
      get: (name: string) => ({ name }),
      execute: vi.fn(),
    } as unknown as ToolRuntime

    const result = await executeBridgeDirectCall(execution({ token: undefined }), mockTools)
    expect(result.isError).toBe(true)
    expect(result.content?.[0]?.text).toContain('execution token')
    expect(mockTools.execute).not.toHaveBeenCalled()
  })
})
