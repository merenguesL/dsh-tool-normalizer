// src/normalizers/direct-bridge.ts
var BRIDGEABLE_TOOLS = /* @__PURE__ */ new Set([
  "bash",
  "read",
  "write",
  "grep",
  "edit",
  "glob",
  "str_replace_editor",
  "job_output",
  "job_kill"
]);
function isBridgeableDirectCall(toolName, tools) {
  if (tools.get(toolName) !== void 0) {
    return false;
  }
  return BRIDGEABLE_TOOLS.has(toolName) && tools.get("run_code") !== void 0;
}
async function executeBridgeDirectCall(exec, tools) {
  const runCodeTool = tools.get("run_code");
  if (!runCodeTool || typeof runCodeTool.execute !== "function") {
    return {
      content: [{
        type: "text",
        text: `Tool '${exec.name}' is not registered, and 'run_code' fallback is unavailable.`
      }],
      isError: true
    };
  }
  const argsJson = JSON.stringify(exec.arguments ?? {});
  const syntheticCode = `const result = await tools.${exec.name}(${argsJson});
return result;`;
  const syntheticExec = {
    name: "run_code",
    arguments: {
      description: `[Auto-Bridged] Execute ${exec.name} in Code-Mode`,
      code: syntheticCode
    },
    callId: exec.callId,
    rootCallId: exec.rootCallId,
    token: exec.token,
    signal: exec.signal
  };
  try {
    return await runCodeTool.execute(syntheticExec);
  } catch (error) {
    return {
      content: [{
        type: "text",
        text: `Auto-bridged execution of '${exec.name}' failed: ${error instanceof Error ? error.message : String(error)}`
      }],
      isError: true,
      error: error instanceof Error ? error : new Error(String(error))
    };
  }
}

// src/normalizers/range-clamper.ts
import { isAbsolute, resolve } from "node:path";
function normalizeEditorArguments(toolName, rawArgs, cwd = process.cwd()) {
  if (!rawArgs || typeof rawArgs !== "object") {
    return {};
  }
  const args = { ...rawArgs };
  const pathKey = "path" in args ? "path" : "file_path" in args ? "file_path" : "TargetFile" in args ? "TargetFile" : void 0;
  if (pathKey && typeof args[pathKey] === "string") {
    const rawPath = args[pathKey].trim();
    if (rawPath && !isAbsolute(rawPath) && !rawPath.startsWith("/")) {
      args[pathKey] = resolve(cwd, rawPath);
    }
  }
  if (Array.isArray(args["view_range"]) && args["view_range"].length === 2) {
    const [start, end] = args["view_range"];
    if (typeof start === "number" && typeof end === "number") {
      const validStart = Math.max(1, Math.floor(start));
      const validEnd = Math.max(validStart, Math.floor(end));
      args["view_range"] = [validStart, validEnd];
    }
  }
  return args;
}

// src/normalizers/run-code.ts
function stripMarkdownFences(code) {
  const trimmed = code.trim();
  const match = /^```(?:[a-zA-Z0-9_-]+)?\r?\n([\s\S]*?)\r?\n```$/m.exec(trimmed);
  if (match && match[1]) {
    return match[1].trim();
  }
  return trimmed;
}
function normalizeRunCodeArguments(rawArgs) {
  let argsObj = {};
  if (typeof rawArgs === "string") {
    const trimmed = rawArgs.trim();
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed && typeof parsed === "object") {
        argsObj = parsed;
      } else {
        argsObj = { code: trimmed };
      }
    } catch {
      argsObj = { code: trimmed };
    }
  } else if (rawArgs && typeof rawArgs === "object") {
    argsObj = { ...rawArgs };
  }
  const rawCommand = argsObj["command"] ?? argsObj["cmd"];
  if (typeof rawCommand === "string" && (!argsObj["code"] || typeof argsObj["code"] !== "string")) {
    const cmdStr = rawCommand.trim();
    const description2 = typeof argsObj["description"] === "string" && argsObj["description"].trim().length > 0 ? argsObj["description"].trim() : `Execute command: ${cmdStr.slice(0, 50)}`;
    const synthesizedCode = `const result = await tools.bash(${JSON.stringify({ command: cmdStr })});
return result;`;
    return {
      description: description2,
      code: synthesizedCode
    };
  }
  let code = typeof argsObj["code"] === "string" ? argsObj["code"] : "";
  code = stripMarkdownFences(code);
  let description = typeof argsObj["description"] === "string" ? argsObj["description"].trim() : "";
  if (!description) {
    const firstLine = code.split("\n")[0]?.trim() || "";
    if (firstLine.startsWith("//") || firstLine.startsWith("#") || firstLine.startsWith("/*")) {
      description = firstLine.replace(/^[/#*\s]+/, "").slice(0, 60).trim();
    }
    if (!description) {
      description = "Execute code script";
    }
  }
  return {
    code,
    description
  };
}

// src/prompt.ts
var TOOL_NORMALIZER_PROMPT_SECTION = "tool-normalizer:guidance";
var GUIDANCE_TEXT = `## Tool Call Reliability & Best Practices
- In Code-Mode (when \`run_code\` is provided), write complete executable JavaScript to dispatch tools sequentially via \`await tools.<name>(args)\`. Avoid raw string escaping pitfalls for complex shell scripts by using variables or script files.
- Inside \`run_code\`, EVERY \`tools.<name>({...})\` call MUST include a short \`description\` string property alongside its other arguments \u2014 sub-calls are validated against the full schema and fail without it.
- Always observe (read) files before editing or replacing text to ensure exact content alignment.
- Always provide absolute paths for file manipulation tools.`;
function registerPromptGuidance(ctx) {
  const systemPrompt = typeof ctx.get === "function" ? ctx.get("systemPrompt") : ctx.systemPrompt;
  if (!systemPrompt || typeof systemPrompt.section !== "function") return;
  systemPrompt.section({
    name: TOOL_NORMALIZER_PROMPT_SECTION,
    order: 400,
    text: GUIDANCE_TEXT
  });
}

// src/stats-log.ts
import { appendFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
function statsLogPath() {
  const home = process.env["DSH_HOME"] ?? join(homedir(), ".dsh");
  return join(home, "tool-normalizer-events.jsonl");
}
var retryTokenCost = 0;
function setRetryTokenCost(cost) {
  retryTokenCost = Number.isFinite(cost) && cost > 0 ? Math.round(cost) : 0;
}
async function restoreFromLog(tracker) {
  let raw;
  try {
    raw = await readFile(statsLogPath(), "utf-8");
  } catch {
    return;
  }
  const totals = {
    totalIntercepted: 0,
    healedSuccess: 0,
    healedFailed: 0,
    passThrough: 0,
    estimatedTokensSaved: 0
  };
  const byTool = {};
  const byCategory = {};
  const records = [];
  for (const line of raw.split("\n")) {
    if (!line.trim()) continue;
    let record;
    try {
      const parsed = JSON.parse(line);
      if (typeof parsed !== "object" || parsed === null || typeof parsed.time !== "number") continue;
      record = parsed;
    } catch {
      continue;
    }
    totals.totalIntercepted++;
    if (record.status === "success" && record.wasHealed) totals.healedSuccess++;
    else if (record.status === "failed") totals.healedFailed++;
    else totals.passThrough++;
    byTool[record.toolName] = (byTool[record.toolName] ?? 0) + 1;
    byCategory[record.category] = (byCategory[record.category] ?? 0) + 1;
    records.push(record);
  }
  tracker.restore({
    ...totals,
    estimatedTokensSaved: totals.healedSuccess * retryTokenCost,
    healingSuccessRate: 100,
    byTool,
    byCategory,
    recentRecords: records.sort((a, b) => b.time - a.time)
  });
}
function isTestRun() {
  return process.env["VITEST"] !== void 0 || process.env["NODE_ENV"] === "test";
}
function appendEvent(record) {
  if (isTestRun()) return;
  void mkdir(join(statsLogPath(), ".."), { recursive: true }).then(() => appendFile(statsLogPath(), JSON.stringify(record) + "\n")).catch(() => {
  });
}

// src/tracker.ts
var ToolNormalizerTracker = class _ToolNormalizerTracker {
  static instance;
  totalIntercepted = 0;
  healedSuccess = 0;
  healedFailed = 0;
  passThrough = 0;
  estimatedTokensSaved = 0;
  byTool = {};
  byCategory = {};
  records = [];
  /** Dashboard transport window; the JSONL log holds the unbounded history. */
  maxRecords = 1e3;
  retryTokenCost = 0;
  static getInstance() {
    if (!_ToolNormalizerTracker.instance) {
      _ToolNormalizerTracker.instance = new _ToolNormalizerTracker();
    }
    return _ToolNormalizerTracker.instance;
  }
  /**
   * Record one tool normalizer event.
   */
  record(record) {
    this.totalIntercepted++;
    if (record.status === "success" && record.wasHealed) {
      this.healedSuccess++;
    } else if (record.status === "failed") {
      this.healedFailed++;
    } else {
      this.passThrough++;
    }
    this.byTool[record.toolName] = (this.byTool[record.toolName] ?? 0) + 1;
    this.byCategory[record.category] = (this.byCategory[record.category] ?? 0) + 1;
    if (record.status === "success" && record.wasHealed && this.retryTokenCost > 0) {
      this.estimatedTokensSaved += Math.round(this.retryTokenCost);
    }
    this.records.unshift(record);
    if (this.records.length > this.maxRecords) {
      this.records.pop();
    }
  }
  /**
   * Set the per-healed-call token-cost estimate used by the projection.
   * Non-finite or non-positive values disable the projection.
   */
  setRetryTokenCost(cost) {
    this.retryTokenCost = Number.isFinite(cost) && cost > 0 ? cost : 0;
  }
  /**
   * Rebuild aggregates from a replayed history (JSONL log restore). Counters
   * and maps are replaced wholesale; the record ring keeps the newest window
   * of the supplied events.
   */
  restore(stats) {
    this.totalIntercepted = stats.totalIntercepted;
    this.healedSuccess = stats.healedSuccess;
    this.healedFailed = stats.healedFailed;
    this.passThrough = stats.passThrough;
    this.estimatedTokensSaved = stats.estimatedTokensSaved;
    this.byTool = { ...stats.byTool };
    this.byCategory = { ...stats.byCategory };
    this.records = [...stats.recentRecords].sort((a, b) => b.time - a.time).slice(0, this.maxRecords);
  }
  /**
   * Retrieve the current aggregate statistics snapshot.
   */
  getSnapshot() {
    const totalHealAttempts = this.healedSuccess + this.healedFailed;
    const healingSuccessRate = totalHealAttempts > 0 ? Math.round(this.healedSuccess / totalHealAttempts * 1e3) / 10 : 100;
    return {
      totalIntercepted: this.totalIntercepted,
      healedSuccess: this.healedSuccess,
      healedFailed: this.healedFailed,
      passThrough: this.passThrough,
      estimatedTokensSaved: this.estimatedTokensSaved,
      healingSuccessRate,
      byTool: { ...this.byTool },
      byCategory: { ...this.byCategory },
      recentRecords: [...this.records]
    };
  }
  /**
   * Reset tracking metrics.
   */
  reset() {
    this.totalIntercepted = 0;
    this.healedSuccess = 0;
    this.healedFailed = 0;
    this.passThrough = 0;
    this.estimatedTokensSaved = 0;
    this.byTool = {};
    this.byCategory = {};
    this.records = [];
  }
};

// src/index.ts
var name = "tool-normalizer";
var inject = ["tools"];
function apply(ctx, userConfig = {}) {
  const config = {
    autoWrapRunCode: userConfig.autoWrapRunCode ?? true,
    autoBridgeDirectTools: userConfig.autoBridgeDirectTools ?? true,
    autoObserveFiles: userConfig.autoObserveFiles ?? true,
    autoClampRanges: userConfig.autoClampRanges ?? true,
    injectPrompt: userConfig.injectPrompt ?? true,
    estimatedRetryTokenCost: userConfig.estimatedRetryTokenCost ?? 8e3
  };
  const tracker = ToolNormalizerTracker.getInstance();
  setRetryTokenCost(config.estimatedRetryTokenCost);
  void restoreFromLog(tracker);
  const recordEvent = (record) => {
    tracker.record(record);
    appendEvent(record);
    ctx.logger?.debug?.(
      `[tool-normalizer] ${record.toolName} category=${record.category} healed=${record.wasHealed} status=${record.status}`
    );
  };
  ctx.logger?.info?.(`[tool-normalizer] active \u2014 intercepting tools/execute; history log: ${statsLogPath()}`);
  let registerAttempts = 0;
  const tryRegisterStatsRoute = () => {
    const webServer = typeof ctx.get === "function" ? ctx.get("webServer") : ctx.webServer;
    if (!webServer || typeof webServer.register !== "function") {
      if (registerAttempts++ < 60) {
        const timer = setTimeout(tryRegisterStatsRoute, 1e3);
        timer.unref?.();
      } else {
        ctx.logger?.warn?.("[tool-normalizer] no webserver appeared within 60s; stats feed disabled");
      }
      return;
    }
    ctx.effect(() => webServer.register({
      kind: "exact",
      path: "/plugin-api/tool-normalizer/stats",
      handler: (_req, res) => {
        res.writeHead(200, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
        res.end(JSON.stringify(tracker.getSnapshot()));
      }
    }), "tool-normalizer: stats http route");
    ctx.logger?.info?.("[tool-normalizer] stats feed at GET /plugin-api/tool-normalizer/stats");
  };
  tryRegisterStatsRoute();
  if (config.injectPrompt) {
    registerPromptGuidance(ctx);
  }
  const getTools = () => typeof ctx.get === "function" ? ctx.get("tools") : ctx.tools;
  ctx.on("tools/execute", async (exec, next) => {
    const rawArgsStr = JSON.stringify(exec.arguments ?? {});
    const startTime = Date.now();
    const eventId = `norm_${startTime}_${Math.random().toString(36).slice(2, 8)}`;
    const tools = getTools();
    if (config.autoBridgeDirectTools && tools && isBridgeableDirectCall(exec.name, tools)) {
      const result = await executeBridgeDirectCall(exec, tools);
      recordEvent({
        id: eventId,
        time: startTime,
        toolName: exec.name,
        category: "UNKNOWN_TOOL",
        wasHealed: true,
        originalArgsPreview: rawArgsStr.slice(0, 150),
        normalizedArgsPreview: `Bridged to run_code(tools.${exec.name})`,
        status: result.isError ? "failed" : "success",
        errorMessage: result.isError && result.error ? result.error.message : void 0
      });
      return result;
    }
    let wasHealed = false;
    let healCategory = "PASSTHROUGH";
    let normalizedPreview;
    if (exec.name === "run_code" && config.autoWrapRunCode) {
      const originalObj = exec.arguments;
      const isCmdPass = originalObj && ("command" in originalObj || "cmd" in originalObj);
      const isMissingDesc = originalObj && !originalObj["description"];
      const normalized = normalizeRunCodeArguments(exec.arguments);
      if (isCmdPass || isMissingDesc || JSON.stringify(normalized) !== rawArgsStr) {
        wasHealed = true;
        healCategory = isCmdPass ? "INVALID_ARGS" : "CODE_WRAP";
        normalizedPreview = JSON.stringify(normalized).slice(0, 150);
      }
      exec.arguments = normalized;
    }
    if ((exec.name === "edit" || exec.name === "str_replace_editor") && config.autoClampRanges) {
      const normalized = normalizeEditorArguments(exec.name, exec.arguments);
      if (JSON.stringify(normalized) !== rawArgsStr) {
        wasHealed = true;
        healCategory = "RANGE_CLAMP";
        normalizedPreview = JSON.stringify(normalized).slice(0, 150);
      }
      exec.arguments = normalized;
    }
    try {
      const result = await next();
      recordEvent({
        id: eventId,
        time: startTime,
        toolName: exec.name,
        category: healCategory,
        wasHealed,
        originalArgsPreview: rawArgsStr.slice(0, 150),
        normalizedArgsPreview: normalizedPreview,
        status: result.isError ? "failed" : wasHealed ? "success" : "passthrough",
        errorMessage: result.isError && result.error ? result.error.message : void 0
      });
      return result;
    } catch (error) {
      const currentTools = getTools();
      if (config.autoBridgeDirectTools && currentTools && isBridgeableDirectCall(exec.name, currentTools)) {
        const bridgedResult = await executeBridgeDirectCall(exec, currentTools);
        recordEvent({
          id: eventId,
          time: startTime,
          toolName: exec.name,
          category: "UNKNOWN_TOOL",
          wasHealed: true,
          originalArgsPreview: rawArgsStr.slice(0, 150),
          normalizedArgsPreview: `Fallback bridged to run_code(tools.${exec.name})`,
          status: bridgedResult.isError ? "failed" : "success"
        });
        return bridgedResult;
      }
      recordEvent({
        id: eventId,
        time: startTime,
        toolName: exec.name,
        category: healCategory,
        wasHealed,
        originalArgsPreview: rawArgsStr.slice(0, 150),
        normalizedArgsPreview: normalizedPreview,
        status: "failed",
        errorMessage: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  });
}
var src_default = { name, inject, apply };
export {
  GUIDANCE_TEXT,
  TOOL_NORMALIZER_PROMPT_SECTION,
  ToolNormalizerTracker,
  apply,
  src_default as default,
  executeBridgeDirectCall,
  inject,
  isBridgeableDirectCall,
  name,
  normalizeEditorArguments,
  normalizeRunCodeArguments,
  registerPromptGuidance,
  stripMarkdownFences
};
