import { describe, expect, it } from 'vitest'
import { injectInnerDescriptions } from '../src/normalizers/inner-description.ts'

describe('injectInnerDescriptions', () => {
  it('injects description into a bare inner bash call', () => {
    const code = 'const r = await tools.bash({ command: "ls" })'
    const res = injectInnerDescriptions(code, 'List files')
    expect(res.injected).toBe(1)
    expect(res.code).toContain('description: "List files · bash"')
    expect(res.code).toContain('command: "ls"')
  })

  it('leaves calls that already carry description untouched', () => {
    const code = 'await tools.bash({ command: "ls", description: "mine" })'
    const res = injectInnerDescriptions(code, 'x')
    expect(res.injected).toBe(0)
    expect(res.code).toBe(code)
  })

  it('handles multiple calls and template-literal commands', () => {
    const code = [
      'const a = await tools.bash({ command: `git status` })',
      'const b = await tools.read({ file_path: "/a/b" })',
    ].join("\n")
    const res = injectInnerDescriptions(code, 'Inspect repo')
    expect(res.injected).toBe(2)
    expect((res.code.match(/description:/g) ?? []).length).toBe(2)
  })

  it('bails out conservatively on unterminated strings', () => {
    const broken = 'await tools.bash({ command: "unterminated })'
    const res = injectInnerDescriptions(broken, 'x')
    expect(res.injected).toBe(0)
  })

  it('skips nested tools calls inside an already-scanned object', () => {
    const code = 'await tools.edit({ file_path: "/a", old_string: "x" })'
    const res = injectInnerDescriptions(code, 'edit file')
    expect(res.injected).toBe(1)
    expect((res.code.match(/description:/g) ?? []).length).toBe(1)
  })
})