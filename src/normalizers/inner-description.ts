/**
 * Preemptive repair for Code-Mode inner-call schema failures.
 *
 * Sub-dispatches inside run_code validate against the full model-facing tool
 * schema, where description is required; a program whose tools.*() calls omit
 * it fails before any listener can help. This pass recognizes only literal
 * object arguments and uses a small lexical scanner so strings, templates,
 * comments, regular expressions, nested objects, spreads, and computed keys
 * are not mistaken for missing properties.
 *
 * @module dsh-tool-normalizer/normalizers/inner-description
 */

const BACKTICK = String.fromCharCode(96)
const IDENTIFIER_START = /[A-Za-z_$]/
const IDENTIFIER_PART = /[A-Za-z0-9_$]/

function isIdentifierStart(ch: string | undefined): boolean {
  return ch !== undefined && IDENTIFIER_START.test(ch)
}

function isIdentifierPart(ch: string | undefined): boolean {
  return ch !== undefined && IDENTIFIER_PART.test(ch)
}

function skipLineComment(code: string, start: number): number {
  const newline = code.indexOf('\n', start + 2)
  return newline === -1 ? code.length : newline
}

function skipBlockComment(code: string, start: number): number {
  const end = code.indexOf('*/', start + 2)
  return end === -1 ? -1 : end + 2
}

/** Whether a slash at start is syntactically likely to open a regex literal. */
function isRegexStart(code: string, start: number): boolean {
  let i = start - 1
  while (i >= 0 && /\s/.test(code[i]!)) i--
  if (i < 0) return true
  const previous = code[i]!
  if ('([{,:;=!?&|+-*%^~<>'.includes(previous)) return true
  if (isIdentifierPart(previous)) {
    let wordStart = i
    while (wordStart >= 0 && isIdentifierPart(code[wordStart])) wordStart--
    const word = code.slice(wordStart + 1, i + 1)
    return new Set(['return', 'throw', 'case', 'delete', 'void', 'typeof', 'new', 'in', 'of', 'yield', 'await', 'else', 'do']).has(word)
  }
  return false
}

/** Skip one regular-expression literal, including its flags. */
function skipRegex(code: string, start: number): number {
  let inClass = false
  let i = start + 1
  while (i < code.length) {
    const ch = code[i]
    if (ch === '\\') { i += 2; continue }
    if (ch === '\n' || ch === '\r') return -1
    if (ch === '[') { inClass = true; i++; continue }
    if (ch === ']') { inClass = false; i++; continue }
    if (ch === '/' && !inClass) {
      i++
      while (i < code.length && /[A-Za-z]/.test(code[i]!)) i++
      return i
    }
    i++
  }
  return -1
}

/** Skip one quoted or template string, recursively scanning `${...}` code. */
function skipStringOrTemplate(code: string, start: number): number {
  const quote = code[start]
  let i = start + 1
  while (i < code.length) {
    const ch = code[i]
    if (ch === '\\') { i += 2; continue }
    if (quote !== BACKTICK) {
      if (ch === quote) return i + 1
      i++
      continue
    }
    if (ch === '`') return i + 1
    if (ch === '$' && code[i + 1] === '{') {
      const end = skipTemplateExpression(code, i + 2)
      if (end < 0) return -1
      i = end
      continue
    }
    i++
  }
  return -1
}

/** Skip the expression body of one template interpolation. */
function skipTemplateExpression(code: string, start: number): number {
  let depth = 1
  let i = start
  while (i < code.length) {
    const ch = code[i]
    if (ch === String.fromCharCode(39) || ch === String.fromCharCode(34) || ch === BACKTICK) {
      const end = skipStringOrTemplate(code, i)
      if (end < 0) return -1
      i = end
      continue
    }
    if (ch === '/' && code[i + 1] === '/') { i = skipLineComment(code, i); continue }
    if (ch === '/' && code[i + 1] === '*') {
      i = skipBlockComment(code, i)
      if (i < 0) return -1
      continue
    }
    if (ch === '/' && code[i + 1] !== '/' && code[i + 1] !== '*' && isRegexStart(code, i)) {
      i = skipRegex(code, i)
      if (i < 0) return -1
      continue
    }
    if (ch === '{') depth++
    else if (ch === '}' && --depth === 0) return i + 1
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
    if (ch === String.fromCharCode(39) || ch === String.fromCharCode(34) || ch === BACKTICK) {
      const end = skipStringOrTemplate(code, i)
      if (end < 0) return -1
      i = end
      continue
    }
    if (ch === '/' && code[i + 1] === '/') { i = skipLineComment(code, i); continue }
    if (ch === '/' && code[i + 1] === '*') {
      i = skipBlockComment(code, i)
      if (i < 0) return -1
      continue
    }
    if (ch === '/' && code[i + 1] !== '/' && code[i + 1] !== '*' && isRegexStart(code, i)) {
      i = skipRegex(code, i)
      if (i < 0) return -1
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

function skipWhitespace(code: string, start: number, end: number): number {
  let i = start
  while (i < end && /\s/.test(code[i]!)) i++
  return i
}

function quotedKey(code: string, start: number, end: number): { key: string | undefined; next: number } {
  const next = skipStringOrTemplate(code, start)
  if (next < 0 || next > end) return { key: undefined, next: -1 }
  const raw = code.slice(start, next)
  if (raw[0] === '"') {
    try { return { key: JSON.parse(raw) as string, next } } catch { return { key: undefined, next } }
  }
  // Single-quoted property names are uncommon here; only decode the simple
  // form so an escape cannot make the scanner claim certainty.
  return raw.endsWith("'") && raw.slice(1, -1).includes('\\')
    ? { key: undefined, next }
    : { key: raw.slice(1, -1), next }
}

/**
 * Determine whether an object literal already supplies or may supply
 * `description`. Spreads and computed keys are treated as present/unknown so
 * the normalizer never creates a duplicate property that changes semantics.
 */
function hasDescriptionProperty(code: string, open: number, close: number): boolean {
  let depth = 0
  let expectProperty = true
  let i = open + 1
  while (i < close) {
    const ch = code[i]
    if (ch === String.fromCharCode(39) || ch === String.fromCharCode(34) || ch === BACKTICK) {
      const end = skipStringOrTemplate(code, i)
      if (end < 0 || end > close) return true
      if (depth === 0 && expectProperty) {
        const { key, next } = quotedKey(code, i, close)
        const after = skipWhitespace(code, next, close)
        if (key === 'description') return true
        expectProperty = code[after] === ':' ? false : true
      }
      i = end
      continue
    }
    if (ch === '/' && code[i + 1] === '/') { i = skipLineComment(code, i); continue }
    if (ch === '/' && code[i + 1] === '*') {
      i = skipBlockComment(code, i)
      if (i < 0) return true
      continue
    }
    if (ch === '/' && code[i + 1] !== '/' && code[i + 1] !== '*' && isRegexStart(code, i)) {
      i = skipRegex(code, i)
      if (i < 0) return true
      continue
    }
    if (depth === 0) {
      if (ch === ',') { expectProperty = true; i++; continue }
      if (!expectProperty) {
        if (ch === '{' || ch === '[') depth++
        i++
        continue
      }
      if (code.startsWith('...', i) || ch === '[') return true
      if (isIdentifierStart(ch)) {
        let end = i + 1
        while (end < close && isIdentifierPart(code[end])) end++
        const key = code.slice(i, end)
        const after = skipWhitespace(code, end, close)
        if (key === 'description') return true
        if (code[after] === ':') expectProperty = false
        else if (code[after] === '(') expectProperty = false
        else expectProperty = true
        i = end
        continue
      }
      if (ch === '}') return false
      i++
      continue
    }
    if (ch === '{' || ch === '[') depth++
    else if (ch === '}' || ch === ']') depth--
    i++
  }
  return false
}

const CALL_SHAPE = /^tools\.([A-Za-z_$][\w$]*)\s*\(\s*\{/u

/**
 * Insert a generated description into every tools.<name>({ ... }) options
 * object whose literal lacks one. String/template/comment contents are never
 * rewritten. Returns the rewritten program and insertion count; injected: 0
 * means the program needed no change or could not be scanned safely.
 *
 * @param code - Code-Mode program source.
 * @param outerDescription - Description of the enclosing run_code call.
 * @returns Rewritten source and number of inserted properties.
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
    if (ch === String.fromCharCode(39) || ch === String.fromCharCode(34) || ch === BACKTICK) {
      const end = skipStringOrTemplate(code, i)
      if (end < 0) return { code, injected: 0 }
      out.push(code.slice(i, end))
      i = end
      continue
    }
    if (ch === '/' && code[i + 1] === '/') { const end = skipLineComment(code, i); out.push(code.slice(i, end)); i = end; continue }
    if (ch === '/' && code[i + 1] === '*') {
      const end = skipBlockComment(code, i)
      if (end < 0) return { code, injected: 0 }
      out.push(code.slice(i, end))
      i = end
      continue
    }
    if (ch === '/' && code[i + 1] !== '/' && code[i + 1] !== '*' && isRegexStart(code, i)) {
      const end = skipRegex(code, i)
      if (end < 0) return { code, injected: 0 }
      out.push(code.slice(i, end))
      i = end
      continue
    }
    if (ch === 't' && code.startsWith('tools.', i)) {
      const match = CALL_SHAPE.exec(code.slice(i))
      if (match !== null) {
        const open = i + match[0].length - 1
        const close = findObjectEnd(code, open)
        if (close < 0) return { code, injected: 0 }
        if (hasDescriptionProperty(code, open, close)) {
          out.push(code.slice(i, close + 1))
        } else {
          const base = String(outerDescription || 'inner call') + ' · ' + match[1]
          const label = base.slice(0, 80)
          out.push(code.slice(i, open + 1))
          out.push(' description: ' + JSON.stringify(label) + ',')
          out.push(code.slice(open + 1, close + 1))
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
