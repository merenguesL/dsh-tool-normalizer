/**
 * Auto-healing, argument normalization, and safe nested tool recovery for DeepSeek Harness.
 *
 * @module dsh-tool-normalizer
 */

import { executeBridgeDirectCall, isBridgeableDirectCall } from './normalizers/direct-bridge.ts'
import { injectInnerDescriptions } from './normalizers/inner-description.ts'
import { executeNestedTool, nestedCallId } from './normalizers/nested-dispatch.ts'
import { compactPreview } from './normalizers/preview.ts'
import { normalizeEditorArguments } from './normalizers/range-clamper.ts'
import { normalizeRunCodeArguments, stripMarkdownFences } from './normalizers/run-code.ts'
import { registerPromptGuidance } from './prompt.ts'
import {
  appendEvent,
  clearLog,
  flushStatsLog,
  persistSnapshot,
  restoreFromLog,
  setRetryTokenCost,
  statsLogPath,
} from './stats-log.ts'
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

function objectValue(value: unknown): Record<string, unknown> | undefined {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : undefined
}

function includesString(value: unknown, expected: string): boolean {
  return Array.isArray(value) && value.some(item => item === expected)
}

function hasOnlyRunCodeFields(value: Record<string, unknown>): boolean {
  return Object.keys(value).every(key => key === 'code' || key === 'description')
}

/**
 * Compare the semantic run_code fields instead of JSON property order.
 * @param rawArgs - Original model arguments.
 * @param normalized - Canonical run_code arguments.
 * @returns True when normalization would not change the accepted fields.
 */
function runCodeArgsMatch(
  rawArgs: unknown,
  normalized: { code: string; description: string },
): boolean {
  const rawObject = objectValue(rawArgs)
  if (rawObject === undefined || !hasOnlyRunCodeFields(rawObject)) return false
  if (typeof rawObject['code'] !== 'string' || typeof rawObject['description'] !== 'string') return false
  return stripMarkdownFences(rawObject['code']) === normalized.code
    && rawObject['description'].trim() === normalized.description
}

/**
 * Read the active tool schema without assuming one particular host version.
 * Current DSH definitions expose JSON Schema; the legacy property-map form is
 * accepted only as a compatibility fallback.
 * @param tools - Active host tool runtime.
 * @param name - Tool name used by a Code-Mode sub-dispatch.
 * @param agent - Scope owner for the lookup.
 * @returns True only when the active definition declares description required.
 */
function toolRequiresDescription(tools: NonNullable<ReturnType<typeof getToolRuntime>>, name: string, agent: unknown): boolean {
  try {
    const definition = objectValue(tools.get(name, agent))
    const parameters = objectValue(definition?.['parameters'])
    if (parameters === undefined) return false
    if (includesString(parameters['required'], 'description')) return true

    const properties = objectValue(parameters['properties'])
    if (objectValue(properties?.['description'])?.['required'] === true) return true
    return objectValue(parameters['description'])?.['required'] === true
  } catch {
    // Schema inspection is an optional optimization; never break a call when
    // a legacy runtime exposes an incompatible definition object.
    return false
  }
}

function errorCode(error: unknown): string | undefined {
  if (typeof error !== 'object' || error === null) return undefined
  const candidate = error as { code?: unknown; info?: { code?: unknown } }
  if (typeof candidate.code === 'string') return candidate.code
  return typeof candidate.info?.code === 'string' ? candidate.info.code : undefined
}

function errorText(error: unknown): string | undefined {
  if (error instanceof Error) return error.message
  if (typeof error === 'object' && error !== null && 'message' in error) {
    const message = (error as { message?: unknown }).message
    return typeof message === 'string' ? message : undefined
  }
  return typeof error === 'string' ? error : undefined
}

function resultHasCode(result: ToolExecutionResult, code: string): boolean {
  return result.isError === true && errorCode(result.error) === code
}

function thrownHasCode(error: unknown, code: string): boolean {
  return errorCode(error) === code
    || errorText(error)?.includes(code) === true
}

function resultErrorText(result: ToolExecutionResult): string | undefined {
  return result.isError === true ? errorText(result.error) : undefined
}

function lineCountFromRangeError(result: ToolExecutionResult): number | undefined {
  const message = resultErrorText(result)
  if (message === undefined || !message.includes('view_range')) return undefined
  const match = /(?:range of lines of the file:\s*\[1,\s*|number of lines in the file:\s*`?)(\d+)/u.exec(message)
  const lineCount = match === null ? undefined : Number(match[1])
  return lineCount !== undefined && Number.isSafeInteger(lineCount) && lineCount > 0 ? lineCount : undefined
}

function sessionCwd(agent: unknown): string | undefined {
  if (typeof agent !== 'object' || agent === null) return undefined
  const session = (agent as { session?: unknown }).session
  if (typeof session !== 'object' || session === null) return undefined
  const header = (session as { header?: unknown }).header
  if (typeof header !== 'object' || header === null) return undefined
  const cwd = (header as { cwd?: unknown }).cwd
  return typeof cwd === 'string' && cwd.trim().length > 0 ? cwd : undefined
}

function isObservationMutation(name: string, args: unknown): boolean {
  if (name === 'edit' || name === 'write') return true
  if (name !== 'str_replace_editor') return false
  const object = objectValue(args)
  return object?.['command'] === 'str_replace' || object?.['command'] === 'insert'
}

function editPath(args: unknown): string | undefined {
  const object = objectValue(args)
  if (!object) return undefined
  const path = object['file_path'] ?? object['path']
  return typeof path === 'string' && path.trim().length > 0 ? path : undefined
}

/** A call id currently being executed as an observation retry. */
const observationRetryCallIds = new Set<string>()
const rangeRetryCallIds = new Set<string>()

function isObservationRetry(exec: ToolDispatchExecution): boolean {
  return typeof exec.callId === 'string' && observationRetryCallIds.has(exec.callId)
}

function isRangeRetry(exec: ToolDispatchExecution): boolean {
  return typeof exec.callId === 'string' && rangeRetryCallIds.has(exec.callId)
}

async function observeAndRetryMutation(
  exec: ToolDispatchExecution,
  tools: NonNullable<ReturnType<typeof getToolRuntime>>,
): Promise<ToolExecutionResult | undefined> {
  if (!isObservationMutation(exec.name, exec.arguments)) return undefined
  if (exec.agent === undefined) return undefined
  const path = editPath(exec.arguments)
  if (path === undefined) return undefined

  const readName = tools.get('read', exec.agent) !== undefined ? 'read'
    : exec.name === 'str_replace_editor' && tools.get('str_replace_editor', exec.agent) !== undefined
      ? 'str_replace_editor'
      : undefined
  if (readName === undefined) return undefined
  const readArgs = readName === 'read'
    ? { file_path: path }
    : { command: 'view', path }
  const observed = await executeNestedTool(exec, tools, readName, readArgs, 'observe-read')
  if (observed.isError) return undefined

  const retryId = nestedCallId(exec, 'observe-edit')
  observationRetryCallIds.add(retryId)
  try {
    return await executeNestedTool(exec, tools, exec.name, exec.arguments, 'observe-edit')
  } finally {
    observationRetryCallIds.delete(retryId)
  }
}

async function clampAndRetryRange(
  exec: ToolDispatchExecution,
  tools: NonNullable<ReturnType<typeof getToolRuntime>>,
  lineCount: number,
): Promise<{ result: ToolExecutionResult; args: Record<string, unknown> } | undefined> {
  if (exec.name !== 'str_replace_editor') return undefined
  const normalized = normalizeEditorArguments(exec.name, exec.arguments, sessionCwd(exec.agent), lineCount)
  if (JSON.stringify(normalized) === JSON.stringify(exec.arguments)) return undefined

  const retryId = nestedCallId(exec, 'range-retry')
  rangeRetryCallIds.add(retryId)
  try {
    return {
      result: await executeNestedTool(exec, tools, exec.name, normalized, 'range-retry'),
      args: normalized,
    }
  } finally {
    rangeRetryCallIds.delete(retryId)
  }
}

function getToolRuntime(ctx: any): any {
  return typeof ctx.get === 'function' ? ctx.get('tools') : ctx.tools
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
    estimatedRetryTokenCost: userConfig.estimatedRetryTokenCost ?? 8000,
    persistPassthrough: userConfig.persistPassthrough ?? false,
  }

  const tracker = ToolNormalizerTracker.getInstance()
  tracker.setPersistPassthrough(config.persistPassthrough)
  tracker.setRetryTokenCost(config.estimatedRetryTokenCost)
  setRetryTokenCost(config.estimatedRetryTokenCost)
  const restoreReady = restoreFromLog(tracker)
    .catch((error: unknown) => {
      ctx.logger?.warn?.(`[tool-normalizer] history restore failed: ${errorText(error) ?? String(error)}`)
    })
    .then(() => { persistSnapshot(tracker.getSnapshot()) })

  /** Record one real event, append it to the durable log, and log a line. */
  const recordEvent = (record: Parameters<typeof tracker.record>[0]): void => {
    tracker.record(record)
    appendEvent(record, tracker.getSnapshot(), { persistPassthrough: config.persistPassthrough })
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
  let routeTimer: ReturnType<typeof setTimeout> | undefined
  let routesStopped = false
  if (typeof ctx.effect === 'function') {
    ctx.effect(() => () => {
      routesStopped = true
      if (routeTimer !== undefined) clearTimeout(routeTimer)
      void flushStatsLog()
    }, 'tool-normalizer: runtime teardown')
  }
  const tryRegisterStatsRoute = (): void => {
    if (routesStopped) return
    const webServer = typeof ctx.get === 'function' ? ctx.get('webServer') : ctx.webServer
    if (!webServer || typeof webServer.register !== 'function') {
      if (registerAttempts++ < 60) {
        routeTimer = setTimeout(tryRegisterStatsRoute, 1000)
        routeTimer.unref?.()
      } else {
        ctx.logger?.warn?.('[tool-normalizer] no webserver appeared within 60s; stats feed disabled')
      }
      return
    }
    ctx.effect(() => {
      const disposeStats = webServer.register({
        kind: 'exact',
        path: '/plugin-api/tool-normalizer/stats',
        handler: (_req: unknown, res: { writeHead(status: number, headers: Record<string, string>): void; end(body: string): void }) => {
          res.writeHead(200, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' })
          res.end(JSON.stringify(tracker.getSnapshot()))
        },
      })
      const disposeReset = webServer.register({
        kind: 'exact',
        path: '/plugin-api/tool-normalizer/reset',
        handler: (req: { method?: string }, res: { writeHead(status: number, headers?: Record<string, string>): void; end(body?: string): void }) => {
          if (req.method !== 'POST') {
            res.writeHead(405, { allow: 'POST' })
            res.end()
            return
          }
          tracker.reset()
          void clearLog().then(() => {
            res.writeHead(204, {})
            res.end()
          })
        },
      })
      return () => {
        disposeReset?.()
        disposeStats?.()
      }
    }, 'tool-normalizer: stats http routes')
    ctx.logger?.info?.('[tool-normalizer] stats feed at GET /plugin-api/tool-normalizer/stats')
  }
  tryRegisterStatsRoute()

  // Register dynamic prompt guidelines safely
  if (config.injectPrompt) {
    registerPromptGuidance(ctx)
  }

  const getTools = () => getToolRuntime(ctx)

  // Intercept and normalize tool dispatches
  ctx.on('tools/execute', async (exec: ToolDispatchExecution, next: () => Promise<ToolExecutionResult>): Promise<ToolExecutionResult> => {
    await restoreReady
    const rawArgsStr = JSON.stringify(exec.arguments ?? {}) ?? '{}'
    const startTime = Date.now()
    const eventId = `norm_${startTime}_${Math.random().toString(36).slice(2, 8)}`
    const tools = getTools()

    let wasHealed = false
    let healCategory: 'INVALID_ARGS' | 'RANGE_CLAMP' | 'CODE_WRAP' | 'RUN_CODE_DESC' | 'INNER_DESC' | 'FS_OBSERVED' | 'PASSTHROUGH' = 'PASSTHROUGH'
    let normalizedPreview: string | undefined
    const changes: string[] = []

    // 1. Normalize `run_code` arguments (handle command -> code, missing description, etc.)
    if (exec.name === 'run_code' && config.autoWrapRunCode) {
      const originalObj = objectValue(exec.arguments)
      const isCmdPass = originalObj !== undefined && ('command' in originalObj || 'cmd' in originalObj)
      const isMissingDesc = originalObj !== undefined
        && (typeof originalObj['description'] !== 'string' || originalObj['description'].trim().length === 0)
      const rawCode = typeof originalObj?.['code'] === 'string' ? originalObj['code'] : undefined
      const hasMarkdownFence = rawCode !== undefined && stripMarkdownFences(rawCode) !== rawCode
      
      const normalized = normalizeRunCodeArguments(exec.arguments)

      const normalizedArgs = JSON.stringify(normalized)
      const runCodeChanged = !runCodeArgsMatch(exec.arguments, normalized)
      if (isCmdPass) changes.push('将 command/cmd 转为 run_code.code')
      if (isMissingDesc) changes.push('补全 run_code.description')
      if (hasMarkdownFence) changes.push('移除 code 的 Markdown 围栏')
      if (runCodeChanged && changes.length === 0) changes.push('规范化 run_code 参数')
      if (runCodeChanged) {
        wasHealed = true
        if (isCmdPass) healCategory = 'INVALID_ARGS'
        else if (hasMarkdownFence) healCategory = 'CODE_WRAP'
        else if (isMissingDesc) healCategory = 'RUN_CODE_DESC'
        else healCategory = 'INVALID_ARGS'
        normalizedPreview = compactPreview(normalizedArgs)
      }

      // 2b. Preemptive inner-call repair: inject missing descriptions into the
      // program's tools.*() options objects before execution, but only for
      // tools whose active schema declares description as required.
      const codeBody = typeof normalized.code === 'string' ? normalized.code : undefined
      if (codeBody !== undefined) {
        const inner = injectInnerDescriptions(
          codeBody,
          String(normalized.description ?? ''),
          toolName => tools !== undefined && toolRequiresDescription(tools, toolName, exec.agent),
        )
        if (inner.injected > 0) {
          normalized.code = inner.code
          wasHealed = true
          if (healCategory === 'PASSTHROUGH') healCategory = 'INNER_DESC'
          changes.push(`补全内层 description × ${inner.injected}`)
          normalizedPreview = compactPreview(JSON.stringify(normalized))
        }
      }

      exec.arguments = normalized
    }

    // 2. Normalize editor arguments (relative paths, view ranges)
    if ((exec.name === 'edit' || exec.name === 'str_replace_editor') && config.autoClampRanges) {
      const normalized = normalizeEditorArguments(exec.name, exec.arguments, sessionCwd(exec.agent))
      if (JSON.stringify(normalized) !== rawArgsStr) {
        wasHealed = true
        healCategory = 'RANGE_CLAMP'
        normalizedPreview = compactPreview(JSON.stringify(normalized))
        changes.push('按会话目录规范化编辑器路径/范围')
      }
      exec.arguments = normalized
    }

    // 4. Delegate to the downstream execution pipeline
    try {
      let result = await next()

      // A host that exposes Code-Mode collapse through the waterfall may
      // return UNKNOWN_TOOL here. Re-enter the public runtime dispatcher as a
      // nested call; this keeps the real result/context contract intact. A
      // collapsed call rejected in createExecution never reaches this plugin,
      // which remains a host limitation rather than a reason to call a tool
      // definition directly.
      if (config.autoBridgeDirectTools && tools && resultHasCode(result, 'UNKNOWN_TOOL')
        && isBridgeableDirectCall(exec, tools)) {
        result = await executeBridgeDirectCall(exec, tools)
        recordEvent({
          id: eventId,
          time: startTime,
          toolName: exec.name,
          category: 'UNKNOWN_TOOL',
          wasHealed: true,
          originalArgsPreview: compactPreview(rawArgsStr),
          normalizedArgsPreview: `Nested dispatch: ${exec.name}`,
          normalizationSummary: `通过宿主嵌套派发恢复 ${exec.name}，保留 agent、会话和取消上下文`,
          status: result.isError ? 'failed' : 'success',
          errorMessage: resultErrorText(result),
        })
        return result
      }

      // Do not pre-read every mutation. Only the guarded-mutation failure
      // triggers one read followed by one standard nested retry, so normal
      // edits/writes pay no extra tool call and the retry remains scoped to the
      // original session.
      if (config.autoObserveFiles && !isObservationRetry(exec) && tools
        && resultHasCode(result, 'FS_NOT_OBSERVED')) {
        const retried = await observeAndRetryMutation(exec, tools)
        if (retried !== undefined) {
          wasHealed = true
          healCategory = 'FS_OBSERVED'
          normalizedPreview = `Read ${editPath(exec.arguments) ?? 'file'} then retry`
          changes.push('读取目标文件后重试修改')
          result = retried
        }
      }
      if (config.autoClampRanges && !isRangeRetry(exec) && tools && result.isError === true) {
        const lineCount = lineCountFromRangeError(result)
        if (lineCount !== undefined) {
          const retried = await clampAndRetryRange(exec, tools, lineCount)
          if (retried !== undefined) {
            wasHealed = true
            healCategory = 'RANGE_CLAMP'
            normalizedPreview = compactPreview(JSON.stringify(retried.args))
            changes.push(`按文件真实行数修正 view_range（${lineCount} 行）`)
            result = retried.result
          }
        }
      }
      recordEvent({
        id: eventId,
        time: startTime,
        toolName: exec.name,
        category: healCategory,
        wasHealed,
        originalArgsPreview: compactPreview(rawArgsStr),
        normalizedArgsPreview: normalizedPreview,
        normalizationSummary: changes.length > 0 ? changes.join('；') : undefined,
        status: result.isError ? 'failed' : (wasHealed ? 'success' : 'passthrough'),
        errorMessage: resultErrorText(result),
      })
      return result
    } catch (error: unknown) {
      // If a legacy host throws UNKNOWN_TOOL after entering the waterfall,
      // attempt the same safe nested-dispatch recovery.
      const currentTools = getTools()
      if (
        config.autoBridgeDirectTools
        && currentTools
        && thrownHasCode(error, 'UNKNOWN_TOOL')
        && isBridgeableDirectCall(exec, currentTools)
      ) {
        const bridgedResult = await executeBridgeDirectCall(exec, currentTools)
        recordEvent({
          id: eventId,
          time: startTime,
          toolName: exec.name,
          category: 'UNKNOWN_TOOL',
          wasHealed: true,
          originalArgsPreview: compactPreview(rawArgsStr),
          normalizedArgsPreview: `Nested dispatch: ${exec.name}`,
          normalizationSummary: `通过宿主嵌套派发恢复 ${exec.name}，保留 agent、会话和取消上下文`,
          status: bridgedResult.isError ? 'failed' : 'success',
          errorMessage: resultErrorText(bridgedResult),
        })
        return bridgedResult
      }

      recordEvent({
        id: eventId,
        time: startTime,
        toolName: exec.name,
        category: healCategory,
        wasHealed,
        originalArgsPreview: compactPreview(rawArgsStr),
        normalizedArgsPreview: normalizedPreview,
        normalizationSummary: changes.length > 0 ? changes.join('；') : undefined,
        status: 'failed',
        errorMessage: errorText(error) ?? String(error),
      })
      throw error
    }
  })
}

export default { name, inject, apply }
