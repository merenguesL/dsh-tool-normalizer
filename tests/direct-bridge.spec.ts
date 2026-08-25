import { describe, expect, it } from 'vitest'
import { isBridgeableDirectCall, executeBridgeDirectCall } from '../src/normalizers/direct-bridge.ts'
import type { ToolRuntime, ToolDispatchExecution } from '@deepseek-ai/dsh-tools'

describe('direct-bridge normalizer', () => {
  it('identifies bridgeable tools when run_code is registered but direct tool is not', () => {
    const mockTools = {
      get: (name: string) => (name === 'run_code' ? {} : undefined),
    } as unknown as ToolRuntime

    expect(isBridgeableDirectCall('bash', mockTools)).toBe(true)
    expect(isBridgeableDirectCall('read', mockTools)).toBe(true)
    expect(isBridgeableDirectCall('write', mockTools)).toBe(true)
    expect(isBridgeableDirectCall('grep', mockTools)).toBe(true)
    expect(isBridgeableDirectCall('unknown_custom_tool', mockTools)).toBe(false)
  })

  it('does not bridge if direct tool is already registered', () => {
    const mockTools = {
      get: (name: string) => ({ name }),
    } as unknown as ToolRuntime

    expect(isBridgeableDirectCall('bash', mockTools)).toBe(false)
  })

  it('synthesizes and executes run_code for bridgeable tool', async () => {
    let executedArgs: any = null
    const mockTools = {
      get: (name: string) => {
        if (name === 'run_code') {
          return {
            name: 'run_code',
            execute: async (args: any) => {
              executedArgs = args
              return { success: true, stdout: 'hello' }
            },
          }
        }
        return undefined
      },
    } as unknown as ToolRuntime

    const mockExec: ToolDispatchExecution = {
      name: 'bash',
      arguments: { command: 'echo hello' },
      callId: 'c1' as any,
      rootCallId: 'c1' as any,
      token: 'tok' as any,
      signal: new AbortController().signal,
    }

    const result = await executeBridgeDirectCall(mockExec, mockTools)
    expect(result.isError).toBe(false)
    expect(executedArgs).toBeDefined()
    expect(executedArgs.description).toContain('Auto-bridged direct invocation: bash')
    expect(executedArgs.code).toContain('await tools.bash({"command":"echo hello"})')
  })
})
