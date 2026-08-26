import { describe, expect, it } from 'vitest'
import { injectInnerDescriptions } from '../src/normalizers/inner-description.ts'

describe('injectInnerDescriptions', () => {
  it('injects description into a bare inner bash call', () => {
    const code = 'const r = await tools.bash({ command: "ls" })'
    const res = injectInnerDescriptions(code, 'List files')
    expect(res.injected).toBe(1)
    expect(res.code).toBe('const r = await tools.bash({ description: "List files · bash", command: "ls" })')
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
    ].join('\n')
    const res = injectInnerDescriptions(code, 'Inspect repo')
    expect(res.injected).toBe(2)
    expect((res.code.match(/description:/g) ?? []).length).toBe(2)
  })

  it("bails out conservatively on unterminated strings", () => {
    const broken = 'await tools.bash({ command: "unterminated })'
    const res = injectInnerDescriptions(broken, 'x')
    expect(res.injected).toBe(0)
  })

  it('does not rewrite tool calls inside string literals', () => {
    const code = [
      'const s = "tools.read({ x: 1 })";',
      'const r = await tools.bash({ command: "ls" });',
    ].join('\n')
    const res = injectInnerDescriptions(code, 'Mixed')
    expect(res.injected).toBe(1)
    expect(res.code).toContain('"tools.read({ x: 1 })"')
    expect(res.code).toContain('description: "Mixed · bash"')
  })

  it('regression: Chinese paths stay valid', () => {
    const code = [
      'const p = "/docs/中长期电价预测实施方案.md";',
      'const r = await tools.read({ file_path: p });',
      'return r.lines',
    ].join('\n')
    const res = injectInnerDescriptions(code, 'Read implementation doc')
    expect(res.injected).toBe(1)
  })
})
