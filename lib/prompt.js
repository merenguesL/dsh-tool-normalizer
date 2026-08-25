/**
 * System prompt contribution for tool call invariants and best practices.
 *
 * @module dsh-tool-normalizer/prompt
 */

import type { Context } from '@deepseek-ai/cordis'

export const TOOL_NORMALIZER_PROMPT_SECTION = 'tool-normalizer:guidance'

/**
 * Concise, high-value guidance injected into the system prompt to prevent common LLM tool errors.
 */
export const GUIDANCE_TEXT = `## Tool Call Reliability & Best Practices
- In Code-Mode (when \`run_code\` is provided), write complete executable JavaScript to dispatch tools sequentially via \`await tools.<name>(args)\`. Avoid raw string escaping pitfalls for complex shell scripts by using variables or script files.
- Always observe (read) files before editing or replacing text to ensure exact content alignment.
- Always provide absolute paths for file manipulation tools.`

/**
 * Registers the system prompt guidance section.
 * @param ctx - Cordis Context with `systemPrompt` service.
 */
export function registerPromptGuidance(ctx): void {
  if (!ctx.systemPrompt) return

  ctx.systemPrompt.section({
    name: TOOL_NORMALIZER_PROMPT_SECTION,
    order: 400,
    text: GUIDANCE_TEXT,
  })
}
