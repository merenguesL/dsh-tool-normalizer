// src/normalizers/nested-dispatch.ts
function nestedCallId(exec, suffix) {
  return `${exec.callId ?? `tool-normalizer-${Date.now()}`}:normalizer:${suffix}`;
}
async function executeNestedTool(parent, tools, name2, args, suffix) {
  if (typeof tools.execute !== "function") {
    return recoveryFailure(`Cannot recover '${parent.name}': the host tools.execute() dispatcher is unavailable.`);
  }
  if (parent.signal === void 0) {
    return recoveryFailure(`Cannot recover '${parent.name}': the original cancellation signal is unavailable.`);
  }
  if (parent.token === void 0) {
    return recoveryFailure(`Cannot recover '${parent.name}': the original execution token is unavailable.`);
  }
  const baseCallId = parent.callId ?? `tool-normalizer-${Date.now()}`;
  const input = {
    callId: nestedCallId(parent, suffix),
    rootCallId: parent.rootCallId ?? baseCallId,
    name: name2,
    arguments: args,
    agent: parent.agent,
    parent: parent.token,
    signal: parent.signal
  };
  try {
    return await tools.execute(input);
  } catch (error) {
    return recoveryFailure(
      `Nested recovery of '${parent.name}' through '${name2}' failed: ${error instanceof Error ? error.message : String(error)}`,
      error
    );
  }
}
function recoveryFailure(text, cause) {
  return {
    content: [{ type: "text", text }],
    isError: true,
    ...cause instanceof Error ? { error: cause } : {}
  };
}

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
function isBridgeableDirectCall(exec, tools) {
  if (exec.parent !== void 0 || !BRIDGEABLE_TOOLS.has(exec.name)) return false;
  if (typeof tools.execute !== "function") return false;
  return tools.get("run_code", exec.agent) !== void 0 && tools.get(exec.name, exec.agent) !== void 0;
}
async function executeBridgeDirectCall(exec, tools) {
  if (typeof tools.execute !== "function") {
    return recoveryFailure(`Cannot recover '${exec.name}': the host tools.execute() dispatcher is unavailable.`);
  }
  if (exec.signal === void 0) {
    return recoveryFailure(`Cannot recover '${exec.name}': the original cancellation signal is unavailable.`);
  }
  if (exec.token === void 0) {
    return recoveryFailure(`Cannot recover '${exec.name}': the original execution token is unavailable.`);
  }
  return executeNestedTool(exec, tools, exec.name, exec.arguments ?? {}, `bridge-${exec.name}`);
}

// src/normalizers/inner-description.ts
var BACKTICK = String.fromCharCode(96);
var IDENTIFIER_START = /[A-Za-z_$]/;
var IDENTIFIER_PART = /[A-Za-z0-9_$]/;
function isIdentifierStart(ch) {
  return ch !== void 0 && IDENTIFIER_START.test(ch);
}
function isIdentifierPart(ch) {
  return ch !== void 0 && IDENTIFIER_PART.test(ch);
}
function skipLineComment(code, start) {
  const newline = code.indexOf("\n", start + 2);
  return newline === -1 ? code.length : newline;
}
function skipBlockComment(code, start) {
  const end = code.indexOf("*/", start + 2);
  return end === -1 ? -1 : end + 2;
}
function isRegexStart(code, start) {
  let i = start - 1;
  while (i >= 0 && /\s/.test(code[i])) i--;
  if (i < 0) return true;
  const previous = code[i];
  if ("([{,:;=!?&|+-*%^~<>".includes(previous)) return true;
  if (isIdentifierPart(previous)) {
    let wordStart = i;
    while (wordStart >= 0 && isIdentifierPart(code[wordStart])) wordStart--;
    const word = code.slice(wordStart + 1, i + 1);
    return (/* @__PURE__ */ new Set(["return", "throw", "case", "delete", "void", "typeof", "new", "in", "of", "yield", "await", "else", "do"])).has(word);
  }
  return false;
}
function skipRegex(code, start) {
  let inClass = false;
  let i = start + 1;
  while (i < code.length) {
    const ch = code[i];
    if (ch === "\\") {
      i += 2;
      continue;
    }
    if (ch === "\n" || ch === "\r") return -1;
    if (ch === "[") {
      inClass = true;
      i++;
      continue;
    }
    if (ch === "]") {
      inClass = false;
      i++;
      continue;
    }
    if (ch === "/" && !inClass) {
      i++;
      while (i < code.length && /[A-Za-z]/.test(code[i])) i++;
      return i;
    }
    i++;
  }
  return -1;
}
function skipStringOrTemplate(code, start) {
  const quote = code[start];
  let i = start + 1;
  while (i < code.length) {
    const ch = code[i];
    if (ch === "\\") {
      i += 2;
      continue;
    }
    if (quote !== BACKTICK) {
      if (ch === quote) return i + 1;
      i++;
      continue;
    }
    if (ch === "`") return i + 1;
    if (ch === "$" && code[i + 1] === "{") {
      const end = skipTemplateExpression(code, i + 2);
      if (end < 0) return -1;
      i = end;
      continue;
    }
    i++;
  }
  return -1;
}
function skipTemplateExpression(code, start) {
  let depth = 1;
  let i = start;
  while (i < code.length) {
    const ch = code[i];
    if (ch === String.fromCharCode(39) || ch === String.fromCharCode(34) || ch === BACKTICK) {
      const end = skipStringOrTemplate(code, i);
      if (end < 0) return -1;
      i = end;
      continue;
    }
    if (ch === "/" && code[i + 1] === "/") {
      i = skipLineComment(code, i);
      continue;
    }
    if (ch === "/" && code[i + 1] === "*") {
      i = skipBlockComment(code, i);
      if (i < 0) return -1;
      continue;
    }
    if (ch === "/" && code[i + 1] !== "/" && code[i + 1] !== "*" && isRegexStart(code, i)) {
      i = skipRegex(code, i);
      if (i < 0) return -1;
      continue;
    }
    if (ch === "{") depth++;
    else if (ch === "}" && --depth === 0) return i + 1;
    i++;
  }
  return -1;
}
function findObjectEnd(code, open) {
  let depth = 0;
  let i = open;
  while (i < code.length) {
    const ch = code[i];
    if (ch === String.fromCharCode(39) || ch === String.fromCharCode(34) || ch === BACKTICK) {
      const end = skipStringOrTemplate(code, i);
      if (end < 0) return -1;
      i = end;
      continue;
    }
    if (ch === "/" && code[i + 1] === "/") {
      i = skipLineComment(code, i);
      continue;
    }
    if (ch === "/" && code[i + 1] === "*") {
      i = skipBlockComment(code, i);
      if (i < 0) return -1;
      continue;
    }
    if (ch === "/" && code[i + 1] !== "/" && code[i + 1] !== "*" && isRegexStart(code, i)) {
      i = skipRegex(code, i);
      if (i < 0) return -1;
      continue;
    }
    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) return i;
    }
    i++;
  }
  return -1;
}
function skipWhitespace(code, start, end) {
  let i = start;
  while (i < end && /\s/.test(code[i])) i++;
  return i;
}
function quotedKey(code, start, end) {
  const next = skipStringOrTemplate(code, start);
  if (next < 0 || next > end) return { key: void 0, next: -1 };
  const raw = code.slice(start, next);
  if (raw[0] === '"') {
    try {
      return { key: JSON.parse(raw), next };
    } catch {
      return { key: void 0, next };
    }
  }
  return raw.endsWith("'") && raw.slice(1, -1).includes("\\") ? { key: void 0, next } : { key: raw.slice(1, -1), next };
}
function hasDescriptionProperty(code, open, close) {
  let depth = 0;
  let expectProperty = true;
  let i = open + 1;
  while (i < close) {
    const ch = code[i];
    if (ch === String.fromCharCode(39) || ch === String.fromCharCode(34) || ch === BACKTICK) {
      const end = skipStringOrTemplate(code, i);
      if (end < 0 || end > close) return true;
      if (depth === 0 && expectProperty) {
        const { key, next } = quotedKey(code, i, close);
        const after = skipWhitespace(code, next, close);
        if (key === "description") return true;
        expectProperty = code[after] === ":" ? false : true;
      }
      i = end;
      continue;
    }
    if (ch === "/" && code[i + 1] === "/") {
      i = skipLineComment(code, i);
      continue;
    }
    if (ch === "/" && code[i + 1] === "*") {
      i = skipBlockComment(code, i);
      if (i < 0) return true;
      continue;
    }
    if (ch === "/" && code[i + 1] !== "/" && code[i + 1] !== "*" && isRegexStart(code, i)) {
      i = skipRegex(code, i);
      if (i < 0) return true;
      continue;
    }
    if (depth === 0) {
      if (ch === ",") {
        expectProperty = true;
        i++;
        continue;
      }
      if (!expectProperty) {
        if (ch === "{" || ch === "[") depth++;
        i++;
        continue;
      }
      if (code.startsWith("...", i) || ch === "[") return true;
      if (isIdentifierStart(ch)) {
        let end = i + 1;
        while (end < close && isIdentifierPart(code[end])) end++;
        const key = code.slice(i, end);
        const after = skipWhitespace(code, end, close);
        if (key === "description") return true;
        if (code[after] === ":") expectProperty = false;
        else if (code[after] === "(") expectProperty = false;
        else expectProperty = true;
        i = end;
        continue;
      }
      if (ch === "}") return false;
      i++;
      continue;
    }
    if (ch === "{" || ch === "[") depth++;
    else if (ch === "}" || ch === "]") depth--;
    i++;
  }
  return false;
}
var CALL_SHAPE = /^tools\.([A-Za-z_$][\w$]*)\s*\(\s*\{/u;
function injectInnerDescriptions(code, outerDescription, requiresDescription = () => true) {
  const out = [];
  let i = 0;
  let injected = 0;
  while (i < code.length) {
    const ch = code[i];
    if (ch === String.fromCharCode(39) || ch === String.fromCharCode(34) || ch === BACKTICK) {
      const end = skipStringOrTemplate(code, i);
      if (end < 0) return { code, injected: 0 };
      out.push(code.slice(i, end));
      i = end;
      continue;
    }
    if (ch === "/" && code[i + 1] === "/") {
      const end = skipLineComment(code, i);
      out.push(code.slice(i, end));
      i = end;
      continue;
    }
    if (ch === "/" && code[i + 1] === "*") {
      const end = skipBlockComment(code, i);
      if (end < 0) return { code, injected: 0 };
      out.push(code.slice(i, end));
      i = end;
      continue;
    }
    if (ch === "/" && code[i + 1] !== "/" && code[i + 1] !== "*" && isRegexStart(code, i)) {
      const end = skipRegex(code, i);
      if (end < 0) return { code, injected: 0 };
      out.push(code.slice(i, end));
      i = end;
      continue;
    }
    if (ch === "t" && code.startsWith("tools.", i)) {
      const match = CALL_SHAPE.exec(code.slice(i));
      if (match !== null) {
        const open = i + match[0].length - 1;
        const close = findObjectEnd(code, open);
        if (close < 0) return { code, injected: 0 };
        if (hasDescriptionProperty(code, open, close) || !requiresDescription(match[1])) {
          out.push(code.slice(i, close + 1));
        } else {
          const base = String(outerDescription || "inner call") + " \xB7 " + match[1];
          const label = base.slice(0, 80);
          out.push(code.slice(i, open + 1));
          out.push(" description: " + JSON.stringify(label) + ",");
          out.push(code.slice(open + 1, close + 1));
          injected++;
        }
        i = close + 1;
        continue;
      }
    }
    out.push(ch);
    i++;
  }
  return { code: out.join(""), injected };
}

// src/normalizers/preview.ts
var PREVIEW_LIMIT = 180;
var ELLIPSIS = " \u2026 ";
function compactPreview(text, limit = PREVIEW_LIMIT) {
  if (text.length <= limit) return text;
  if (limit <= ELLIPSIS.length) return text.slice(0, Math.max(0, limit));
  const available = limit - ELLIPSIS.length;
  const headLength = Math.ceil(available / 2);
  const tailLength = available - headLength;
  return `${text.slice(0, headLength)}${ELLIPSIS}${text.slice(-tailLength)}`;
}

// src/normalizers/range-clamper.ts
import { isAbsolute, resolve } from "node:path";
function normalizeEditorArguments(toolName, rawArgs, cwd = process.cwd(), maxLines) {
  if (!rawArgs || typeof rawArgs !== "object") {
    return {};
  }
  const args = { ...rawArgs };
  const pathKey = ["path", "file_path", "TargetFile"].find((key) => typeof args[key] === "string");
  if (pathKey && typeof args[pathKey] === "string") {
    const rawPath = args[pathKey].trim();
    if (rawPath && !isAbsolute(rawPath)) {
      args[pathKey] = resolve(cwd, rawPath);
    }
  }
  if (Array.isArray(args["view_range"]) && args["view_range"].length === 2) {
    const [start, end] = args["view_range"];
    if (typeof start === "number" && Number.isFinite(start) && typeof end === "number" && Number.isFinite(end)) {
      let validStart = Math.max(1, Math.floor(start));
      const isToEnd = toolName === "str_replace_editor" && end === -1;
      let validEnd = isToEnd ? -1 : Math.max(validStart, Math.floor(end));
      if (maxLines !== void 0 && Number.isSafeInteger(maxLines) && maxLines > 0) {
        validStart = Math.min(validStart, maxLines);
        validEnd = isToEnd ? -1 : Math.min(validEnd, maxLines);
        if (!isToEnd) validEnd = Math.max(validStart, validEnd);
      }
      args["view_range"] = [validStart, validEnd];
    }
  }
  return args;
}

// src/normalizers/run-code.ts
function stripMarkdownFences(code) {
  const trimmed = code.trim();
  const match = /^```(?:[a-zA-Z0-9_-]+)?\r?\n([\s\S]*?)\r?\n```$/.exec(trimmed);
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
- Inside \`run_code\`, include a short \`description\` string for every \`tools.<name>({...})\` call whose tool schema marks that parameter as required; do not add fields that the target schema does not declare.
- Always observe (read) files before editing or replacing text to ensure exact content alignment.
- Always provide absolute paths for file manipulation tools.`;
function registerPromptGuidance(ctx) {
  const systemPrompt = typeof ctx.get === "function" ? ctx.get("systemPrompt") : ctx.systemPrompt;
  if (!systemPrompt || typeof systemPrompt.section !== "function") return;
  const section = {
    name: TOOL_NORMALIZER_PROMPT_SECTION,
    order: 400,
    text: GUIDANCE_TEXT
  };
  if (typeof ctx.effect === "function") {
    ctx.effect(() => systemPrompt.section(section), "tool-normalizer: prompt guidance");
  } else {
    systemPrompt.section(section);
  }
}

// src/stats-log.ts
import { appendFile, mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

// src/tracker.ts
function isDiagnosticRecord(record) {
  return record.status !== "passthrough" || record.wasHealed;
}
var ToolNormalizerTracker = class _ToolNormalizerTracker {
  static instance;
  totalIntercepted = 0;
  healedSuccess = 0;
  healedFailed = 0;
  passThrough = 0;
  passThroughFailed = 0;
  estimatedTokensSaved = 0;
  byTool = /* @__PURE__ */ Object.create(null);
  byCategory = /* @__PURE__ */ Object.create(null);
  records = [];
  /** Dashboard transport window; the JSONL log holds the unbounded history. */
  maxRecords = 1e3;
  retryTokenCost = 0;
  persistPassthrough = false;
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
    } else if (record.status === "failed" && record.wasHealed) {
      this.healedFailed++;
    } else if (record.status === "failed") {
      this.passThroughFailed++;
    } else {
      this.passThrough++;
    }
    this.byTool[record.toolName] = (this.byTool[record.toolName] ?? 0) + 1;
    this.byCategory[record.category] = (this.byCategory[record.category] ?? 0) + 1;
    if (record.status === "success" && record.wasHealed && this.retryTokenCost > 0) {
      this.estimatedTokensSaved += Math.round(this.retryTokenCost);
    }
    if (this.persistPassthrough || isDiagnosticRecord(record)) {
      this.records.unshift(record);
      if (this.records.length > this.maxRecords) {
        this.records.pop();
      }
    }
  }
  /**
   * Select whether successful untouched calls appear in the detailed ring.
   * Aggregate counters are unaffected by this presentation setting.
   * @param enabled - Include successful pass-through calls when true.
   */
  setPersistPassthrough(enabled) {
    this.persistPassthrough = enabled;
    if (!enabled) this.records = this.records.filter(isDiagnosticRecord);
  }
  /**
   * Set the per-healed-call token-cost estimate used by the projection.
   * Non-finite or non-positive values disable the projection.
   */
  setRetryTokenCost(cost) {
    this.retryTokenCost = Number.isFinite(cost) && cost > 0 ? Math.round(cost) : 0;
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
    this.passThroughFailed = stats.passThroughFailed;
    this.estimatedTokensSaved = stats.estimatedTokensSaved;
    this.byTool = Object.assign(/* @__PURE__ */ Object.create(null), stats.byTool);
    this.byCategory = Object.assign(/* @__PURE__ */ Object.create(null), stats.byCategory);
    this.records = [...stats.recentRecords].filter((record) => this.persistPassthrough || isDiagnosticRecord(record)).sort((a, b) => b.time - a.time).slice(0, this.maxRecords);
  }
  /**
   * Retrieve the current aggregate statistics snapshot.
   */
  getSnapshot() {
    const totalHealAttempts = this.healedSuccess + this.healedFailed;
    const healingSuccessRate = totalHealAttempts > 0 ? Math.round(this.healedSuccess / totalHealAttempts * 1e3) / 10 : 0;
    return {
      totalIntercepted: this.totalIntercepted,
      healedSuccess: this.healedSuccess,
      healedFailed: this.healedFailed,
      passThrough: this.passThrough,
      passThroughFailed: this.passThroughFailed,
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
    this.passThroughFailed = 0;
    this.estimatedTokensSaved = 0;
    this.byTool = /* @__PURE__ */ Object.create(null);
    this.byCategory = /* @__PURE__ */ Object.create(null);
    this.records = [];
  }
};

// src/stats-log.ts
var SUMMARY_VERSION = 1;
var SUMMARY_FLUSH_DELAY_MS = 1e3;
function statsLogPath() {
  const home = process.env["DSH_HOME"] ?? join(homedir(), ".dsh");
  return join(home, "tool-normalizer-events.jsonl");
}
function statsSummaryPath() {
  return join(dirname(statsLogPath()), "tool-normalizer-summary.json");
}
var CATEGORIES = /* @__PURE__ */ new Set([
  "INVALID_ARGS",
  "UNKNOWN_TOOL",
  "RANGE_CLAMP",
  "CODE_WRAP",
  "RUN_CODE_DESC",
  "INNER_DESC",
  "FS_OBSERVED",
  "PASSTHROUGH"
]);
var STATUSES = /* @__PURE__ */ new Set(["success", "failed", "passthrough"]);
var retryTokenCost = 0;
var writeQueue = Promise.resolve();
var pendingSummary;
var summaryTimer;
var writeGeneration = 0;
function isTestRun() {
  return process.env["VITEST"] !== void 0 || process.env["NODE_ENV"] === "test";
}
function setRetryTokenCost(cost) {
  retryTokenCost = Number.isFinite(cost) && cost > 0 ? Math.round(cost) : 0;
}
function isRecordObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function finiteNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}
function nonNegativeCount(value) {
  return finiteNumber(value) && Number.isSafeInteger(value) && value >= 0;
}
function validRecord(value) {
  if (!isRecordObject(value)) return false;
  if (typeof value.id !== "string" || value.id.length === 0) return false;
  if (!finiteNumber(value.time)) return false;
  if (typeof value.toolName !== "string" || value.toolName.length === 0) return false;
  if (!CATEGORIES.has(value.category)) return false;
  if (typeof value.wasHealed !== "boolean") return false;
  if (typeof value.originalArgsPreview !== "string") return false;
  if (!STATUSES.has(value.status)) return false;
  if (value.normalizedArgsPreview !== void 0 && typeof value.normalizedArgsPreview !== "string") return false;
  if (value.normalizationSummary !== void 0 && typeof value.normalizationSummary !== "string") return false;
  if (value.errorMessage !== void 0 && typeof value.errorMessage !== "string") return false;
  return true;
}
function safeCountMap(value) {
  if (!isRecordObject(value)) return {};
  const result = /* @__PURE__ */ Object.create(null);
  for (const [key, count] of Object.entries(value)) {
    if (nonNegativeCount(count)) result[key] = count;
  }
  return result;
}
function validAggregate(value) {
  if (!isRecordObject(value) || value.version !== SUMMARY_VERSION) return false;
  return finiteNumber(value.updatedAt) && nonNegativeCount(value.totalIntercepted) && nonNegativeCount(value.healedSuccess) && nonNegativeCount(value.healedFailed) && nonNegativeCount(value.passThrough) && nonNegativeCount(value.passThroughFailed) && nonNegativeCount(value.estimatedTokensSaved) && isRecordObject(value.byTool) && isRecordObject(value.byCategory);
}
function accumulateRecord(totals, byTool, byCategory, record) {
  totals.totalIntercepted++;
  if (record.status === "success" && record.wasHealed) totals.healedSuccess++;
  else if (record.status === "failed" && record.wasHealed) totals.healedFailed++;
  else if (record.status === "failed") totals.passThroughFailed++;
  else totals.passThrough++;
  byTool[record.toolName] = (byTool[record.toolName] ?? 0) + 1;
  byCategory[record.category] = (byCategory[record.category] ?? 0) + 1;
}
function parseEventLog(raw) {
  const records = [];
  for (const line of raw.split("\n")) {
    if (!line.trim()) continue;
    try {
      const parsed = JSON.parse(line);
      if (validRecord(parsed)) records.push(parsed);
    } catch {
    }
  }
  return records;
}
async function readOptional(path) {
  try {
    return await readFile(path, "utf-8");
  } catch {
    return void 0;
  }
}
function aggregateFromRecords(records) {
  const totals = {
    totalIntercepted: 0,
    healedSuccess: 0,
    healedFailed: 0,
    passThrough: 0,
    passThroughFailed: 0
  };
  const byTool = /* @__PURE__ */ Object.create(null);
  const byCategory = /* @__PURE__ */ Object.create(null);
  for (const record of records) accumulateRecord(totals, byTool, byCategory, record);
  return {
    version: SUMMARY_VERSION,
    updatedAt: Date.now(),
    ...totals,
    estimatedTokensSaved: totals.healedSuccess * retryTokenCost,
    byTool,
    byCategory
  };
}
function snapshotAggregate(stats) {
  return {
    version: SUMMARY_VERSION,
    updatedAt: Date.now(),
    totalIntercepted: stats.totalIntercepted,
    healedSuccess: stats.healedSuccess,
    healedFailed: stats.healedFailed,
    passThrough: stats.passThrough,
    passThroughFailed: stats.passThroughFailed,
    estimatedTokensSaved: stats.healedSuccess * retryTokenCost,
    byTool: { ...stats.byTool },
    byCategory: { ...stats.byCategory }
  };
}
function healingRate(stats) {
  const attempts = stats.healedSuccess + stats.healedFailed;
  return attempts > 0 ? Math.round(stats.healedSuccess / attempts * 1e3) / 10 : 0;
}
async function restoreFromLog(tracker) {
  if (isTestRun()) return;
  const [rawEvents, rawSummary] = await Promise.all([
    readOptional(statsLogPath()),
    readOptional(statsSummaryPath())
  ]);
  const records = rawEvents === void 0 ? [] : parseEventLog(rawEvents);
  let aggregate;
  if (rawSummary !== void 0) {
    try {
      const parsed = JSON.parse(rawSummary);
      if (validAggregate(parsed)) aggregate = parsed;
    } catch {
    }
  }
  aggregate ??= aggregateFromRecords(records);
  const recentRecords = records.filter(isDiagnosticRecord).sort((a, b) => b.time - a.time);
  const stats = {
    totalIntercepted: aggregate.totalIntercepted,
    healedSuccess: aggregate.healedSuccess,
    healedFailed: aggregate.healedFailed,
    passThrough: aggregate.passThrough,
    passThroughFailed: aggregate.passThroughFailed,
    estimatedTokensSaved: aggregate.healedSuccess * retryTokenCost,
    healingSuccessRate: healingRate(aggregate),
    byTool: safeCountMap(aggregate.byTool),
    byCategory: safeCountMap(aggregate.byCategory),
    recentRecords
  };
  tracker.restore(stats);
}
function enqueue(task) {
  writeQueue = writeQueue.then(task).catch(() => {
  });
}
async function writeSummary(summary) {
  await mkdir(dirname(statsSummaryPath()), { recursive: true });
  const path = statsSummaryPath();
  const temporaryPath = `${path}.tmp`;
  await writeFile(temporaryPath, JSON.stringify(summary), "utf-8");
  await rename(temporaryPath, path);
}
function flushPendingSummary() {
  if (summaryTimer !== void 0) {
    clearTimeout(summaryTimer);
    summaryTimer = void 0;
  }
  const summary = pendingSummary;
  pendingSummary = void 0;
  if (summary !== void 0) enqueue(() => writeSummary(summary));
}
function scheduleSummary(stats, immediate) {
  pendingSummary = snapshotAggregate(stats);
  if (immediate) {
    flushPendingSummary();
    return;
  }
  if (summaryTimer !== void 0) return;
  const generation = writeGeneration;
  summaryTimer = setTimeout(() => {
    summaryTimer = void 0;
    if (generation === writeGeneration) flushPendingSummary();
  }, SUMMARY_FLUSH_DELAY_MS);
  summaryTimer.unref?.();
}
function appendEvent(record, stats, options = {}) {
  if (isTestRun()) return;
  const detailed = options.persistPassthrough === true || isDiagnosticRecord(record);
  if (detailed) {
    const line = JSON.stringify(record) + "\n";
    enqueue(async () => {
      await mkdir(dirname(statsLogPath()), { recursive: true });
      await appendFile(statsLogPath(), line, "utf-8");
    });
  }
  scheduleSummary(stats, detailed);
}
function persistSnapshot(stats) {
  if (!isTestRun()) scheduleSummary(stats, true);
}
function flushStatsLog() {
  if (!isTestRun()) flushPendingSummary();
  return writeQueue;
}
function clearLog() {
  if (isTestRun()) return Promise.resolve();
  writeGeneration++;
  if (summaryTimer !== void 0) {
    clearTimeout(summaryTimer);
    summaryTimer = void 0;
  }
  pendingSummary = void 0;
  enqueue(async () => {
    await mkdir(dirname(statsLogPath()), { recursive: true });
    await writeFile(statsLogPath(), "", "utf-8");
    try {
      await unlink(statsSummaryPath());
    } catch (error) {
      if (!(error instanceof Error && "code" in error && error.code === "ENOENT")) throw error;
    }
  });
  return writeQueue;
}

// src/index.ts
var name = "tool-normalizer";
var inject = ["tools"];
function objectValue(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? value : void 0;
}
function includesString(value, expected) {
  return Array.isArray(value) && value.some((item) => item === expected);
}
function hasOnlyRunCodeFields(value) {
  return Object.keys(value).every((key) => key === "code" || key === "description");
}
function runCodeArgsMatch(rawArgs, normalized) {
  const rawObject = objectValue(rawArgs);
  if (rawObject === void 0 || !hasOnlyRunCodeFields(rawObject)) return false;
  if (typeof rawObject["code"] !== "string" || typeof rawObject["description"] !== "string") return false;
  return stripMarkdownFences(rawObject["code"]) === normalized.code && rawObject["description"].trim() === normalized.description;
}
function toolRequiresDescription(tools, name2, agent) {
  try {
    const definition = objectValue(tools.get(name2, agent));
    const parameters = objectValue(definition?.["parameters"]);
    if (parameters === void 0) return false;
    if (includesString(parameters["required"], "description")) return true;
    const properties = objectValue(parameters["properties"]);
    if (objectValue(properties?.["description"])?.["required"] === true) return true;
    return objectValue(parameters["description"])?.["required"] === true;
  } catch {
    return false;
  }
}
function errorCode(error) {
  if (typeof error !== "object" || error === null) return void 0;
  const candidate = error;
  if (typeof candidate.code === "string") return candidate.code;
  return typeof candidate.info?.code === "string" ? candidate.info.code : void 0;
}
function errorText(error) {
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error !== null && "message" in error) {
    const message = error.message;
    return typeof message === "string" ? message : void 0;
  }
  return typeof error === "string" ? error : void 0;
}
function resultHasCode(result, code) {
  return result.isError === true && errorCode(result.error) === code;
}
function thrownHasCode(error, code) {
  return errorCode(error) === code || errorText(error)?.includes(code) === true;
}
function resultErrorText(result) {
  return result.isError === true ? errorText(result.error) : void 0;
}
function lineCountFromRangeError(result) {
  const message = resultErrorText(result);
  if (message === void 0 || !message.includes("view_range")) return void 0;
  const match = /(?:range of lines of the file:\s*\[1,\s*|number of lines in the file:\s*`?)(\d+)/u.exec(message);
  const lineCount = match === null ? void 0 : Number(match[1]);
  return lineCount !== void 0 && Number.isSafeInteger(lineCount) && lineCount > 0 ? lineCount : void 0;
}
function sessionCwd(agent) {
  if (typeof agent !== "object" || agent === null) return void 0;
  const session = agent.session;
  if (typeof session !== "object" || session === null) return void 0;
  const header = session.header;
  if (typeof header !== "object" || header === null) return void 0;
  const cwd = header.cwd;
  return typeof cwd === "string" && cwd.trim().length > 0 ? cwd : void 0;
}
function isObservationMutation(name2, args) {
  if (name2 === "edit" || name2 === "write") return true;
  if (name2 !== "str_replace_editor") return false;
  const object = objectValue(args);
  return object?.["command"] === "str_replace" || object?.["command"] === "insert";
}
function editPath(args) {
  const object = objectValue(args);
  if (!object) return void 0;
  const path = object["file_path"] ?? object["path"];
  return typeof path === "string" && path.trim().length > 0 ? path : void 0;
}
var observationRetryCallIds = /* @__PURE__ */ new Set();
var rangeRetryCallIds = /* @__PURE__ */ new Set();
function isObservationRetry(exec) {
  return typeof exec.callId === "string" && observationRetryCallIds.has(exec.callId);
}
function isRangeRetry(exec) {
  return typeof exec.callId === "string" && rangeRetryCallIds.has(exec.callId);
}
async function observeAndRetryMutation(exec, tools) {
  if (!isObservationMutation(exec.name, exec.arguments)) return void 0;
  if (exec.agent === void 0) return void 0;
  const path = editPath(exec.arguments);
  if (path === void 0) return void 0;
  const readName = tools.get("read", exec.agent) !== void 0 ? "read" : exec.name === "str_replace_editor" && tools.get("str_replace_editor", exec.agent) !== void 0 ? "str_replace_editor" : void 0;
  if (readName === void 0) return void 0;
  const readArgs = readName === "read" ? { file_path: path } : { command: "view", path };
  const observed = await executeNestedTool(exec, tools, readName, readArgs, "observe-read");
  if (observed.isError) return void 0;
  const retryId = nestedCallId(exec, "observe-edit");
  observationRetryCallIds.add(retryId);
  try {
    return await executeNestedTool(exec, tools, exec.name, exec.arguments, "observe-edit");
  } finally {
    observationRetryCallIds.delete(retryId);
  }
}
async function clampAndRetryRange(exec, tools, lineCount) {
  if (exec.name !== "str_replace_editor") return void 0;
  const normalized = normalizeEditorArguments(exec.name, exec.arguments, sessionCwd(exec.agent), lineCount);
  if (JSON.stringify(normalized) === JSON.stringify(exec.arguments)) return void 0;
  const retryId = nestedCallId(exec, "range-retry");
  rangeRetryCallIds.add(retryId);
  try {
    return {
      result: await executeNestedTool(exec, tools, exec.name, normalized, "range-retry"),
      args: normalized
    };
  } finally {
    rangeRetryCallIds.delete(retryId);
  }
}
function getToolRuntime(ctx) {
  return typeof ctx.get === "function" ? ctx.get("tools") : ctx.tools;
}
function apply(ctx, userConfig = {}) {
  const config = {
    autoWrapRunCode: userConfig.autoWrapRunCode ?? true,
    autoBridgeDirectTools: userConfig.autoBridgeDirectTools ?? true,
    autoObserveFiles: userConfig.autoObserveFiles ?? true,
    autoClampRanges: userConfig.autoClampRanges ?? true,
    injectPrompt: userConfig.injectPrompt ?? true,
    estimatedRetryTokenCost: userConfig.estimatedRetryTokenCost ?? 8e3,
    persistPassthrough: userConfig.persistPassthrough ?? false
  };
  const tracker = ToolNormalizerTracker.getInstance();
  tracker.setPersistPassthrough(config.persistPassthrough);
  tracker.setRetryTokenCost(config.estimatedRetryTokenCost);
  setRetryTokenCost(config.estimatedRetryTokenCost);
  const restoreReady = restoreFromLog(tracker).catch((error) => {
    ctx.logger?.warn?.(`[tool-normalizer] history restore failed: ${errorText(error) ?? String(error)}`);
  }).then(() => {
    persistSnapshot(tracker.getSnapshot());
  });
  const recordEvent = (record) => {
    tracker.record(record);
    appendEvent(record, tracker.getSnapshot(), { persistPassthrough: config.persistPassthrough });
    ctx.logger?.debug?.(
      `[tool-normalizer] ${record.toolName} category=${record.category} healed=${record.wasHealed} status=${record.status}`
    );
  };
  ctx.logger?.info?.(`[tool-normalizer] active \u2014 intercepting tools/execute; history log: ${statsLogPath()}`);
  let registerAttempts = 0;
  let routeTimer;
  let routesStopped = false;
  if (typeof ctx.effect === "function") {
    ctx.effect(() => () => {
      routesStopped = true;
      if (routeTimer !== void 0) clearTimeout(routeTimer);
      void flushStatsLog();
    }, "tool-normalizer: runtime teardown");
  }
  const tryRegisterStatsRoute = () => {
    if (routesStopped) return;
    const webServer = typeof ctx.get === "function" ? ctx.get("webServer") : ctx.webServer;
    if (!webServer || typeof webServer.register !== "function") {
      if (registerAttempts++ < 60) {
        routeTimer = setTimeout(tryRegisterStatsRoute, 1e3);
        routeTimer.unref?.();
      } else {
        ctx.logger?.warn?.("[tool-normalizer] no webserver appeared within 60s; stats feed disabled");
      }
      return;
    }
    ctx.effect(() => {
      const disposeStats = webServer.register({
        kind: "exact",
        path: "/plugin-api/tool-normalizer/stats",
        handler: (_req, res) => {
          res.writeHead(200, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
          res.end(JSON.stringify(tracker.getSnapshot()));
        }
      });
      const disposeReset = webServer.register({
        kind: "exact",
        path: "/plugin-api/tool-normalizer/reset",
        handler: (req, res) => {
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
        }
      });
      return () => {
        disposeReset?.();
        disposeStats?.();
      };
    }, "tool-normalizer: stats http routes");
    ctx.logger?.info?.("[tool-normalizer] stats feed at GET /plugin-api/tool-normalizer/stats");
  };
  tryRegisterStatsRoute();
  if (config.injectPrompt) {
    registerPromptGuidance(ctx);
  }
  const getTools = () => getToolRuntime(ctx);
  ctx.on("tools/execute", async (exec, next) => {
    await restoreReady;
    const rawArgsStr = JSON.stringify(exec.arguments ?? {}) ?? "{}";
    const startTime = Date.now();
    const eventId = `norm_${startTime}_${Math.random().toString(36).slice(2, 8)}`;
    const tools = getTools();
    let wasHealed = false;
    let healCategory = "PASSTHROUGH";
    let normalizedPreview;
    const changes = [];
    if (exec.name === "run_code" && config.autoWrapRunCode) {
      const originalObj = objectValue(exec.arguments);
      const isCmdPass = originalObj !== void 0 && ("command" in originalObj || "cmd" in originalObj);
      const isMissingDesc = originalObj !== void 0 && (typeof originalObj["description"] !== "string" || originalObj["description"].trim().length === 0);
      const rawCode = typeof originalObj?.["code"] === "string" ? originalObj["code"] : void 0;
      const hasMarkdownFence = rawCode !== void 0 && stripMarkdownFences(rawCode) !== rawCode;
      const normalized = normalizeRunCodeArguments(exec.arguments);
      const normalizedArgs = JSON.stringify(normalized);
      const runCodeChanged = !runCodeArgsMatch(exec.arguments, normalized);
      if (isCmdPass) changes.push("\u5C06 command/cmd \u8F6C\u4E3A run_code.code");
      if (isMissingDesc) changes.push("\u8865\u5168 run_code.description");
      if (hasMarkdownFence) changes.push("\u79FB\u9664 code \u7684 Markdown \u56F4\u680F");
      if (runCodeChanged && changes.length === 0) changes.push("\u89C4\u8303\u5316 run_code \u53C2\u6570");
      if (runCodeChanged) {
        wasHealed = true;
        if (isCmdPass) healCategory = "INVALID_ARGS";
        else if (hasMarkdownFence) healCategory = "CODE_WRAP";
        else if (isMissingDesc) healCategory = "RUN_CODE_DESC";
        else healCategory = "INVALID_ARGS";
        normalizedPreview = compactPreview(normalizedArgs);
      }
      const codeBody = typeof normalized.code === "string" ? normalized.code : void 0;
      if (codeBody !== void 0) {
        const inner = injectInnerDescriptions(
          codeBody,
          String(normalized.description ?? ""),
          (toolName) => tools !== void 0 && toolRequiresDescription(tools, toolName, exec.agent)
        );
        if (inner.injected > 0) {
          normalized.code = inner.code;
          wasHealed = true;
          if (healCategory === "PASSTHROUGH") healCategory = "INNER_DESC";
          changes.push(`\u8865\u5168\u5185\u5C42 description \xD7 ${inner.injected}`);
          normalizedPreview = compactPreview(JSON.stringify(normalized));
        }
      }
      exec.arguments = normalized;
    }
    if ((exec.name === "edit" || exec.name === "str_replace_editor") && config.autoClampRanges) {
      const normalized = normalizeEditorArguments(exec.name, exec.arguments, sessionCwd(exec.agent));
      if (JSON.stringify(normalized) !== rawArgsStr) {
        wasHealed = true;
        healCategory = "RANGE_CLAMP";
        normalizedPreview = compactPreview(JSON.stringify(normalized));
        changes.push("\u6309\u4F1A\u8BDD\u76EE\u5F55\u89C4\u8303\u5316\u7F16\u8F91\u5668\u8DEF\u5F84/\u8303\u56F4");
      }
      exec.arguments = normalized;
    }
    try {
      let result = await next();
      if (config.autoBridgeDirectTools && tools && resultHasCode(result, "UNKNOWN_TOOL") && isBridgeableDirectCall(exec, tools)) {
        result = await executeBridgeDirectCall(exec, tools);
        recordEvent({
          id: eventId,
          time: startTime,
          toolName: exec.name,
          category: "UNKNOWN_TOOL",
          wasHealed: true,
          originalArgsPreview: compactPreview(rawArgsStr),
          normalizedArgsPreview: `Nested dispatch: ${exec.name}`,
          normalizationSummary: `\u901A\u8FC7\u5BBF\u4E3B\u5D4C\u5957\u6D3E\u53D1\u6062\u590D ${exec.name}\uFF0C\u4FDD\u7559 agent\u3001\u4F1A\u8BDD\u548C\u53D6\u6D88\u4E0A\u4E0B\u6587`,
          status: result.isError ? "failed" : "success",
          errorMessage: resultErrorText(result)
        });
        return result;
      }
      if (config.autoObserveFiles && !isObservationRetry(exec) && tools && resultHasCode(result, "FS_NOT_OBSERVED")) {
        const retried = await observeAndRetryMutation(exec, tools);
        if (retried !== void 0) {
          wasHealed = true;
          healCategory = "FS_OBSERVED";
          normalizedPreview = `Read ${editPath(exec.arguments) ?? "file"} then retry`;
          changes.push("\u8BFB\u53D6\u76EE\u6807\u6587\u4EF6\u540E\u91CD\u8BD5\u4FEE\u6539");
          result = retried;
        }
      }
      if (config.autoClampRanges && !isRangeRetry(exec) && tools && result.isError === true) {
        const lineCount = lineCountFromRangeError(result);
        if (lineCount !== void 0) {
          const retried = await clampAndRetryRange(exec, tools, lineCount);
          if (retried !== void 0) {
            wasHealed = true;
            healCategory = "RANGE_CLAMP";
            normalizedPreview = compactPreview(JSON.stringify(retried.args));
            changes.push(`\u6309\u6587\u4EF6\u771F\u5B9E\u884C\u6570\u4FEE\u6B63 view_range\uFF08${lineCount} \u884C\uFF09`);
            result = retried.result;
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
        normalizationSummary: changes.length > 0 ? changes.join("\uFF1B") : void 0,
        status: result.isError ? "failed" : wasHealed ? "success" : "passthrough",
        errorMessage: resultErrorText(result)
      });
      return result;
    } catch (error) {
      const currentTools = getTools();
      if (config.autoBridgeDirectTools && currentTools && thrownHasCode(error, "UNKNOWN_TOOL") && isBridgeableDirectCall(exec, currentTools)) {
        const bridgedResult = await executeBridgeDirectCall(exec, currentTools);
        recordEvent({
          id: eventId,
          time: startTime,
          toolName: exec.name,
          category: "UNKNOWN_TOOL",
          wasHealed: true,
          originalArgsPreview: compactPreview(rawArgsStr),
          normalizedArgsPreview: `Nested dispatch: ${exec.name}`,
          normalizationSummary: `\u901A\u8FC7\u5BBF\u4E3B\u5D4C\u5957\u6D3E\u53D1\u6062\u590D ${exec.name}\uFF0C\u4FDD\u7559 agent\u3001\u4F1A\u8BDD\u548C\u53D6\u6D88\u4E0A\u4E0B\u6587`,
          status: bridgedResult.isError ? "failed" : "success",
          errorMessage: resultErrorText(bridgedResult)
        });
        return bridgedResult;
      }
      recordEvent({
        id: eventId,
        time: startTime,
        toolName: exec.name,
        category: healCategory,
        wasHealed,
        originalArgsPreview: compactPreview(rawArgsStr),
        normalizedArgsPreview: normalizedPreview,
        normalizationSummary: changes.length > 0 ? changes.join("\uFF1B") : void 0,
        status: "failed",
        errorMessage: errorText(error) ?? String(error)
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
  isDiagnosticRecord,
  name,
  normalizeEditorArguments,
  normalizeRunCodeArguments,
  registerPromptGuidance,
  stripMarkdownFences
};
