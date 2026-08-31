/**
 * Syntax-level repair for `run_code` program bodies.
 *
 * The host executes the program as the body of an async function, so a
 * program that does not parse fails before any inner call can run — and the
 * dominant model-side failure classes are mechanical, not semantic:
 * truncated tails (the emitted `code` ends inside an unterminated string or
 * an unclosed call), Python-style triple-quoted strings written into
 * TypeScript programs, and unescaped backticks inside template literals.
 * Every repair below applies only to code that fails to parse and must yield
 * a parseable program, so valid code is never touched and a repair that
 * guesses wrong is rejected by re-parsing.
 *
 * @module dsh-tool-normalizer/normalizers/run-code-syntax
 */

const BACKTICK = String.fromCharCode(96);

/**
 * Whether the program parses exactly as the host will evaluate it: the body
 * of an async function prefixed with the host's strict-mode directive. The
 * parse is synchronous and never executes the body.
 * @param code - Code-Mode program source.
 * @returns True when `new AsyncFunction` accepts the program.
 */
export function parseProgram(code: string): boolean {
  try {
    // Reached through an instance because `AsyncFunction` is not a global,
    // mirroring the host worker's bootstrap.
    const AsyncFunction = (async () => {}).constructor as new (
      ...args: string[]
    ) => Function;
    new AsyncFunction(`'use strict';\n${code}`);
    return true;
  } catch {
    return false;
  }
}

/** One lexical scan boundary: end offset of the construct, or unterminated. */
type Scan =
  | { end: number }
  | { unterminated: "string" | "template" | "regex" | "comment" };

function skipLineComment(code: string, start: number): number {
  const newline = code.indexOf("\n", start + 2);
  return newline === -1 ? code.length : newline;
}

function skipBlockComment(code: string, start: number): number {
  const end = code.indexOf("*/", start + 2);
  return end === -1 ? -1 : end + 2;
}

/** Whether a slash at start is syntactically likely to open a regex literal. */
function isRegexStart(code: string, start: number): boolean {
  let i = start - 1;
  while (i >= 0 && /\s/.test(code[i]!)) i--;
  if (i < 0) return true;
  const previous = code[i]!;
  if ("([{,:;=!?&|+-*%^~<>".includes(previous)) return true;
  if (/[A-Za-z0-9_$]/.test(previous)) {
    let wordStart = i;
    while (wordStart >= 0 && /[A-Za-z0-9_$]/.test(code[wordStart]!))
      wordStart--;
    const word = code.slice(wordStart + 1, i + 1);
    return new Set([
      "return",
      "throw",
      "case",
      "delete",
      "void",
      "typeof",
      "new",
      "in",
      "of",
      "yield",
      "await",
      "else",
      "do",
    ]).has(word);
  }
  return false;
}

function skipRegex(code: string, start: number): Scan {
  let inClass = false;
  let i = start + 1;
  while (i < code.length) {
    const ch = code[i];
    if (ch === "\\") {
      i += 2;
      continue;
    }
    if (ch === "\n" || ch === "\r") return { unterminated: "regex" };
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
      while (i < code.length && /[A-Za-z]/.test(code[i]!)) i++;
      return { end: i };
    }
    i++;
  }
  return { unterminated: "regex" };
}

/** Skip one quoted or template string, recursively walking `${...}` code. */
function skipStringOrTemplate(code: string, start: number): Scan {
  const quote = code[start];
  let i = start + 1;
  while (i < code.length) {
    const ch = code[i];
    if (ch === "\\") {
      i += 2;
      continue;
    }
    if (quote !== BACKTICK) {
      if (ch === quote) return { end: i + 1 };
      i++;
      continue;
    }
    if (ch === "`") return { end: i + 1 };
    if (ch === "$" && code[i + 1] === "{") {
      const end = skipTemplateExpression(code, i + 2);
      if (end < 0) return { unterminated: "template" };
      i = end;
      continue;
    }
    i++;
  }
  return { unterminated: quote === BACKTICK ? "template" : "string" };
}

/** Skip the expression body of one template interpolation; -1 when unterminated. */
function skipTemplateExpression(code: string, start: number): number {
  let depth = 1;
  let i = start;
  while (i < code.length) {
    const ch = code[i];
    if (
      ch === String.fromCharCode(39) ||
      ch === String.fromCharCode(34) ||
      ch === BACKTICK
    ) {
      const end = skipStringOrTemplate(code, i);
      if (!("end" in end)) return -1;
      i = end.end;
      continue;
    }
    if (ch === "/" && code[i + 1] === "/") {
      i = skipLineComment(code, i);
      continue;
    }
    if (ch === "/" && code[i + 1] === "*") {
      const end = skipBlockComment(code, i);
      if (end < 0) return -1;
      i = end;
      continue;
    }
    if (
      ch === "/" &&
      code[i + 1] !== "/" &&
      code[i + 1] !== "*" &&
      isRegexStart(code, i)
    ) {
      const end = skipRegex(code, i);
      if (!("end" in end)) return -1;
      i = end.end;
      continue;
    }
    if (ch === "{") depth++;
    else if (ch === "}" && --depth === 0) return i + 1;
    i++;
  }
  return -1;
}

/**
 * Walk the program outside strings, templates, comments, and regex literals.
 * The callback sees every structural character; returning a stop offset
 * aborts the walk there. undefined means the walk hit an unterminated
 * construct it cannot trust.
 */
function walkStructure(
  code: string,
  at: (char: string, index: number) => number | undefined,
): { stoppedAt: number } | undefined {
  let i = 0;
  while (i < code.length) {
    const ch = code[i];
    if (
      ch === String.fromCharCode(39) ||
      ch === String.fromCharCode(34) ||
      ch === BACKTICK
    ) {
      const end = skipStringOrTemplate(code, i);
      if (!("end" in end)) {
        // An unterminated string/template is itself a repair candidate, not
        // a reason to distrust the walk: report the position and let the
        // callback decide.
        const stopped = at("\0", i);
        return { stoppedAt: stopped ?? i };
      }
      i = end.end;
      continue;
    }
    if (ch === "/" && code[i + 1] === "/") {
      i = skipLineComment(code, i);
      continue;
    }
    if (ch === "/" && code[i + 1] === "*") {
      const end = skipBlockComment(code, i);
      if (end < 0) return undefined;
      i = end;
      continue;
    }
    if (
      ch === "/" &&
      code[i + 1] !== "/" &&
      code[i + 1] !== "*" &&
      isRegexStart(code, i)
    ) {
      const end = skipRegex(code, i);
      if (!("end" in end)) return undefined;
      i = end.end;
      continue;
    }
    const stopped = at(ch, i);
    if (stopped !== undefined) return { stoppedAt: stopped };
    i++;
  }
  return { stoppedAt: code.length };
}

const OPEN_CLOSERS: Record<string, string> = {
  "(": ")",
  "{": "}",
  "[": "]",
  '"': '"',
  "'": "'",
  "`": "`",
};

/**
 * Closing delimiters the program tail still needs: the chain of unclosed
 * brackets, or undefined when the tail is not a simple truncation (an
 * unbalanced closer, or an unterminated construct in the middle). Only open
 * brackets are balanced here; an unterminated trailing quote/template is the
 * caller's first repair step.
 * @param code - Program source that failed to parse.
 * @returns The closers to append, or undefined when closing cannot be trusted.
 */
export function missingTailClosers(code: string): string | undefined {
  const stack: string[] = [];
  let stoppedAt = -1;
  let unterminatedNode = false;
  const walk = walkStructure(code, (ch, index) => {
    if (ch === "(" || ch === "{" || ch === "[") {
      stack.push(ch);
      return undefined;
    }
    if (ch === ")" || ch === "}" || ch === "]") {
      const open = stack.pop();
      if (open === undefined || OPEN_CLOSERS[open] !== ch) {
        stoppedAt = index;
        return index;
      }
      return undefined;
    }
    if (ch === "\0") {
      // An unterminated string/template: if the stack is non-empty the tail
      // is a plain cut and the quote is closed by the caller; otherwise the
      // corruption is elsewhere.
      unterminatedNode = true;
      return undefined;
    }
    return undefined;
  });
  if (walk === undefined || stoppedAt >= 0) return undefined;
  if (stack.length === 0) return undefined;
  if (unterminatedNode && stack.length === 1) return undefined;
  // Close the bracket chain top-down; a trailing quote/template is handled
  // by the caller before the chain is balanced.
  const closers: string[] = [];
  for (let i = stack.length - 1; i >= 0; i--)
    closers.push(OPEN_CLOSERS[stack[i]]!);
  return closers.join("");
}

/** Number of unescaped occurrences of the quote at `start` from `start` to EOF. */
function countQuotesFrom(code: string, start: number): number {
  const quote = code[start]!;
  let count = 0;
  for (let i = start; i < code.length; i++) {
    if (code[i] !== quote) continue;
    let backslashes = 0;
    for (let j = i - 1; j >= 0 && code[j] === "\\"; j--) backslashes++;
    if (backslashes % 2 === 0) count++;
  }
  return count;
}

/**
 * Simple tail-truncation repair: append the character that closes the final
 * unterminated construct (quotes and backticks first, then the bracket
 * chain), accepting only a result that parses.
 * @param code - Program source that failed to parse.
 * @returns The repaired program, or undefined when the tail is not a plain truncation.
 */
export function repairTruncatedTail(code: string): string | undefined {
  const tail = code.replace(/\s+$/u, "");
  // The last quoted construct: if it is unterminated at EOF, the program
  // cannot parse no matter what follows, so closing just it is the fix.
  const lastQuote = Math.max(
    tail.lastIndexOf(String.fromCharCode(34)),
    tail.lastIndexOf(String.fromCharCode(39)),
    tail.lastIndexOf(BACKTICK),
  );
  if (lastQuote < 0) return undefined;
  const scanned = skipStringOrTemplate(tail, lastQuote);
  const isUnterminated = !("end" in scanned);
  // A quote parity check distinguishes a cut inside a literal (odd count of
  // that kind of quote from the tail start) from a lone closing quote.
  if (isUnterminated && countQuotesFrom(tail, lastQuote) % 2 === 1) {
    const closed = tail + tail[lastQuote]!;
    const balanced = missingTailClosers(closed);
    if (balanced === undefined) return undefined;
    const candidate = closed + balanced;
    return parseProgram(candidate) ? candidate : undefined;
  }
  return undefined;
}

/**
 * Rewrite Python-style triple-quoted strings (`'''` / `"""`) that carry a
 * newline inside their span into template literals, escaping the characters
 * that would terminate a template. A triple quote whose span contains a
 * newline can never parse as JavaScript, so this rewrite cannot hit valid
 * code; the result must parse or the repair is abandoned.
 * @param code - Program source that failed to parse.
 * @returns The rewritten program, or undefined when no triple-quoted span is present.
 */
export function rewriteTripleQuotedStrings(code: string): string | undefined {
  const spans: Array<{ start: number; end: number }> = [];
  let i = 0;
  while (i < code.length) {
    const ch = code[i];
    if (ch === String.fromCharCode(39) || ch === String.fromCharCode(34)) {
      const triple = code.slice(i, i + 3);
      if (triple === ch.repeat(3)) {
        // Only a span that contains a newline is a Python-style multiline
        // string; a one-line `'''x'''` can be legitimate `''` + `'x'`.
        const close = code.indexOf(triple, i + 3);
        if (close > 0 && code.slice(i + 3, close).includes("\n")) {
          spans.push({ start: i, end: close + 3 });
          i = close + 3;
          continue;
        }
      }
      const scanned = skipStringOrTemplate(code, i);
      if (!("end" in scanned)) return undefined;
      i = scanned.end;
      continue;
    }
    if (ch === BACKTICK) {
      const scanned = skipStringOrTemplate(code, i);
      if (!("end" in scanned)) return undefined;
      i = scanned.end;
      continue;
    }
    if (ch === "/" && code[i + 1] === "/") {
      i = skipLineComment(code, i);
      continue;
    }
    if (ch === "/" && code[i + 1] === "*") {
      const end = skipBlockComment(code, i);
      if (end < 0) return undefined;
      i = end;
      continue;
    }
    if (
      ch === "/" &&
      code[i + 1] !== "/" &&
      code[i + 1] !== "*" &&
      isRegexStart(code, i)
    ) {
      const scanned = skipRegex(code, i);
      if (!("end" in scanned)) return undefined;
      i = scanned.end;
      continue;
    }
    i++;
  }
  if (spans.length === 0) return undefined;

  let out = "";
  let cursor = 0;
  for (const span of spans) {
    const content = code.slice(span.start + 3, span.end - 3);
    const escaped = content.replace(/`/gu, "\\`").replace(/\$\{/gu, "\\${");
    out += `${code.slice(cursor, span.start)}\`${escaped}\``;
    cursor = span.end;
  }
  out += code.slice(cursor);
  return parseProgram(out) ? out : undefined;
}

/** Whether the backtick at `index` is preceded by an escape (odd backslashes). */
function isEscapedBacktick(code: string, index: number): boolean {
  let backslashes = 0;
  for (let i = index - 1; i >= 0 && code[i] === "\\"; i--) backslashes++;
  return backslashes % 2 === 1;
}

/**
 * Escape stray unescaped backticks inside template literals whose pairing
 * the model broke. Two shapes are repaired, each parse-verified and bounded:
 * one template running to the end of the program (escape every backtick
 * except the first opener and one candidate closer, tried from the tail
 * backwards), then single-escape each backtick for exotic pairings. Backticks
 * the model already escaped (`\``) are collected as content, never re-escaped.
 * @param code - Program source that failed to parse.
 * @returns The repaired program, or undefined without a parsing candidate.
 */
export function escapeStrayTemplateBackticks(code: string): string | undefined {
  // Unescaped backtick positions over the raw source. Nothing is skipped:
  // backticks inside strings, comments, and regex literals tolerate the same
  // `\`` escape without changing meaning (comments ignore it, `\`` == `` ` ``
  // in strings and regexes), and every candidate is re-parsed before
  // acceptance, so an over-broad collection only costs failed candidates.
  // Document-heavy programs embed dozens of intended code spans, so the
  // collection cap bounds the repair's WORK (candidates are tried from the
  // tail), not the count of backticks it may escape.
  const backticks: number[] = [];
  for (let i = 0; i < code.length && backticks.length <= 256; i++) {
    if (code[i] === BACKTICK && !isEscapedBacktick(code, i)) backticks.push(i);
  }
  const opener = backticks[0];
  if (opener === undefined || backticks.length < 3) return undefined;

  // One template running to the tail: keep the first opener and one candidate
  // closer, escape every other backtick. Try the tail-most closers first — a
  // truncated or content-heavy template closes at its last backtick, and a
  // wrong closer that happens to parse is still a parseable program.
  const lastBacktick = backticks[backticks.length - 1]!;
  const closestTail = Math.max(backticks[0]!, lastBacktick - 16);
  for (let n = lastBacktick; n > closestTail; n--) {
    if (!backticks.includes(n)) continue;
    const candidate = escapeBackticksExcept(
      code,
      backticks,
      new Set([opener, n]),
    );
    if (parseProgram(candidate)) return candidate;
  }
  // Exotic pairing: escape one backtick at a time and keep the first winner.
  for (const index of backticks) {
    const candidate = `${code.slice(0, index)}\\${code.slice(index)}`;
    if (parseProgram(candidate)) return candidate;
  }
  return undefined;
}

/** Escape every collected backtick except the kept positions, preserving all other text. */
function escapeBackticksExcept(
  code: string,
  backticks: number[],
  kept: Set<number>,
): string {
  let out = "";
  let cursor = 0;
  for (const index of backticks) {
    if (kept.has(index)) continue;
    // Backslash BEFORE the backtick: inside a template `\`` is a literal
    // backtick, while the escape must never pair with the following char.
    out += `${code.slice(cursor, index)}\\${BACKTICK}`;
    cursor = index + 1;
  }
  out += code.slice(cursor);
  return out;
}

/**
 * Repair a program that does not parse, in a fixed order of mechanical
 * fixes: truncated tail, Python triple-quoted strings, stray template
 * backticks. Each candidate must parse; unparseable candidates are skipped
 * and valid programs are returned untouched.
 * @param code - Program source.
 * @returns The repaired program, or undefined when no repair produced a parseable candidate.
 */
export function repairRunCodeSyntax(code: string): string | undefined {
  if (parseProgram(code)) return undefined;
  const repairers: Array<(source: string) => string | undefined> = [
    repairTruncatedTail,
    rewriteTripleQuotedStrings,
    escapeStrayTemplateBackticks,
  ];
  for (const repairer of repairers) {
    const candidate = repairer(code);
    if (candidate !== undefined && candidate !== code) return candidate;
  }
  return undefined;
}
