/**
 * System prompt contribution for tool call invariants and best practices.
 *
 * @module dsh-tool-normalizer/prompt
 */

export const TOOL_NORMALIZER_PROMPT_SECTION = 'tool-normalizer:guidance'

/**
 * Concise, high-value guidance injected into the system prompt to prevent common LLM tool errors.
 */
export const GUIDANCE_TEXT = `## Tool Call Reliability & Best Practices
- In Code-Mode (when \`run_code\` is provided), write complete executable JavaScript to dispatch tools sequentially via \`await tools.<name>(args)\`. Avoid raw string escaping pitfalls for complex shell scripts by using variables or script files.
- Always observe (read) files before editing or replacing text to ensure exact content alignment.
- Always provide absolute paths for file manipulation tools.`

/**
 * Registers the system prompt guidance section safely using `ctx.get('systemPrompt')`.
 * @param ctx - Cordis Context.
 */
export function registerPromptGuidance(ctx: any): void {
  const systemPrompt = typeof ctx.get === 'function' ? ctx.get('systemPrompt') : ctx.systemPrompt
  if (!systemPrompt || typeof systemPrompt.section !== 'function') return

  systemPrompt.section({
    name: TOOL_NORMALIZER_PROMPT_SECTION,
    order: 400,
    text: GUIDANCE_TEXT,
  })
}
