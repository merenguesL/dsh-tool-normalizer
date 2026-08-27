/**
 * Type definitions and configuration schema for dsh-tool-normalizer.
 *
 * @module dsh-tool-normalizer/types
 */

/**
 * Configuration for the tool normalizer and auto-healing plugin.
 */
export interface Config {
  /**
   * Automatically normalize `run_code` argument schema mismatches
   * (e.g. `command` -> `code`, missing `description`, stripping markdown codeblocks).
   * @default true
   */
  autoWrapRunCode?: boolean

  /**
   * Automatically retry an UNKNOWN_TOOL result as a nested host dispatch when
   * the direct call reached this plugin and the target is registered in the
   * active agent scope. Calls rejected earlier by the host cannot be observed
   * by a plugin.
   * @default true
   */
  autoBridgeDirectTools?: boolean

  /**
   * When a guarded mutation returns `FS_NOT_OBSERVED`, read the target once and
   * retry the same mutation through the host dispatcher.
   * @default true
   */
  autoObserveFiles?: boolean

  /**
   * Automatically clamp out-of-bounds `view_range` parameters in editor tools.
   * @default true
   */
  autoClampRanges?: boolean

  /**
   * Inject concise, high-value prompt guidance into `systemPrompt`.
   * @default true
   */
  injectPrompt?: boolean

  /**
   * Persist successful calls that required no normalization in the detailed
   * JSONL trace. Normal successful pass-through calls are aggregated in the
   * compact summary file by default and are not written one per call.
   * @default false
   */
  persistPassthrough?: boolean
}

/**
 * Mutable representation of arguments during normalization.
 */
export type RawArguments = Record<string, unknown>

/**
 * Minimal tool runtime contract.
 */
export interface ToolRuntime {
  get(name: string, scope?: unknown): unknown
  /** Execute a call through the host runtime's complete dispatch pipeline. */
  execute?(execution: ToolExecutionInput): Promise<ToolExecutionResult>
}

/** Minimal input accepted by the host runtime for a nested dispatch. */
export interface ToolExecutionInput {
  callId: string
  rootCallId?: string
  name: string
  arguments: unknown
  agent?: unknown
  parent?: unknown
  signal: AbortSignal
}

/**
 * Minimal tool dispatch execution contract.
 */
export interface ToolDispatchExecution {
  name: string
  arguments: unknown
  callId?: string
  rootCallId?: string
  /** Opaque runtime token used to mark a call as a nested dispatch. */
  token?: unknown
  /** Session/agent owner used by scoped tools and filesystem policy. */
  agent?: unknown
  /** Present when the host is already executing a nested call. */
  parent?: unknown
  signal?: AbortSignal
}

/**
 * Minimal tool execution result contract.
 */
export interface ToolExecutionResult {
  content?: Array<{ type: string; text?: string; data?: string; mimeType?: string }>
  isError?: boolean
  value?: unknown
  meta?: unknown
  additionalContexts?: unknown[]
  concludesTurn?: true
  error?: Error | { message: string; code?: string; info?: { code?: string } }
}
