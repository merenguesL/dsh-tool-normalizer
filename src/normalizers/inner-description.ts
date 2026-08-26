/**
 * Preemptive repair for Code-Mode inner-call schema failures.
 *
 * Sub-dispatches inside run_code validate against the full model-facing
 * tool schema, where description is required; a program whose
 * tools.*() calls omit it fails before any listener can help. This pass
 * runs BEFORE the program executes (same class of transformation as the
 * command-to-code rewrite): it walks tools.<name>({ ... }) options
 * objects and splices a generated description where one is missing.
 *
 * The scanner is a linear state machine tracking string, template, and
 * comment contexts — a tools.*({ shape inside a string literal is data,
 * not a call site, and is never rewritten. Unparseable structure aborts
 * the whole pass and the program runs as authored.
 *
 * @module dsh-tool-normalizer/normalizers/inner-description
 */

/**
 * Skip one string or template literal starting at start (on the opening
 * quote). Template interpolation segments recurse into full code scanning.
 * Returns the index just past the closing quote, or -1 when unterminated.
 */
function skipStringOrTemplate(code: string, start: number): number {
  const quote = code[start]
  let i = start + 1
  while (i < code.length) {
    const ch = code[i]
    if (ch === '\\') { i += 2; continue }
    if (quote !== String.fromCharCode(96)) {
      if (ch === quote) return i + 1
      i++
      continue
    }
    // Backtick template: interpolation segments may contain arbitrary code.
    if (ch === '$' && code[i + 1] === '{') {
      let depth = 1
      i += 2
      while (i < code.length && depth > 0) {
        const c = code[i]
        if (c === '\\') { i += 2; continue }
        if (c === String.fromCharCode(39) || c === String.fromCharCode(34) || c === String.fromCharCode(96)) {
          const end = skipStringOrTemplate(code, i)
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

/** Index of the brace closing the object opened at open, or -1. */
function findObjectEnd(code: string, open: number): number {
  let depth = 0
  let i = open
  while (i < code.length) {
    const ch = code[i]
    if (ch === String.fromCharCode(39) || ch === String.fromCharCode(34) || ch === String.fromCharCode(96)) {
      const end = skipStringOrTemplate(code, i)
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

const CALL_SHAPE = /^tools\.([A-Za-z_$][\w$]*)\s*\(\s*\{/

/**
 * Insert a generated description into every tools.<name>({ ... }) options
 * object whose literal lacks one. String/template/comment contents are
 * never rewritten. Returns the rewritten program and insertion count;
 * injected: 0 means the program needed no change or could not be scanned
 * safely.
 */
export function injectInnerDescriptions(
  code: string,
  outerDescription: string,
): { code: string; injected: number } {
  const out: string[] = []
  let i = 0
  let injected = 0
  while (i < code.length) {
    const ch = code[i]
    // Verbatim copy: strings, templates, and comments are data.
    if (ch === String.fromCharCode(39) || ch === String.fromCharCode(34) || ch === String.fromCharCode(96)) {
      const end = skipStringOrTemplate(code, i)
      if (end < 0) return { code, injected: 0 }
      out.push(code.slice(i, end))
      i = end
      continue
    }
    if (ch === '/' && code[i + 1] === '/') {
      const nl = code.indexOf('\n', i)
      const end = nl === -1 ? code.length : nl
      out.push(code.slice(i, end))
      i = end
      continue
    }
    if (ch === '/' && code[i + 1] === '*') {
      const end = code.indexOf('*/', i + 2)
      if (end < 0) return { code, injected: 0 }
      out.push(code.slice(i, end + 2))
      i = end + 2
      continue
    }
    if (ch === 't' && code.startsWith('tools.', i)) {
      const m = CALL_SHAPE.exec(code.slice(i))
      if (m !== null) {
        const open = i + m[0].length - 1
        const close = findObjectEnd(code, open)
        if (close < 0) return { code, injected: 0 }
        const literal = code.slice(open, close + 1)
        if (/\bdescription\s*:/.test(literal)) {
          out.push(code.slice(i, close + 1))
        } else {
          const base = String(outerDescription || 'inner call') + ' · ' + m[1]
          const label = base.slice(0, 80)
          out.push(code.slice(i, open + 1))
          out.push(' description: ' + JSON.stringify(label) + ',')
          out.push(literal.slice(1))
          injected++
        }
        i = close + 1
        continue
      }
    }
    out.push(ch)
    i++
  }
  return { code: out.join(''), injected }
}
