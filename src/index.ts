/**
 * Auto-healing, argument normalization, and safe nested tool recovery for DeepSeek Harness.
 *
 * @module dsh-tool-normalizer
 */

import {
  executeBridgeDirectCall,
  isBridgeableDirectCall,
} from "./normalizers/direct-bridge.ts";
import { injectInnerDescriptions } from "./normalizers/inner-description.ts";
import {
  executeNestedTool,
  nestedCallId,
} from "./normalizers/nested-dispatch.ts";
import { compactPreview } from "./normalizers/preview.ts";
import { normalizeEditorArguments, normalizeReadArguments } from "./normalizers/range-clamper.ts";
import {
  normalizeRunCodeArguments,
  stripMarkdownFences,
} from "./normalizers/run-code.ts";
import { repairRunCodeSyntax } from "./normalizers/run-code-syntax.ts";
import { registerPromptGuidance, getGuidanceText, setGuidanceText, resetGuidanceText, DEFAULT_GUIDANCE_TEXT, DEFAULT_GUIDANCE_HEADING, refreshTopErrors } from "./prompt.ts";
import {
  appendEvent,
  clearLog,
  flushStatsLog,
  persistSnapshot,
  restoreFromLog,
  statsLogPath,
} from "./stats-log.ts";
import {
  isDiagnosticRecord,
  ToolNormalizerTracker,
  type NormalizerCategory,
} from "./tracker.ts";
import type {
  Config,
  ToolDispatchExecution,
  ToolExecutionResult,
} from "./types.ts";

// The public package surface: consumers import types and normalizers from the
// package root, so these re-exports are the API, not incidental barrels.
export * from "./types.ts";
export * from "./tracker.ts";
export * from "./normalizers/run-code.ts";
export * from "./normalizers/run-code-syntax.ts";
export * from "./normalizers/range-clamper.ts";
export * from "./normalizers/direct-bridge.ts";
export { DEFAULT_GUIDANCE_TEXT, DEFAULT_GUIDANCE_HEADING, getGuidanceText, setGuidanceText, resetGuidanceText } from "./prompt.ts";
export * from "./prompt.ts";

/** Cordis plugin identifier. */
export const name = "tool-normalizer";

/** Injected services required from Cordis context. */
export const inject = ["tools"];

function objectValue(value: unknown): Record<string, unknown> | undefined {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function includesString(value: unknown, expected: string): boolean {
  return Array.isArray(value) && value.some((item) => item === expected);
}

function hasOnlyRunCodeFields(value: Record<string, unknown>): boolean {
  return Object.keys(value).every(
    (key) => key === "code" || key === "description",
  );
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
  const rawObject = objectValue(rawArgs);
  if (rawObject === undefined || !hasOnlyRunCodeFields(rawObject)) return false;
  if (
    typeof rawObject["code"] !== "string" ||
    typeof rawObject["description"] !== "string"
  )
    return false;
  return (
    stripMarkdownFences(rawObject["code"]) === normalized.code &&
    rawObject["description"].trim() === normalized.description
  );
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
function toolRequiresDescription(
  tools: NonNullable<ReturnType<typeof getToolRuntime>>,
  name: string,
  agent: unknown,
): boolean {
  try {
    const definition = objectValue(tools.get(name, agent));
    const parameters = objectValue(definition?.["parameters"]);
    if (parameters === undefined) return false;
    if (includesString(parameters["required"], "description")) return true;

    const properties = objectValue(parameters["properties"]);
    if (objectValue(properties?.["description"])?.["required"] === true)
      return true;
    return objectValue(parameters["description"])?.["required"] === true;
  } catch {
    // Schema inspection is an optional optimization; never break a call when
    // a legacy runtime exposes an incompatible definition object.
    return false;
  }
}

/** A call id minted by this plugin for its own nested recovery dispatches. */
function isSelfNestedExec(exec: ToolDispatchExecution): boolean {
  return (
    typeof exec.callId === "string" && exec.callId.includes(":normalizer:")
  );
}

/** Whether the final error plausibly belongs to the attempted heal class. */
function healMatchesError(
  category:
    | "INVALID_ARGS"
    | "RANGE_CLAMP"
    | "CODE_WRAP"
    | "RUN_CODE_DESC"
    | "RUN_CODE_SYNTAX"
    | "INNER_DESC"
    | "READ_ARGS",
  errorCode: string | undefined,
  errorMessage: string | undefined,
): boolean {
  const text = errorMessage ?? "";
  switch (category) {
    case "INVALID_ARGS":
    case "RUN_CODE_DESC":
    case "CODE_WRAP":
    case "READ_ARGS":
      return (
        errorCode === "INVALID_ARGS" ||
        /offset|start|limit/i.test(text)
      );
    case "INNER_DESC":
      return (
        errorCode === "INVALID_ARGS" ||
        /required property|invalid arguments|description/i.test(text)
      );
    case "RUN_CODE_SYNTAX":
      return isSyntaxLikeRunFailure(errorCode, text);
    case "RANGE_CLAMP":
      return (
        /absolute path|view_range|view range|number of lines|out of/i.test(
          text,
        ) || errorCode === "FS_NOT_FOUND"
      );
  }
}

/** Whether a run failure looks like a program parse failure, not a semantic one. */
function isSyntaxLikeRunFailure(
  errorCode: string | undefined,
  errorMessage: string,
): boolean {
  if (errorCode !== "CODE_RUN_FAILED") return false;
  return /Unexpected token|Expected ','|Expected ';'|Unterminated|lexing error|<eof>|string literal|Expression expected|Expected ident/i.test(
    errorMessage,
  );
}

/** Hint appended to a PTC-collapsed direct call the plugin cannot dispatch. */
function collapsedCallHint(toolName: string): string {
  return (
    `[tool-normalizer hint] Direct '${toolName}' calls are hidden in Code-Mode; ` +
    `reissue it inside run_code instead: ` +
    `run_code({ code: "const r = await tools.${toolName}(<args>); return r;", ` +
    `description: "<what this call does>" }).`
  );
}

/** Hint appended to a run_code body that parses badly and resists repair. */
const SYNTAX_HINT =
  "[tool-normalizer hint] The run_code program failed to parse before running. " +
  "Usual causes: unescaped backticks inside template literals, Python pasted as JS " +
  "(`def`/`print`/`'''`), or a truncated tail. Keep the program short; write long " +
  "shell/python bodies to a file and run that file instead.";

/**
 * Return a copy of the result with the hint appended to its first text block.
 * The host may freeze results, so the original object is never mutated.
 * @param result - Final error result from the downstream pipeline.
 * @param hint - Bounded guidance text to append.
 * @returns A result preserving every field with extended text content.
 */
function appendResultHint(
  result: ToolExecutionResult,
  hint: string,
): ToolExecutionResult {
  const content = Array.isArray(result.content) ? [...result.content] : [];
  const index = content.findIndex(
    (block) => typeof block === "object" && block !== null && block.type === "text",
  );
  if (index >= 0) {
    const block = content[index] as { type: string; text?: string };
    content[index] = {
      ...block,
      text: `${block.text ?? ""}\n${hint}`,
    };
  } else {
    content.push({ type: "text", text: hint });
  }
  return { ...result, content };
}

function errorCode(error: unknown): string | undefined {
  if (typeof error !== "object" || error === null) return undefined;
  const candidate = error as { code?: unknown; info?: { code?: unknown } };
  if (typeof candidate.code === "string") return candidate.code;
  return typeof candidate.info?.code === "string"
    ? candidate.info.code
    : undefined;
}

function errorText(error: unknown): string | undefined {
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error !== null && "message" in error) {
    const message = (error as { message?: unknown }).message;
    return typeof message === "string" ? message : undefined;
  }
  return typeof error === "string" ? error : undefined;
}

function resultHasCode(result: ToolExecutionResult, code: string): boolean {
  return result.isError === true && errorCode(result.error) === code;
}

function thrownHasCode(error: unknown, code: string): boolean {
  return errorCode(error) === code || errorText(error)?.includes(code) === true;
}

function resultErrorText(result: ToolExecutionResult): string | undefined {
  return result.isError === true ? errorText(result.error) : undefined;
}

function resultStatus(
  result: ToolExecutionResult,
  wasHealed: boolean,
): "success" | "failed" | "passthrough" {
  if (result.isError) return "failed";
  return wasHealed ? "success" : "passthrough";
}

function lineCountFromRangeError(
  result: ToolExecutionResult,
): number | undefined {
  const message = resultErrorText(result);
  if (message === undefined || !message.includes("view_range"))
    return undefined;
  const match =
    /(?:range of lines of the file:\s*\[1,\s*|number of lines in the file:\s*`?)(\d+)/u.exec(
      message,
    );
  const lineCount = match === null ? undefined : Number(match[1]);
  return lineCount !== undefined &&
    Number.isSafeInteger(lineCount) &&
    lineCount > 0
    ? lineCount
    : undefined;
}

function sessionCwd(agent: unknown): string | undefined {
  if (typeof agent !== "object" || agent === null) return undefined;
  const session = (agent as { session?: unknown }).session;
  if (typeof session !== "object" || session === null) return undefined;
  const header = (session as { header?: unknown }).header;
  if (typeof header !== "object" || header === null) return undefined;
  const cwd = (header as { cwd?: unknown }).cwd;
  return typeof cwd === "string" && cwd.trim().length > 0 ? cwd : undefined;
}

function isObservationMutation(name: string, args: unknown): boolean {
  if (name === "edit" || name === "write") return true;
  if (name !== "str_replace_editor") return false;
  const object = objectValue(args);
  return (
    object?.["command"] === "str_replace" || object?.["command"] === "insert"
  );
}

function editPath(args: unknown): string | undefined {
  const object = objectValue(args);
  if (!object) return undefined;
  const path = object["file_path"] ?? object["path"];
  return typeof path === "string" && path.trim().length > 0 ? path : undefined;
}

/** A call id currently being executed as an observation retry. */
const observationRetryCallIds = new Set<string>();
const rangeRetryCallIds = new Set<string>();

function isObservationRetry(exec: ToolDispatchExecution): boolean {
  return (
    typeof exec.callId === "string" && observationRetryCallIds.has(exec.callId)
  );
}

function isRangeRetry(exec: ToolDispatchExecution): boolean {
  return typeof exec.callId === "string" && rangeRetryCallIds.has(exec.callId);
}

async function observeAndRetryMutation(
  exec: ToolDispatchExecution,
  tools: NonNullable<ReturnType<typeof getToolRuntime>>,
): Promise<ToolExecutionResult | undefined> {  if (!isObservationMutation(exec.name, exec.arguments)) return undefined;
  if (exec.agent === undefined) return undefined;
  const path = editPath(exec.arguments);
  if (path === undefined) return undefined;

  let readName: string | undefined;
  if (tools.get("read", exec.agent) !== undefined) {
    readName = "read";
  } else if (
    exec.name === "str_replace_editor" &&
    tools.get("str_replace_editor", exec.agent) !== undefined
  ) {
    readName = "str_replace_editor";
  }
  if (readName === undefined) return undefined;
  const readArgs =
    readName === "read" ? { file_path: path } : { command: "view", path };
  const observed = await executeNestedTool(
    exec,
    tools,
    readName,
    readArgs,
    "observe-read",
  );
  if (observed.isError) return undefined;

  const retryId = nestedCallId(exec, "observe-edit");
  observationRetryCallIds.add(retryId);
  try {
    return await executeNestedTool(
      exec,
      tools,
      exec.name,
      exec.arguments,
      "observe-edit",
    );
  } finally {
    observationRetryCallIds.delete(retryId);
  }
}

/**
 * Best-effort observation refresh for anchor failures the plugin must not
 * retry blindly: re-reading updates the session's observed version so the
 * model's next retry is not additionally blocked by `FS_NOT_OBSERVED`.
 * @param exec - Failed guarded mutation.
 * @param tools - Active host tool runtime.
 */
async function refreshObservation(
  exec: ToolDispatchExecution,
  tools: NonNullable<ReturnType<typeof getToolRuntime>>,
): Promise<void> {
  if (!isObservationMutation(exec.name, exec.arguments)) return;
  if (exec.agent === undefined) return;
  const path = editPath(exec.arguments);
  if (path === undefined) return;

  let readName: string | undefined;
  if (tools.get("read", exec.agent) !== undefined) {
    readName = "read";
  } else if (
    exec.name === "str_replace_editor" &&
    tools.get("str_replace_editor", exec.agent) !== undefined
  ) {
    readName = "str_replace_editor";
  }
  if (readName === undefined) return;
  const readArgs =
    readName === "read" ? { file_path: path } : { command: "view", path };
  try {
    await executeNestedTool(exec, tools, readName, readArgs, "observe-refresh");
  } catch {
    // Refresh is opportunistic; the original error below stays authoritative.
  }
}

async function clampAndRetryRange(
  exec: ToolDispatchExecution,
  tools: NonNullable<ReturnType<typeof getToolRuntime>>,
  lineCount: number,
): Promise<
  { result: ToolExecutionResult; args: Record<string, unknown> } | undefined
> {
  if (exec.name !== "str_replace_editor") return undefined;
  const normalized = normalizeEditorArguments(
    exec.name,
    exec.arguments,
    sessionCwd(exec.agent),
    lineCount,
  );
  if (JSON.stringify(normalized) === JSON.stringify(exec.arguments))
    return undefined;

  const retryId = nestedCallId(exec, "range-retry");
  rangeRetryCallIds.add(retryId);
  try {
    return {
      result: await executeNestedTool(
        exec,
        tools,
        exec.name,
        normalized,
        "range-retry",
      ),
      args: normalized,
    };
  } finally {
    rangeRetryCallIds.delete(retryId);
  }
}

function getToolRuntime(ctx: any): any {
  return typeof ctx.get === "function" ? ctx.get("tools") : ctx.tools;
}

/**
 * Language reported by the mounted code runtime, when one is present.
 * The `run_code` body repairs are TypeScript-specific (they parse with
 * `AsyncFunction` and splice JS object syntax), so Python programs must
 * skip them: a triple-quoted Python string is valid Python, not a body to
 * rewrite, and a JS-style `description:` splice would break Python dicts.
 * Unknown/absent means the historical TypeScript behavior.
 * @param ctx - Cordis Context.
 * @returns The runtime language, or undefined when unavailable.
 */
function readCodeRuntimeLanguage(ctx: any): string | undefined {
  const runtime =
    typeof ctx.get === "function" ? ctx.get("codeRuntime") : ctx.codeRuntime;
  return typeof runtime?.language === "string" ? runtime.language : undefined;
}

/** Shape of the optional session token-meter service read at dispatch time. */
interface SessionTokenMeter {
  measure(
    session: unknown,
    requestHeader?: unknown,
  ): { totalTokens?: number } | undefined;
}

/**
 * Number of extra model round-trips a successful heal removes. `FS_OBSERVED`
 * replaces one read turn plus one re-edit turn; every argument normalization
 * skips the single turn that would have resent the corrected call.
 */
function avoidedRoundTrips(category: NormalizerCategory): number {
  if (category === "FS_OBSERVED") return 2;
  if (
    category === "UNKNOWN_TOOL" ||
    category === "INVALID_ARGS" ||
    category === "RANGE_CLAMP" ||
    category === "CODE_WRAP" ||
    category === "RUN_CODE_DESC" ||
    category === "RUN_CODE_SYNTAX" ||
    category === "INNER_DESC" ||
    category === "READ_ARGS"
  )
    return 1;
  return 0;
}

/**
 * Resolve the token-meter service lazily. It is optional across compositions
 * (compaction-oriented ones mount it), so the metric must degrade instead of
 * failing plugin load.
 */
function readTokenMeter(ctx: any): SessionTokenMeter | undefined {
  const meter =
    typeof ctx.get === "function" ? ctx.get("tokenMeter") : ctx.tokenMeter;
  return meter !== undefined && typeof meter.measure === "function"
    ? (meter as SessionTokenMeter)
    : undefined;
}

/**
 * Measured input tokens a healed call avoids: the owning session's one-request
 * context pressure times the skipped round-trips. Returns 0 when the meter or
 * the owning session is unavailable, so an unmetered composition reports no
 * savings rather than a fabricated constant.
 */
function measureTokensSaved(
  meter: SessionTokenMeter | undefined,
  agent: unknown,
  roundTrips: number,
): number {
  if (roundTrips <= 0 || meter === undefined) return 0;
  const session = objectValue(agent)?.["session"];
  if (session === undefined) return 0;
  try {
    const total = meter.measure(session)?.totalTokens;
    if (typeof total !== "number" || !Number.isSafeInteger(total) || total <= 0)
      return 0;
    return total * roundTrips;
  } catch {
    // Measurement is diagnostic only; never disturb the executing call.
    return 0;
  }
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
    errorHints: userConfig.errorHints ?? true,
    persistPassthrough: userConfig.persistPassthrough ?? false,
  };

  const tracker = ToolNormalizerTracker.getInstance();
  tracker.setPersistPassthrough(config.persistPassthrough);
  const restoreReady = restoreFromLog(tracker)
    .catch((error: unknown) => {
      ctx.logger?.warn?.(
        `[tool-normalizer] history restore failed: ${errorText(error) ?? String(error)}`,
      );
    })
    .then(() => {
      persistSnapshot(tracker.getAggregate());
    });

  /** Record one real event, append it to the durable log, and log a line. */
  const recordEvent = (record: Parameters<typeof tracker.record>[0]): void => {
    tracker.record(record);
    appendEvent(record, tracker.getAggregate(), {
      persistPassthrough: config.persistPassthrough,
    });
    // Successful untouched calls dominate traffic; they are counters only, so
    // they skip the debug line. Every failure and every heal still logs.
    if (isDiagnosticRecord(record) || config.persistPassthrough) {
      ctx.logger?.debug?.(
        `[tool-normalizer] ${record.toolName} category=${record.category} healed=${record.wasHealed} status=${record.status}`,
      );
    }
  };

  /**
   * Healing context the `tools/execute` wrapper hands to the `tools/result`
   * observer. Result-derived fields (status, error text, measured savings)
   * are computed at observe time from the frozen final outcome, so a later
   * `tools/post-execute` policy cannot skew them. The wrapper-observed
   * outcome travels alongside only for the no-`tools/result` fallback, which
   * has nothing better to report.
   *
   * Every field is persisted verbatim into the JSONL detail log, so it must
   * stay JSON-serializable. The live agent is a reference the token meter
   * needs, not diagnostic data: it rides on {@link StashedHeal} and never
   * enters a record.
   */
  interface PendingHeal {
    id: string;
    time: number;
    toolName: string;
    category: NormalizerCategory;
    wasHealed: boolean;
    originalArgsPreview: string;
    normalizedArgsPreview?: string;
    normalizationSummary?: string;
  }

  interface StashedOutcome {
    status: "success" | "failed" | "passthrough";
    errorMessage?: string;
    tokensSaved: number;
  }

  /** One stashed handoff: healing context, the outcome to report, and the agent the meter measures. */
  interface StashedHeal {
    pending: PendingHeal;
    outcome: StashedOutcome;
    agent: unknown;
  }

  /** Bounded handoff from wrapper to observer, keyed by call id. */
  const pendingHeals = new Map<string, StashedHeal>();
  const MAX_PENDING_HEALS = 1000;
  /** Call ids already recorded inline by the no-`tools/result` fallback. */
  const inlineRecorded = new Set<string>();
  const MAX_INLINE_RECORDED = 2000;
  /** True once the `tools/result` observer has fired on a supporting host. */
  let resultHookConfirmed = false;
  /** True once the fallback concluded the host never emits `tools/result`. */
  let resultFallback = false;
  let fallbackTimer: ReturnType<typeof setInterval> | undefined;

  function stopFallbackTimer(): void {
    if (fallbackTimer !== undefined) {
      clearInterval(fallbackTimer);
      fallbackTimer = undefined;
    }
  }

  /**
   * Build the recordable event from healing context and one observed final
   * result. Status, error text, and measured savings always describe the
   * outcome the model actually received.
   * @param pending - Healing context stashed by the wrapper.
   * @param result - Final frozen outcome for this call.
   * @param agent - Live agent the token meter measures; never persisted.
   * @returns The event to record.
   */
  function buildRecord(
    pending: PendingHeal,
    result: ToolExecutionResult,
    agent: unknown,
  ): Parameters<typeof tracker.record>[0] {
    const ok = !result.isError;
    return {
      ...pending,
      status: resultStatus(result, pending.wasHealed),
      errorMessage: resultErrorText(result),
      tokensSaved: pending.wasHealed && ok
        ? measureTokensSaved(
            readTokenMeter(ctx),
            agent,
            avoidedRoundTrips(pending.category),
          )
        : 0,
    };
  }

  function stashPending(
    callId: string | undefined,
    pending: PendingHeal,
    outcome: StashedOutcome,
    agent: unknown,
  ): void {
    if (callId === undefined || resultFallback) {
      // Without an identity the observer cannot correlate; record inline.
      recordInline(callId, pending, outcome);
      return;
    }
    if (pendingHeals.size >= MAX_PENDING_HEALS && !resultHookConfirmed) {
      sweepUnobservedHeals();
      if (resultFallback) {
        recordInline(callId, pending, outcome);
        return;
      }
    }
    if (pendingHeals.size >= MAX_PENDING_HEALS) {
      const oldest = pendingHeals.keys().next();
      if (!oldest.done) pendingHeals.delete(oldest.value);
    }
    pendingHeals.set(callId, { pending, outcome, agent });
    // Lazily watch for hosts that predate `tools/result`: the interval only
    // exists while an unconfirmed handoff is outstanding.
    if (!resultHookConfirmed && fallbackTimer === undefined) {
      fallbackTimer = setInterval(sweepUnobservedHeals, 15000);
      fallbackTimer.unref?.();
    }
  }

  /**
   * Record one stashed heal inline. Used only when the host never emits
   * `tools/result` (fallback) or the call carries no correlatable identity.
   * @param callId - Call identity, when one exists.
   * @param pending - Healing context stashed by the wrapper.
   * @param outcome - Wrapper-observed outcome for this call.
   */
  function recordInline(
    callId: string | undefined,
    pending: PendingHeal,
    outcome: StashedOutcome,
  ): void {
    if (callId !== undefined) {
      if (inlineRecorded.size >= MAX_INLINE_RECORDED) {
        const oldest = inlineRecorded.values().next();
        if (!oldest.done) inlineRecorded.delete(oldest.value);
      }
      inlineRecorded.add(callId);
    }
    recordEvent({ ...pending, ...outcome });
  }

  /**
   * Fallback sweep for hosts that predate `tools/result`: record whatever the
   * observer never consumed with the wrapper-observed outcomes, then record
   * inline from then on. Stops its own interval once the observer confirms
   * or the backlog drains.
   */
  function sweepUnobservedHeals(): void {
    if (resultHookConfirmed) {
      stopFallbackTimer();
      return;
    }
    if (pendingHeals.size === 0) return;
    resultFallback = true;
    const backlog = [...pendingHeals.values()];
    pendingHeals.clear();
    stopFallbackTimer();
    for (const { pending, outcome } of backlog) {
      recordInline(undefined, pending, outcome);
    }
  }
  ctx.logger?.info?.(
    `[tool-normalizer] active — intercepting tools/execute; history log: ${statsLogPath()}`,
  );
  // Snapshot top-errors once at session start for KV-cache-stable prompt section.
  // This captures what the tracker restored from disk history so the model sees
  // persistent failure patterns on the first request. Never changes mid-session.
  restoreReady.then(() => {
    refreshTopErrors(tracker);
  });

  // Optional HTTP feed for the browser dashboard: same-origin GET returning
  // the live in-memory snapshot. Activation order is unconstrained, so the
  // webserver service may mount after this plugin: poll briefly instead of
  // giving up on the first ctx.get miss. Never declared as inject — a
  // CLI-only profile without any webserver must still load.
  let registerAttempts = 0;
  let routeTimer: ReturnType<typeof setTimeout> | undefined;
  let routesStopped = false;
  if (typeof ctx.effect === "function") {
    ctx.effect(
      () => () => {
        routesStopped = true;
        stopFallbackTimer();
        if (routeTimer !== undefined) clearTimeout(routeTimer);
        void flushStatsLog();
      },
      "tool-normalizer: runtime teardown",
    );
  }
  const tryRegisterStatsRoute = (): void => {
    if (routesStopped) return;
    const webServer =
      typeof ctx.get === "function" ? ctx.get("webServer") : ctx.webServer;
    if (!webServer || typeof webServer.register !== "function") {
      if (registerAttempts++ < 60) {
        routeTimer = setTimeout(tryRegisterStatsRoute, 1000);
        routeTimer.unref?.();
      } else {
        ctx.logger?.warn?.(
          "[tool-normalizer] no webserver appeared within 60s; stats feed disabled",
        );
      }
      return;
    }
    ctx.effect(() => {
      const disposeStats = webServer.register({
        kind: "exact",
        path: "/plugin-api/tool-normalizer/stats",
        handler: (
          _req: unknown,
          res: {
            writeHead(status: number, headers: Record<string, string>): void;
            end(body: string): void;
          },
        ) => {
          res.writeHead(200, {
            "content-type": "application/json; charset=utf-8",
            "cache-control": "no-store",
          });
          res.end(JSON.stringify(tracker.getSnapshot()));
        },
      });
      const disposeReset = webServer.register({
        kind: "exact",
        path: "/plugin-api/tool-normalizer/reset",
        handler: (
          req: { method?: string },
          res: {
            writeHead(status: number, headers?: Record<string, string>): void;
            end(body?: string): void;
          },
        ) => {
          if (req.method !== "POST") {
            res.writeHead(405, { allow: "POST" });
            res.end();
            return;
          }
          tracker.reset();
          void clearLog().then(() => {
            res.writeHead(204, {});
            res.end();
          });
        },
      });
      const disposeGuidanceGet = webServer.register({
        kind: "exact",
        path: "/plugin-api/tool-normalizer/guidance",
        handler: (
          req: { method?: string; on?: (event: string, cb: (chunk: string) => void) => void },
          res: {
            writeHead(status: number, headers: Record<string, string>): void;
            end(body: string): void;
          },
        ) => {
          if (req.method === "PUT") {
            let body = "";
            req.on?.("data", (chunk: string) => { body += chunk; });
            req.on?.("end", () => {
              try {
                const parsed = JSON.parse(body) as { text?: string };
                const prev = setGuidanceText(parsed.text ?? "");
                res.writeHead(200, { "content-type": "application/json; charset=utf-8" });
                res.end(JSON.stringify({ previous: prev, current: getGuidanceText() }));
              } catch (e: unknown) {
                res.writeHead(400, { "content-type": "text/plain" });
                res.end(String(e));
              }
            });
            return;
          }
          // Default: GET
          res.writeHead(200, {
            "content-type": "application/json; charset=utf-8",
            "cache-control": "no-store",
          });
          res.end(JSON.stringify({
            text: getGuidanceText(),
            defaultText: DEFAULT_GUIDANCE_TEXT,
          }));
        },
      });
      const disposeGuidanceReset = webServer.register({
        kind: "exact",
        path: "/plugin-api/tool-normalizer/guidance/reset",
        handler: (
          req: { method?: string },
          res: {
            writeHead(status: number, headers?: Record<string, string>): void;
            end(body?: string): void;
          },
        ) => {
          if (req.method !== "POST") {
            res.writeHead(405, { allow: "POST" });
            res.end();
            return;
          }
          resetGuidanceText();
          res.writeHead(200, { "content-type": "application/json; charset=utf-8" });
          res.end(JSON.stringify({ text: getGuidanceText() }));
        },
      });
      return () => {
        disposeReset?.();
        disposeGuidanceGet?.();
        disposeGuidanceReset?.();
        disposeStats?.();
      };
    }, "tool-normalizer: stats http routes");
    ctx.logger?.info?.(
      "[tool-normalizer] stats feed at GET /plugin-api/tool-normalizer/stats",
    );
  };
  tryRegisterStatsRoute();

  // Register dynamic prompt guidelines safely
  if (config.injectPrompt) {
    registerPromptGuidance(ctx);
  }

  const getTools = () => getToolRuntime(ctx);
  const getMeter = () => readTokenMeter(ctx);

  // Intercept and normalize tool dispatches
  ctx.on(
    "tools/execute",
    async (
      exec: ToolDispatchExecution,
      next: () => Promise<ToolExecutionResult>,
    ): Promise<ToolExecutionResult> => {
      await restoreReady;
      // The plugin's own nested recoveries re-enter this waterfall. They carry
      // already-normalized arguments, so observing them would double-count one
      // user-facing call as several interceptions.
      if (isSelfNestedExec(exec)) return next();
      // Original arguments are captured by reference; serialization is lazy so
      // healthy pass-through calls (the common case) pay zero stringify cost.
      // The preview is diagnostic only — downstream mutation of arguments would
      // only skew that preview, never the normalization decision (editor
      // comparison stringifies before dispatch).
      const originalArgs = exec.arguments;
      let rawArgsStr: string | undefined;
      const getRawArgsStr = (): string =>
        (rawArgsStr ??= JSON.stringify(originalArgs ?? {}) ?? "{}");
      const getOriginalPreview = (needed: boolean): string =>
        needed ? compactPreview(getRawArgsStr()) : "";
      const startTime = Date.now();
      const eventId = `norm_${startTime}_${Math.random().toString(36).slice(2, 8)}`;
      const tools = getTools();
      const meter = getMeter();
      const savedTokens = (
        healed: boolean,
        ok: boolean,
        category: NormalizerCategory,
      ): number =>
        healed && ok
          ? measureTokensSaved(meter, exec.agent, avoidedRoundTrips(category))
          : 0;

      let wasHealed = false;
      let healCategory: NormalizerCategory = "PASSTHROUGH";
      let normalizedPreview: string | undefined;
      const changes: string[] = [];
      // Body-level repairs parse as TypeScript; a Python runtime's program is
      // not TS to fix (see readCodeRuntimeLanguage). Set inside the run_code
      // branch, read by the error-hint path after dispatch.
      let isPythonProgram = false;

      /**
       * Snapshot the current healing locals into observer-handoff shape. The
       * preview serializes lazily and only when the caller confirms the
       * record will be diagnostic.
       * @param previewNeeded - Whether the original-args preview is required.
       * @returns Healing context for `stashPending`.
       */
      const currentPending = (previewNeeded: boolean): PendingHeal => ({
        id: eventId,
        time: startTime,
        toolName: exec.name,
        category: healCategory,
        wasHealed,
        originalArgsPreview: getOriginalPreview(previewNeeded),
        normalizedArgsPreview: normalizedPreview,
        normalizationSummary:
          changes.length > 0 ? changes.join("；") : undefined,
      });

      // 1. Normalize `run_code` arguments (handle command -> code, missing description, etc.)
      if (exec.name === "run_code" && config.autoWrapRunCode) {
        isPythonProgram = readCodeRuntimeLanguage(ctx) === "python";
        const originalObj = objectValue(exec.arguments);
        const normalized = normalizeRunCodeArguments(exec.arguments);
        // An empty program would succeed as a no-op and hide the model error;
        // leave the original arguments for the host to reject loudly instead
        // of claiming a heal.
        if (normalized.code.trim().length === 0) {
          normalizedPreview = undefined;
        } else {
        const isCmdPass =
          originalObj !== undefined &&
          ("command" in originalObj || "cmd" in originalObj);
        const isMissingDesc =
          originalObj !== undefined &&
          (typeof originalObj["description"] !== "string" ||
            originalObj["description"].trim().length === 0);
        const rawCode =
          typeof originalObj?.["code"] === "string"
            ? originalObj["code"]
            : undefined;
        const hasMarkdownFence =
          rawCode !== undefined && stripMarkdownFences(rawCode) !== rawCode;

        const runCodeChanged = !runCodeArgsMatch(exec.arguments, normalized);
        if (isCmdPass) changes.push("将 command/cmd 转为 run_code.code");
        if (isMissingDesc) changes.push("补全 run_code.description");
        if (hasMarkdownFence) changes.push("移除 code 的 Markdown 围栏");
        if (runCodeChanged && changes.length === 0)
          changes.push("规范化 run_code 参数");
        if (runCodeChanged) {
          wasHealed = true;
          if (isCmdPass) healCategory = "INVALID_ARGS";
          else if (hasMarkdownFence) healCategory = "CODE_WRAP";
          else if (isMissingDesc) healCategory = "RUN_CODE_DESC";
          else healCategory = "INVALID_ARGS";
          // Serialize only for a real change: healthy calls (the common
          // case) skip a second full stringify of the program body.
          normalizedPreview = compactPreview(JSON.stringify(normalized));
        }

        // 2b. Preemptive inner-call repair: inject missing descriptions into the
        // program's tools.*() options objects before execution, but only for
        // tools whose active schema declares description as required. Skipped
        // for Python programs: the splice emits JS object syntax, which is
        // not valid inside a Python dict.
        const codeBody =
          typeof normalized.code === "string" ? normalized.code : undefined;
        if (codeBody !== undefined && !isPythonProgram) {
          // One program can reference the same tool dozens of times; resolve
          // each distinct schema once per dispatch instead of per occurrence.
          const descriptionCache = new Map<string, boolean>();
          const inner = injectInnerDescriptions(
            codeBody,
            String(normalized.description ?? ""),
            (toolName) => {
              const cached = descriptionCache.get(toolName);
              if (cached !== undefined) return cached;
              const required =
                tools !== undefined &&
                toolRequiresDescription(tools, toolName, exec.agent);
              descriptionCache.set(toolName, required);
              return required;
            },
          );
          if (inner.injected > 0) {
            normalized.code = inner.code;
            wasHealed = true;
            if (healCategory === "PASSTHROUGH") healCategory = "INNER_DESC";
            changes.push(`补全内层 description × ${inner.injected}`);
            normalizedPreview = compactPreview(JSON.stringify(normalized));
          }
        }

        // 2c. Body-syntax repair: a program that does not parse fails before
        // any inner call runs, so the argument-level heals above cannot help
        // it. Repair the three mechanical model-side breakage classes
        // (truncated tails, Python triple-quoted strings, stray template
        // backticks); every candidate is re-parsed before acceptance and
        // valid programs are never touched. TypeScript-only: under a Python
        // runtime the "triple-quoted string" shape is valid source, and
        // `AsyncFunction` parsing does not describe Python at all.
        if (typeof normalized.code === "string" && !isPythonProgram) {
          const repaired = repairRunCodeSyntax(normalized.code);
          if (repaired !== undefined) {
            normalized.code = repaired;
            wasHealed = true;
            // The body was the blocker the argument-level heals cannot fix, so
            // the syntax repair owns the category; the summary keeps every
            // change (including a completed description).
            healCategory = "RUN_CODE_SYNTAX";
            changes.push("修复 run_code 程序语法");
            normalizedPreview = compactPreview(JSON.stringify(normalized));
          }
        }

        exec.arguments = normalized;
        }
      }

      // 2. Normalize editor arguments (relative paths, view ranges).
      // Relative-to-absolute resolution runs only for str_replace_editor,
      // which rejects relative paths; the edit family resolves them against
      // the session workspace itself.
      if (
        (exec.name === "edit" || exec.name === "str_replace_editor") &&
        config.autoClampRanges
      ) {
        const normalized = normalizeEditorArguments(
          exec.name,
          exec.arguments,
          sessionCwd(exec.agent),
          undefined,
          exec.name === "str_replace_editor",
        );
        if (JSON.stringify(normalized) !== getRawArgsStr()) {
          wasHealed = true;
          healCategory = "RANGE_CLAMP";
          normalizedPreview = compactPreview(JSON.stringify(normalized));
          changes.push("规范化编辑器路径/范围");
        }
        exec.arguments = normalized;
      }

      // 3. Normalize read/glob offset arguments (off-by-one fix)
      if (
        (exec.name === "read" || exec.name === "glob" || exec.name === "grep") &&
        config.autoClampRanges
      ) {
        const normalized = normalizeReadArguments(exec.name, exec.arguments);
        if (normalized !== undefined) {
          wasHealed = true;
          healCategory = "READ_ARGS";
          normalizedPreview = compactPreview(JSON.stringify(normalized));
          changes.push("修复 offset/start 参数（0→1 基准修正）");
          exec.arguments = normalized;
        }
      }

      // 4. Delegate to the downstream execution pipeline
      try {
        let result = await next();

        // A host that exposes Code-Mode collapse through the waterfall may
        // return UNKNOWN_TOOL here. Re-enter the public runtime dispatcher as a
        // nested call; this keeps the real result/context contract intact. A
        // collapsed call rejected in createExecution never reaches this plugin,
        // which remains a host limitation rather than a reason to call a tool
        // definition directly.
        if (
          config.autoBridgeDirectTools &&
          tools &&
          resultHasCode(result, "UNKNOWN_TOOL") &&
          isBridgeableDirectCall(exec, tools)
        ) {
          result = await executeBridgeDirectCall(exec, tools);
          // Recording happens in the `tools/result` observer from the frozen
          // final outcome; the stash below carries the wrapper-observed
          // outcome only for hosts predating that event.
          stashPending(
            exec.callId,
            {
              ...currentPending(true),
              category: "UNKNOWN_TOOL",
              wasHealed: true,
              normalizedArgsPreview: `Nested dispatch: ${exec.name}`,
              normalizationSummary: `通过宿主嵌套派发恢复 ${exec.name}，保留 agent、会话和取消上下文`,
            },
            {
              status: result.isError ? "failed" : "success",
              errorMessage: resultErrorText(result),
              tokensSaved: savedTokens(true, !result.isError, "UNKNOWN_TOOL"),
            },
            exec.agent,
          );
          return result;
        }

        // Do not pre-read every mutation. Only the guarded-mutation failure
        // triggers one read followed by one standard nested retry, so normal
        // edits/writes pay no extra tool call and the retry remains scoped to the
        // original session. FS_STALE_VERSION is retried the same way: the fresh
        // read updates the observed version before the same mutation runs again.
        if (
          config.autoObserveFiles &&
          !isObservationRetry(exec) &&
          tools &&
          (resultHasCode(result, "FS_NOT_OBSERVED") ||
            resultHasCode(result, "FS_STALE_VERSION"))
        ) {
          const staleRetry = resultHasCode(result, "FS_STALE_VERSION");
          const retried = await observeAndRetryMutation(exec, tools);
          if (retried !== undefined) {
            wasHealed = true;
            healCategory = "FS_OBSERVED";
            normalizedPreview = `Read ${editPath(exec.arguments) ?? "file"} then retry`;
            changes.push(
              staleRetry ? "重读最新版本后重试修改" : "读取目标文件后重试修改",
            );
            result = retried;
          }
        }
        // Anchor failures must not be retried blindly with the same arguments.
        // A best-effort refresh still helps: it updates the observed version so
        // the model's next retry is not additionally blocked. The original
        // error stays authoritative and the call is not counted as healed.
        if (
          config.autoObserveFiles &&
          !isSelfNestedExec(exec) &&
          tools &&
          result.isError === true &&
          (resultHasCode(result, "FS_EDIT_NOT_FOUND") ||
            resultHasCode(result, "FS_AMBIGUOUS_EDIT"))
        ) {
          await refreshObservation(exec, tools);
          changes.push("已预读刷新文件观察态，便于下次重试");
        }
        if (
          config.autoClampRanges &&
          !isRangeRetry(exec) &&
          tools &&
          result.isError === true
        ) {
          const lineCount = lineCountFromRangeError(result);
          if (lineCount !== undefined) {
            const retried = await clampAndRetryRange(exec, tools, lineCount);
            if (retried !== undefined) {
              wasHealed = true;
              healCategory = "RANGE_CLAMP";
              normalizedPreview = compactPreview(JSON.stringify(retried.args));
              changes.push(`按文件真实行数修正 view_range（${lineCount} 行）`);
              result = retried.result;
            }
          }
        }
        // A pre-dispatch normalization that did not address the final error is
        // not a failed heal: attribute it honestly as an unrelated failure so
        // the healing rate measures real efficacy. Retries (FS_OBSERVED and
        // RANGE_CLAMP range retries) always own their outcome; UNKNOWN_TOOL
        // bridging returns before reaching this point.
        if (
          result.isError === true &&
          wasHealed &&
          healCategory !== "PASSTHROUGH" &&
          healCategory !== "FS_OBSERVED" &&
          healCategory !== "RANGE_CLAMP" &&
          !healMatchesError(
            healCategory,
            errorCode(result.isError ? result.error : undefined),
            resultErrorText(result),
          )
        ) {
          changes.push(
            `修复尝试未命中终错（${(resultErrorText(result) ?? "未知错误").slice(0, 60)}），计入未修复`,
          );
          wasHealed = false;
          healCategory = "PASSTHROUGH";
        }
        // Unrecoverable errors still benefit from one appended hint: the model
        // receives actionable guidance in the same round-trip instead of
        // failing blindly again. The original error text is always preserved.
        if (config.errorHints && result.isError === true) {
          const failureText = resultErrorText(result) ?? "";
          if (
            resultHasCode(result, "UNKNOWN_TOOL") &&
            failureText.includes("only `run_code` is callable directly")
          ) {
            result = appendResultHint(result, collapsedCallHint(exec.name));
          } else if (
            exec.name === "run_code" &&
            !isPythonProgram &&
            healCategory !== "RUN_CODE_SYNTAX" &&
            isSyntaxLikeRunFailure(
              errorCode(result.isError ? result.error : undefined),
              failureText,
            )
          ) {
            result = appendResultHint(result, SYNTAX_HINT);
          }
        }
        stashPending(
          exec.callId,
          currentPending(
            wasHealed || result.isError === true || config.persistPassthrough,
          ),
          {
            status: resultStatus(result, wasHealed),
            errorMessage: resultErrorText(result),
            tokensSaved: savedTokens(wasHealed, !result.isError, healCategory),
          },
          exec.agent,
        );
        return result;
      } catch (error: unknown) {
        // If a legacy host throws UNKNOWN_TOOL after entering the waterfall,
        // attempt the same safe nested-dispatch recovery.
        const currentTools = getTools();
        if (
          config.autoBridgeDirectTools &&
          currentTools &&
          thrownHasCode(error, "UNKNOWN_TOOL") &&
          isBridgeableDirectCall(exec, currentTools)
        ) {
          const bridgedResult = await executeBridgeDirectCall(
            exec,
            currentTools,
          );
          stashPending(
            exec.callId,
            {
              ...currentPending(true),
              category: "UNKNOWN_TOOL",
              wasHealed: true,
              normalizedArgsPreview: `Nested dispatch: ${exec.name}`,
              normalizationSummary: `通过宿主嵌套派发恢复 ${exec.name}，保留 agent、会话和取消上下文`,
            },
            {
              status: bridgedResult.isError ? "failed" : "success",
              errorMessage: resultErrorText(bridgedResult),
              tokensSaved: savedTokens(
                true,
                !bridgedResult.isError,
                "UNKNOWN_TOOL",
              ),
            },
            exec.agent,
          );
          return bridgedResult;
        }

        stashPending(
          exec.callId,
          currentPending(true),
          {
            status: "failed",
            errorMessage: errorText(error) ?? String(error),
            tokensSaved: 0,
          },
          exec.agent,
        );
        throw error;
      }
    },
  );

  // Observe the frozen final outcome off the dispatch hot path. This covers
  // every settled call — including pre-execute/guard denials the `execute`
  // wrapper never sees — while the wrapper keeps owning normalization and
  // healing. The host contains observer failures; this one still never
  // throws so it cannot spam the host warning log.
  ctx.on(
    "tools/result",
    (
      exec: Pick<ToolDispatchExecution, "name" | "callId" | "arguments">,
      result: ToolExecutionResult,
    ): undefined => {
      try {
        if (
          typeof exec.callId === "string" &&
          exec.callId.includes(":normalizer:")
        ) {
          return undefined;
        }
        // Synchronous correlation: the event firing at all proves host
        // support, so confirm before any async recording below. Only the
        // tracker/file writes defer behind history restore.
        resultHookConfirmed = true;
        const callId = exec.callId;
        const stashed = typeof callId === "string"
          ? pendingHeals.get(callId)
          : undefined;
        if (stashed !== undefined && typeof callId === "string") {
          pendingHeals.delete(callId);
        }
        const alreadyInline = stashed === undefined &&
          typeof callId === "string" &&
          inlineRecorded.delete(callId);
        if (pendingHeals.size === 0) stopFallbackTimer();
        void restoreReady.then(() => {
          try {
            if (stashed !== undefined) {
              recordEvent(buildRecord(stashed.pending, result, stashed.agent));
              return;
            }
            if (alreadyInline) return;
            // A settled call the wrapper never saw: a pre-execute or guard
            // denial. Count it honestly as an untouched failure or pass.
            const failed = result.isError === true;
            let originalArgsPreview = "";
            if (failed || config.persistPassthrough) {
              try {
                originalArgsPreview = compactPreview(
                  JSON.stringify(
                    (exec as { arguments?: unknown }).arguments ?? {},
                  ) ?? "{}",
                );
              } catch {
                // Preview is diagnostic; an unserializable snapshot stays empty.
              }
            }
            recordEvent({
              id: `norm_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
              time: Date.now(),
              toolName: exec.name,
              category: "PASSTHROUGH",
              wasHealed: false,
              originalArgsPreview,
              status: failed ? "failed" : "passthrough",
              errorMessage: resultErrorText(result),
            });
          } catch {
            // Recording is diagnostic only; never disturb the settled call.
          }
        });
      } catch {
        // Recording is diagnostic only; never disturb the settled call.
      }
      return undefined;
    },
  );
}

export default { name, inject, apply };