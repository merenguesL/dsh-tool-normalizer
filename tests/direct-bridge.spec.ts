import { describe, expect, it } from 'vitest'
import { isBridgeableDirectCall, executeBridgeDirectCall } from '../src/normalizers/direct-bridge.ts'
import type { ToolRuntime, ToolDispatchExecution } from '../src/types.ts'

describe('direct-bridge normalizer', () => {
  it('identifies bridgeable tools when run_code is registered but direct tool is not', () => {
    const mockTools = {
      get: (name: string) => {
        if (name === 'run_code') return { name: 'run_code' }
        return undefined
      },
    } as ToolRuntime

    expect(isBridgeableDirectCall('bash', mockTools)).toBe(true)
    expect(isBridgeableDirectCall('read', mockTools)).toBe(true)
    expect(isBridgeableDirectCall('write', mockTools)).toBe(true)
    expect(isBridgeableDirectCall('grep', mockTools)).toBe(true)
    expect(isBridgeableDirectCall('unknown_custom_tool', mockTools)).toBe(false)
  })

  it('does not bridge if direct tool is already registered', () => {
    const mockTools = {
      get: (name: string) => {
        if (name === 'bash') return { name: 'bash' }
        if (name === 'run_code') return { name: 'run_code' }
        return undefined
      },
    } as ToolRuntime

    expect(isBridgeableDirectCall('bash', mockTools)).toBe(false)
  })

  it('synthesizes and executes run_code for bridgeable tool', async () => {
    let executedArgs: any = null
    const mockTools = {
      get: (name: string) => {
        if (name === 'run_code') {
          return {
            name: 'run_code',
            execute: async (exec: any) => {
              executedArgs = exec.arguments
              return { isError: false, content: [{ type: 'text', text: 'hello' }] }
            },
          }
        }
        return undefined
      },
    } as unknown as ToolRuntime

    const mockExec: ToolDispatchExecution = {
      name: 'bash',
      arguments: { command: 'echo hello' },
      callId: 'c1',
      rootCallId: 'c1',
      token: 'tok',
      signal: new AbortController().signal,
    }

    const result = await executeBridgeDirectCall(mockExec, mockTools)
    expect(result.isError).toBe(false)
    expect(executedArgs).toBeDefined()
    expect(executedArgs.description).toContain('Execute bash in Code-Mode')
    expect(executedArgs.code).toContain('await tools.bash({"command":"echo hello"})')
  })
})
