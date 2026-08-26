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

  it('preserves str_replace_editor end-of-file sentinel and clamps known bounds', () => {
    const args = {
      path: 'file.txt',
      view_range: [0, -1],
    }
    const normalized = normalizeEditorArguments('str_replace_editor', args, '/workspace', 12)
    expect(normalized['path']).toBe('/workspace/file.txt')
    expect(normalized['view_range']).toEqual([1, -1])
  })

  it('leaves non-finite ranges untouched instead of serializing them as null', () => {
    const args = { path: '/tmp/file.txt', view_range: [Number.NaN, 2] }
    const normalized = normalizeEditorArguments('edit', args)
    expect(Number.isNaN((normalized['view_range'] as number[])[0])).toBe(true)
  })

  it('uses the first usable path field rather than a non-string alias', () => {
    const normalized = normalizeEditorArguments('edit', { path: null, file_path: 'file.txt' }, '/workspace')
    expect(normalized['file_path']).toBe('/workspace/file.txt')
  })
})
