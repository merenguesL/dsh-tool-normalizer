/**
 * Preemptive repair for Code-Mode inner-call schema failures.
 *
 * Sub-dispatches inside `run_code` validate against the full model-facing
 * tool schema, where `description` is required; a program whose
 * `tools.*()` calls omit it fails before any listener can help. This pass
 * runs BEFORE the program executes (same class of transformation as the
 * command-to-code rewrite): it walks `tools.<name>({ ... })` options
 * objects and inserts a generated description where one is missing.
 *
 * The scanner is deliberately conservative — unterminated strings or
 * unmatched braces abort the whole pass and the program runs as authored.
 *
 * @module dsh-tool-normalizer/normalizers/inner-description
 */

/** Skip one string literal; i sits on the opening quote. Returns end+1, or -1 when unterminated. */
function skipString(code: string, start: number): number {
  const quote = code[start]
  let i = start + 1
  while (i < code.length) {
    const ch = code[i]
    if (ch === '\\') { i += 2; continue }
    if (quote === '`' && ch === '$' && code[i + 1] === '{') {
      let depth = 1
      i += 2
      while (i < code.length && depth > 0) {
        const c = code[i]
        if (c === '\\') { i += 2; continue }
        if (c === "'" || c === '"' || c === '`') {
          const end = skipString(code, i)
          if (end < 0) return -1
          i = end
          continue
        }
        if (c === '{') depth++
        else if (c === '}') depth--
        i++
      }
      if (depth !== 0) return -1
      continue
    }
    if (ch === quote) return i + 1
    i++
  }
  return -1
}

/** Index of the brace closing the object opened at objStart, or -1. */
function findObjectEnd(code: string, objStart: number): number {
  let depth = 0
  let i = objStart
  while (i < code.length) {
    const ch = code[i]
    if (ch === "'" || ch === '"' || ch === '`') {
      const end = skipString(code, i)
      if (end < 0) return -1
      i = end
      continue
    }
    if (ch === '{') depth++
    else if (ch === '}') {
      depth--
      if (depth === 0) return i
    }
    i++
  }
  return -1
}

const TOOLS_CALL = /tools\.([A-Za-z_$][\w$]*)\s*\(\s*\{/g

/**
 * Insert a generated description into every tools.name({ ... }) options
 * object missing one.
 */
export function injectInnerDescriptions(
  code: string,
  outerDescription: string,
): { code: string; injected: number } {
  const out: string[] = []
  let cursor = 0
  let injected = 0
  TOOLS_CALL.lastIndex = 0
  for (let m = TOOLS_CALL.exec(code); m !== null; m = TOOLS_CALL.exec(code)) {
    const objStart = m.index + m[0].length - 1
    const objEnd = findObjectEnd(code, objStart)
    if (objEnd < 0) break
    const literal = code.slice(objStart, objEnd + 1)
    out.push(code.slice(cursor, objStart))
    if (/\bdescription\s*:/.test(literal)) {
      out.push(literal)
    } else {
      const label = `${outerDescription || 'inner call'} · ${m[1]}`.slice(0, 80)
      out.push(` description: ${JSON.stringify(label)},`)
      injected++
      out.push(literal)
    }
    cursor = objEnd + 1
    TOOLS_CALL.lastIndex = cursor
  }
  out.push(code.slice(cursor))
  return { code: out.join(''), injected }
}