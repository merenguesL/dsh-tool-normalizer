import { describe, expect, it } from 'vitest'
import { normalizeRunCodeArguments, stripMarkdownFences } from '../src/normalizers/run-code.ts'

describe('run-code normalizer', () => {
  it('strips markdown code fences cleanly', () => {
    const raw = '```typescript\nconst a = 1;\nconsole.log(a);\n```'
    expect(stripMarkdownFences(raw)).toBe('const a = 1;\nconsole.log(a);')
  })

  it('synthesizes bash execution when command property is passed', () => {
    const rawArgs = {
      command: 'git status --short',
    }
    const normalized = normalizeRunCodeArguments(rawArgs)
    expect(normalized.description).toBe('Execute command: git status --short')
    expect(normalized.code).toContain('await tools.bash({"command":"git status --short"})')
  })

  it('synthesizes bash execution when cmd property is passed', () => {
    const rawArgs = {
      cmd: 'ls -la',
      description: 'List all directory items',
    }
    const normalized = normalizeRunCodeArguments(rawArgs)
    expect(normalized.description).toBe('List all directory items')
    expect(normalized.code).toContain('await tools.bash({"command":"ls -la"})')
  })

  it('fills in missing description with sensible fallback', () => {
    const rawArgs = {
      code: '// Read file contents\nconst content = await tools.read({ path: "/tmp/foo" });',
    }
    const normalized = normalizeRunCodeArguments(rawArgs)
    expect(normalized.description).toBe('Read file contents')
    expect(normalized.code).toBe(rawArgs.code)
  })

  it('handles raw JSON string input', () => {
    const jsonStr = JSON.stringify({
      command: 'pwd',
    })
    const normalized = normalizeRunCodeArguments(jsonStr)
    expect(normalized.code).toContain('await tools.bash({"command":"pwd"})')
  })
})
