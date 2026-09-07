import { describe, expect, it } from 'vitest'
import { ELLIPSIS_MARKER, prettyPrintJson } from '../src/client/json-format.ts'

describe('prettyPrintJson', () => {
  it('expands valid JSON one token per line', () => {
    expect(prettyPrintJson('{"a":1,"b":[true,null]}')).toBe(
      '{\n  "a": 1,\n  "b": [\n    true,\n    null\n  ]\n}',
    )
  })

  it('keeps empty pairs together', () => {
    expect(prettyPrintJson('{"a":{},"b":[]}')).toBe('{\n  "a": {},\n  "b": []\n}')
  })

  it('ignores structural characters inside strings', () => {
    expect(prettyPrintJson('{"q":"a:b, c{d}"}')).toBe('{\n  "q": "a:b, c{d}"\n}')
  })

  it('formats truncated previews without requiring validity', () => {
    const out = prettyPrintJson(`{"file_path": "a.py"${ELLIPSIS_MARKER}"x": 1}`)
    expect(out).toContain('{\n  "file_path": "a.py"')
    expect(out).toContain(ELLIPSIS_MARKER.trim())
    expect(out).toContain('"x": 1')
  })

  it('leaves plain text unchanged', () => {
    expect(prettyPrintJson('（正常放行）')).toBe('（正常放行）')
    expect(prettyPrintJson('{}')).toBe('{}')
  })
})
