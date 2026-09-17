import { describe, expect, it } from 'vitest'
// eslint-disable-next-line
// @ts-expect-error - build-time helper is plain ESM JavaScript
import { validateCssModule } from '../scripts/css-guard.mjs'

describe('CSS module guard', () => {
  it('accepts a well-formed stylesheet', () => {
    const css = [
      '.card {',
      '  display: flex;',
      '  gap: 8px;',
      '}',
      '',
      '.card:hover { color: red; }',
      '',
      '@media (max-width: 720px) {',
      '  .card { gap: 4px; }',
      '}',
    ].join('\n')
    expect(() => validateCssModule(css, 'ok.module.css')).not.toThrow()
  })

  it('rejects the unterminated declaration that silently dropped every later rule', () => {
    // Reproduces the v0.5.1 defect: `.ruleTag` ended on a bare `font-weight`,
    // so the browser folded the rest of the file into that one declaration.
    const css = [
      '.ruleTag {',
      '  font-size: 11px;',
      '  font-weight',
      '',
      '.guidanceEditorTextarea {',
      '  width: 100%;',
      '}',
    ].join('\n')
    expect(() => validateCssModule(css, 'broken.module.css')).toThrow(
      /unterminated declaration "font-weight"/,
    )
  })

  it('rejects an unclosed block', () => {
    const css = '.a {\n  color: red;\n'
    expect(() => validateCssModule(css, 'unclosed.module.css')).toThrow(
      /unclosed block/,
    )
  })
  it('rejects a stray closing brace', () => {
    const css = '.a { color: red; }\n}\n'
    expect(() => validateCssModule(css, 'stray.module.css')).toThrow(
      /stray closing brace/,
    )
  })

  it('ignores bare words inside comments', () => {
    const css = [
      '/* a note mentioning',
      '   font-weight on its own line */',
      '.a { color: red; }',
    ].join('\n')
    expect(() => validateCssModule(css, 'comment.module.css')).not.toThrow()
  })
})
