/**
 * Auto-healing, argument normalization, and Code-Mode direct tool bridging for DeepSeek Harness.
 *
 * @module dsh-tool-normalizer
 */

import { executeBridgeDirectCall, isBridgeableDirectCall } from './normalizers/direct-bridge.ts'
import { injectInnerDescriptions } from './normalizers/inner-description.ts'
import { normalizeEditorArguments } from './normalizers/range-clamper.ts'
import { normalizeRunCodeArguments } from './normalizers/run-code.ts'
import { registerPromptGuidance } from './prompt.ts'
import { appendEvent, restoreFromLog, setRetryTokenCost, statsLogPath } from './stats-log.ts'
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

/** Injected services required from Cordis context. */
export const inject = ['tools']

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
    estimatedRetryTokenCost: userConfig.estimatedRetryTokenCost ?? 8000,
  }

  const tracker = ToolNormalizerTracker.getInstance()
  setRetryTokenCost(config.estimatedRetryTokenCost)
  void restoreFromLog(tracker)

  /** Record one real event, append it to the durable log, and log a line. */
  const recordEvent = (record: Parameters<typeof tracker.record>[0]): void => {
    tracker.record(record)
    appendEvent(record)
    ctx.logger?.debug?.(
      `[tool-normalizer] ${record.toolName} category=${record.category} healed=${record.wasHealed} status=${record.status}`,
    )
  }
  ctx.logger?.info?.(`[tool-normalizer] active — intercepting tools/execute; history log: ${statsLogPath()}`)

  // Optional HTTP feed for the browser dashboard: same-origin GET returning
  // the live in-memory snapshot. Activation order is unconstrained, so the
  // webserver service may mount after this plugin: poll briefly instead of
  // giving up on the first ctx.get miss. Never declared as inject — a
  // CLI-only profile without any webserver must still load.
  let registerAttempts = 0
  const tryRegisterStatsRoute = (): void => {
    const webServer = typeof ctx.get === 'function' ? ctx.get('webServer') : ctx.webServer
    if (!webServer || typeof webServer.register !== 'function') {
      if (registerAttempts++ < 60) {
        const timer = setTimeout(tryRegisterStatsRoute, 1000)
        timer.unref?.()
      } else {
        ctx.logger?.warn?.('[tool-normalizer] no webserver appeared within 60s; stats feed disabled')
      }
      return
    }
    ctx.effect(() => webServer.register({
      kind: 'exact',
      path: '/plugin-api/tool-normalizer/stats',
      handler: (_req: unknown, res: { writeHead(status: number, headers: Record<string, string>): void; end(body: string): void }) => {
        res.writeHead(200, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' })
        res.end(JSON.stringify(tracker.getSnapshot()))
      },
    }), 'tool-normalizer: stats http route')
    ctx.logger?.info?.('[tool-normalizer] stats feed at GET /plugin-api/tool-normalizer/stats')
  }
  tryRegisterStatsRoute()

  // Register dynamic prompt guidelines safely
  if (config.injectPrompt) {
    registerPromptGuidance(ctx)
  }

  const getTools = () => (typeof ctx.get === 'function' ? ctx.get('tools') : ctx.tools)

  // Intercept and normalize tool dispatches
  ctx.on('tools/execute', async (exec: ToolDispatchExecution, next: () => Promise<ToolExecutionResult>): Promise<ToolExecutionResult> => {
    const rawArgsStr = JSON.stringify(exec.arguments ?? {})
    const startTime = Date.now()
    const eventId = `norm_${startTime}_${Math.random().toString(36).slice(2, 8)}`
    const tools = getTools()

    // 1. Direct tool to Code-Mode bridging when tool is not registered directly
    if (config.autoBridgeDirectTools && tools && isBridgeableDirectCall(exec.name, tools)) {
      const result = await executeBridgeDirectCall(exec, tools)
      recordEvent({
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
    let healCategory: 'INVALID_ARGS' | 'RANGE_CLAMP' | 'CODE_WRAP' | 'INNER_DESC' | 'PASSTHROUGH' = 'PASSTHROUGH'
    let normalizedPreview: string | undefined

    // 2. Normalize `run_code` arguments (handle command -> code, missing description, etc.)
    if (exec.name === 'run_code' && config.autoWrapRunCode) {
      const originalObj = exec.arguments as Record<string, unknown> | undefined
      const isCmdPass = originalObj && ('command' in originalObj || 'cmd' in originalObj)
      const isMissingDesc = originalObj && !originalObj['description']
      
      const normalized = normalizeRunCodeArguments(exec.arguments)

      // 2b. Preemptive inner-call repair: inject missing descriptions into the
      // program's tools.*() options objects before execution — inner
      // sub-dispatch validation requires them and fails the whole program.
      const codeBody = typeof normalized.code === 'string' ? normalized.code : undefined
      if (codeBody !== undefined) {
        const inner = injectInnerDescriptions(codeBody, String(normalized.description ?? ''))
        if (inner.injected > 0) {
          normalized.code = inner.code
          wasHealed = true
          if (healCategory === 'PASSTHROUGH') healCategory = 'INNER_DESC'
        }
      }

      if (isCmdPass || isMissingDesc || JSON.stringify(normalized) !== rawArgsStr) {
        wasHealed = true
        if (healCategory === 'PASSTHROUGH') healCategory = isCmdPass ? 'INVALID_ARGS' : 'CODE_WRAP'
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
      recordEvent({
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
      const currentTools = getTools()
      if (
        config.autoBridgeDirectTools
        && currentTools
        && isBridgeableDirectCall(exec.name, currentTools)
      ) {
        const bridgedResult = await executeBridgeDirectCall(exec, currentTools)
        recordEvent({
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

      recordEvent({
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