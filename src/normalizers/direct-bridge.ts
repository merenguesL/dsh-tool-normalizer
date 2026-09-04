/**
 * Safe recovery for a direct tool call that reached the extensible dispatch
 * pipeline but was rejected as unknown by the host.
 *
 * The bridge deliberately re-enters `tools.execute()` as a nested dispatch.
 * That preserves the host's result materialization, policy stages, agent
 * scope, session ownership, cancellation, deferred contexts, and terminal
 * result handling. Calling a definition's `execute()` method directly is not
 * equivalent and is therefore not supported here.
 *
 * @module dsh-tool-normalizer/normalizers/direct-bridge
 */

import { executeNestedTool, recoveryFailure } from './nested-dispatch.ts'
import type { ToolDispatchExecution, ToolExecutionResult, ToolRuntime } from '../types.ts'

/** Standard capabilities that may be recovered when a host exposes them to the nested dispatcher. */
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
  // Observed in production UNKNOWN_TOOL results. Recovery still requires the
  // target to be visible in the same agent scope; a PTC-collapsed call denied
  // before the waterfall never reaches this plugin (see scope note in README).
  'web_fetch',
  'web_search',
  'todo_write',
  'skill',
  'ask_user_question',
])

/**
 * Checks whether the host can recover this call through a nested standard
 * dispatch. This is intentionally called only after an UNKNOWN_TOOL result;
 * probing before `next()` would replace valid native calls in `both` mode.
 *
 * @param exec - Failed direct call and its scope metadata.
 * @param tools - Tool runtime registry.
 * @returns True when the target definition and nested dispatcher are present.
 */
export function isBridgeableDirectCall(
  exec: Pick<ToolDispatchExecution, 'name' | 'agent' | 'parent'>,
  tools: ToolRuntime,
): boolean {
  if (exec.parent !== undefined || !BRIDGEABLE_TOOLS.has(exec.name)) return false
  if (typeof tools.execute !== 'function') return false

  // The reserved transport is the only reliable plugin-visible indication
  // that this deployment supports Code-Mode recovery. The target itself must
  // also be visible in the same agent scope; an absent target cannot be made
  // callable by fabricating a code snippet.
  return tools.get('run_code', exec.agent) !== undefined
    && tools.get(exec.name, exec.agent) !== undefined
}

/**
 * Re-dispatch the original call as a nested execution through the host API.
 *
 * @param exec - Direct call that the surrounding pipeline could not resolve.
 * @param tools - Tool runtime service.
 * @returns The host-created canonical result, including contexts and terminal state.
 */
export async function executeBridgeDirectCall(
  exec: ToolDispatchExecution,
  tools: ToolRuntime,
): Promise<ToolExecutionResult> {
  if (typeof tools.execute !== 'function') {
    return recoveryFailure(`Cannot recover '${exec.name}': the host tools.execute() dispatcher is unavailable.`)
  }
  if (exec.signal === undefined) {
    return recoveryFailure(`Cannot recover '${exec.name}': the original cancellation signal is unavailable.`)
  }
  if (exec.token === undefined) {
    return recoveryFailure(`Cannot recover '${exec.name}': the original execution token is unavailable.`)
  }
  return executeNestedTool(exec, tools, exec.name, exec.arguments ?? {}, `bridge-${exec.name}`)
}
