/**
 * Bridge for direct tool calls made when the agent is in Code-Mode.
 *
 * @module dsh-tool-normalizer/normalizers/direct-bridge
 */

import type { ToolDispatchExecution, ToolExecutionResult, ToolRuntime } from '../types.ts'

/** Standard capabilities that can be auto-bridged into Code-Mode. */
const BRIDGEABLE_TOOLS = new Set([
  'bash',
  'read',
  'write',
  'grep',
  'edit',
  'glob',
  'str_replace_editor',
  'job_output',
  'job_kill',
])

/**
 * Checks whether a tool call can be bridged into `run_code`.
 * @param toolName - Name of the requested tool.
 * @param tools - Tool runtime registry.
 * @returns True if tool is bridgeable and `run_code` is available.
 */
export function isBridgeableDirectCall(toolName: string, tools: ToolRuntime): boolean {
  // If the tool is already registered directly, no need to bridge
  if (tools.get(toolName) !== undefined) {
    return false
  }

  // If run_code is registered and this is a standard bridgeable tool
  return BRIDGEABLE_TOOLS.has(toolName) && tools.get('run_code') !== undefined
}

/**
 * Synthesizes and executes a `run_code` call for a direct tool invocation.
 *
 * @param exec - Direct tool dispatch execution.
 * @param tools - Tool runtime service.
 * @returns Synthesized tool execution result.
 */
export async function executeBridgeDirectCall(
  exec: ToolDispatchExecution,
  tools: ToolRuntime,
): Promise<ToolExecutionResult> {
  const runCodeTool = tools.get('run_code')
  if (!runCodeTool || typeof runCodeTool.execute !== 'function') {
    return {
      content: [{
        type: 'text',
        text: `Tool '${exec.name}' is not registered, and 'run_code' fallback is unavailable.`,
      }],
      isError: true,
    }
  }

  // Synthesize JavaScript snippet for Code-Mode invocation
  const argsJson = JSON.stringify(exec.arguments ?? {})
  const syntheticCode = `const result = await tools.${exec.name}(${argsJson});\nreturn result;`

  const syntheticExec: ToolDispatchExecution = {
    name: 'run_code',
    arguments: {
      description: `[Auto-Bridged] Execute ${exec.name} in Code-Mode`,
      code: syntheticCode,
    },
    callId: exec.callId,
    rootCallId: exec.rootCallId,
    token: exec.token,
    signal: exec.signal,
  }

  try {
    return await runCodeTool.execute(syntheticExec)
  } catch (error: unknown) {
    return {
      content: [{
        type: 'text',
        text: `Auto-bridged execution of '${exec.name}' failed: ${error instanceof Error ? error.message : String(error)}`,
      }],
      isError: true,
      error: error instanceof Error ? error : new Error(String(error)),
    }
  }
}
