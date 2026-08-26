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
- Inside \`run_code\`, EVERY \`tools.<name>({...})\` call MUST include a short \`description\` string property alongside its other arguments — sub-calls are validated against the full schema and fail without it.
- Always observe (read) files before editing or replacing text to ensure exact content alignment.
- Always provide absolute paths for file manipulation tools.`

/**
 * Registers the system prompt guidance section safely using `ctx.get('systemPrompt')`.
 * @param ctx - Cordis Context.
 */
export function registerPromptGuidance(ctx: any): void {
  const systemPrompt = typeof ctx.get === 'function' ? ctx.get('systemPrompt') : ctx.systemPrompt
  if (!systemPrompt || typeof systemPrompt.section !== 'function') return

  const section = {
    name: TOOL_NORMALIZER_PROMPT_SECTION,
    order: 400,
    text: GUIDANCE_TEXT,
  }
  if (typeof ctx.effect === 'function') {
    ctx.effect(() => systemPrompt.section(section), 'tool-normalizer: prompt guidance')
  } else {
    // Small test/legacy contexts may not expose Cordis effect ownership.
    systemPrompt.section(section)
  }
}
