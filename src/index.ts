/**
 * Auto-healing, argument normalization, and Code-Mode direct tool bridging for DeepSeek Harness.
 *
 * @module dsh-tool-normalizer
 */

import { executeBridgeDirectCall, isBridgeableDirectCall } from './normalizers/direct-bridge.ts'
import { normalizeEditorArguments } from './normalizers/range-clamper.ts'
import { normalizeRunCodeArguments } from './normalizers/run-code.ts'
import { registerPromptGuidance } from './prompt.ts'
import { ToolNormalizerTracker } from './tracker.ts'
import type { Config, ToolDispatchExecution, ToolExecutionResult } from './types.ts'

export * from './types.ts'
export * from './tracker.ts'
export * from './normalizers/run-code.ts'
export * from './normalizers/range-clamper.ts'
export * from './normalizers/direct-bridge.ts'
export * from './prompt.ts'

/** Cordis plugin identifier. */
export const name = 'tool-normalizer'

/** Injected services. */
export const inject = {
  required: ['tools'],
  optional: ['systemPrompt'],
}

/**
 * Applies the tool normalizer and auto-healing plugin.
 *
 * @param ctx - Cordis Context.
 * @param userConfig - Plugin configuration.
 */
export function apply(ctx: any, userConfig: Config = {}): void {
  const config: Required<Config> = {
    autoWrapRunCode: userConfig.autoWrapRunCode ?? true,
    autoBridgeDirectTools: userConfig.autoBridgeDirectTools ?? true,
    autoObserveFiles: userConfig.autoObserveFiles ?? true,
    autoClampRanges: userConfig.autoClampRanges ?? true,
    injectPrompt: userConfig.injectPrompt ?? true,
  }

  const tracker = ToolNormalizerTracker.getInstance()

  // Register dynamic prompt guidelines if enabled
  if (config.injectPrompt) {
    registerPromptGuidance(ctx)
  }

  // Intercept and normalize tool dispatches
  ctx.on('tools/execute', async (exec: ToolDispatchExecution, next: () => Promise<ToolExecutionResult>): Promise<ToolExecutionResult> => {
    const rawArgsStr = JSON.stringify(exec.arguments ?? {})
    const startTime = Date.now()
    const eventId = `norm_${startTime}_${Math.random().toString(36).slice(2, 8)}`

    // 1. Direct tool to Code-Mode bridging when tool is not registered directly
    if (config.autoBridgeDirectTools && isBridgeableDirectCall(exec.name, ctx.tools)) {
      const result = await executeBridgeDirectCall(exec, ctx.tools)
      tracker.record({
        id: eventId,
        time: startTime,
        toolName: exec.name,
        category: 'UNKNOWN_TOOL',
        wasHealed: true,
        originalArgsPreview: rawArgsStr.slice(0, 150),
        normalizedArgsPreview: `Bridged to run_code(tools.${exec.name})`,
        status: result.isError ? 'failed' : 'success',
        errorMessage: result.isError && result.error ? result.error.message : undefined,
      })
      return result
    }

    let wasHealed = false
    let healCategory: 'INVALID_ARGS' | 'RANGE_CLAMP' | 'CODE_WRAP' | 'PASSTHROUGH' = 'PASSTHROUGH'
    let normalizedPreview: string | undefined

    // 2. Normalize `run_code` arguments (handle command -> code, missing description, etc.)
    if (exec.name === 'run_code' && config.autoWrapRunCode) {
      const originalObj = exec.arguments as Record<string, unknown> | undefined
      const isCmdPass = originalObj && ('command' in originalObj || 'cmd' in originalObj)
      const isMissingDesc = originalObj && !originalObj['description']
      
      const normalized = normalizeRunCodeArguments(exec.arguments)
      if (isCmdPass || isMissingDesc || JSON.stringify(normalized) !== rawArgsStr) {
        wasHealed = true
        healCategory = isCmdPass ? 'INVALID_ARGS' : 'CODE_WRAP'
        normalizedPreview = JSON.stringify(normalized).slice(0, 150)
      }
      exec.arguments = normalized
    }

    // 3. Normalize editor arguments (relative paths, view ranges)
    if ((exec.name === 'edit' || exec.name === 'str_replace_editor') && config.autoClampRanges) {
      const normalized = normalizeEditorArguments(exec.name, exec.arguments)
      if (JSON.stringify(normalized) !== rawArgsStr) {
        wasHealed = true
        healCategory = 'RANGE_CLAMP'
        normalizedPreview = JSON.stringify(normalized).slice(0, 150)
      }
      exec.arguments = normalized
    }

    // 4. Delegate to the downstream execution pipeline
    try {
      const result = await next()
      tracker.record({
        id: eventId,
        time: startTime,
        toolName: exec.name,
        category: healCategory,
        wasHealed,
        originalArgsPreview: rawArgsStr.slice(0, 150),
        normalizedArgsPreview: normalizedPreview,
        status: result.isError ? 'failed' : (wasHealed ? 'success' : 'passthrough'),
        errorMessage: result.isError && result.error ? result.error.message : undefined,
      })
      return result
    } catch (error: unknown) {
      // If downstream execution failed due to ToolNotFoundError (UNKNOWN_TOOL),
      // attempt fallback bridging to run_code
      if (
        config.autoBridgeDirectTools
        && isBridgeableDirectCall(exec.name, ctx.tools)
      ) {
        const bridgedResult = await executeBridgeDirectCall(exec, ctx.tools)
        tracker.record({
          id: eventId,
          time: startTime,
          toolName: exec.name,
          category: 'UNKNOWN_TOOL',
          wasHealed: true,
          originalArgsPreview: rawArgsStr.slice(0, 150),
          normalizedArgsPreview: `Fallback bridged to run_code(tools.${exec.name})`,
          status: bridgedResult.isError ? 'failed' : 'success',
        })
        return bridgedResult
      }

      tracker.record({
        id: eventId,
        time: startTime,
        toolName: exec.name,
        category: healCategory,
        wasHealed,
        originalArgsPreview: rawArgsStr.slice(0, 150),
        normalizedArgsPreview: normalizedPreview,
        status: 'failed',
        errorMessage: error instanceof Error ? error.message : String(error),
      })
      throw error
    }
  })
}

export default { name, inject, apply }
