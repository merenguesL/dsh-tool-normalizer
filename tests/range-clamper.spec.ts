import { isAbsolute, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { normalizeEditorArguments } from '../src/normalizers/range-clamper.ts'

describe('range-clamper normalizer', () => {
  it('converts relative file paths to absolute paths', () => {
    const cwd = '/home/mgl/AIRepo/deepseek-harness'
    const args = {
      path: 'src/index.ts',
    }
    const normalized = normalizeEditorArguments('edit', args, cwd)
    expect(normalized['path']).toBe(resolve(cwd, 'src/index.ts'))
    expect(isAbsolute(normalized['path'] as string)).toBe(true)
  })

  it('preserves absolute paths untouched', () => {
    const cwd = '/home/mgl/AIRepo/deepseek-harness'
    const args = {
      path: '/home/mgl/AIRepo/deepseek-harness/src/index.ts',
    }
    const normalized = normalizeEditorArguments('edit', args, cwd)
    expect(normalized['path']).toBe('/home/mgl/AIRepo/deepseek-harness/src/index.ts')
  })

  it('clamps invalid negative or inverted view_range', () => {
    const args = {
      path: '/tmp/test.txt',
      view_range: [-5, 10],
    }
    const normalized = normalizeEditorArguments('str_replace_editor', args)
    expect(normalized['view_range']).toEqual([1, 10])
  })
})
