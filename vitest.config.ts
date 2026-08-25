import { resolve } from 'node:path'
import { defineConfig } from 'vitest/config'

const monorepoRoot = resolve(import.meta.dirname, '../..')

export default defineConfig({
  test: {
    include: ['tests/**/*.spec.ts'],
    environment: 'node',
  },
  resolve: {
    alias: {
      '@deepseek-ai/cordis': resolve(monorepoRoot, 'vendor/cordis/src'),
      '@deepseek-ai/cosmokit': resolve(monorepoRoot, 'vendor/cosmokit/src'),
      '@deepseek-ai/schemastery': resolve(monorepoRoot, 'vendor/schemastery/src'),
      '@deepseek-ai/dsh-tools': resolve(monorepoRoot, 'packages/core/tools/src'),
      '@deepseek-ai/dsh-system-prompt': resolve(monorepoRoot, 'packages/core/system-prompt/src'),
      '@deepseek-ai/dsh-agent': resolve(monorepoRoot, 'packages/core/agent/src'),
      '@deepseek-ai/dsh-llm': resolve(monorepoRoot, 'packages/llm/llm/src'),
      '@deepseek-ai/dsh-session': resolve(monorepoRoot, 'packages/core/session/src'),
      '@deepseek-ai/dsh-invariants': resolve(monorepoRoot, 'packages/util/invariants/src'),
    },
  },
})
