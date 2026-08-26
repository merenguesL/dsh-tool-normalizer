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
   * Automatically bridge direct tool calls (e.g. `bash`, `read`, `write`, `grep`)
   * when the agent is in Code-Mode and those tools are not exposed directly to the model.
   * @default true
   */
  autoBridgeDirectTools?: boolean

  /**
   * Automatically pre-observe (read) files before `edit` operations if they haven't
   * been read in the current turn, preventing `FS_NOT_OBSERVED` failures.
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
   * Estimated input-token cost of one avoided failed-call retry, used for the
   * dashboard's token-savings projection (`healedSuccess × cost`). Tune to
   * the typical conversation length of the deployment; this is an estimate by
   * design and is labeled as such in the UI.
   * @default 8000
   */
  estimatedRetryTokenCost?: number
}

/**
 * Mutable representation of arguments during normalization.
 */
export type RawArguments = Record<string, unknown>

/**
 * Minimal tool runtime contract.
 */
export interface ToolRuntime {
  get(name: string): any
}

/**
 * Minimal tool dispatch execution contract.
 */
export interface ToolDispatchExecution {
  name: string
  arguments: any
  callId?: string
  rootCallId?: string
  token?: string
  signal?: AbortSignal
}

/**
 * Minimal tool execution result contract.
 */
export interface ToolExecutionResult {
  content?: Array<{ type: string; text?: string; data?: string; mimeType?: string }>
  isError?: boolean
  error?: Error | { message: string }
}
