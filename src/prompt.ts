/**
 * System prompt contribution for tool call invariants and best practices.
 *
 * Two contributions are registered:
 *   1. Guidance text  (section, order 400) — mutable via dashboard, KV-cache-stable within session
 *   2. Top errors      (runtime context) — snapshotted once at session start, never changes mid-session
 *
 * Guidance is instructional system text. Top errors are observational
 * diagnostics, so they ride the cache-safe dynamic-context channel (a
 * durable user-role snapshot logged only when changed) instead of the
 * system prefix. Both use function-backed `text` so every prompt assemble
 * reads the latest value, but because the underlying data only changes on
 * explicit user action (guidance edit) or session boundary (top-errors
 * snapshot), the rendered text is stable across consecutive model requests
 * — preserving the LLM's KV prefix cache.
 *
 * The central section/context order tables are closed to third-party names
 * (an unknown name resolves to `undefined` and fails registration), so both
 * orders below are literals in documented gaps: guidance sits between the
 * deployment prefix (0) and plan policy (500); top errors sits above the
 * central context allocations (110/115/120).
 *
 * @module dsh-tool-normalizer/prompt
 */

export const TOOL_NORMALIZER_PROMPT_SECTION = 'tool-normalizer:guidance'
export const TOOL_NORMALIZER_TOP_ERRORS_SECTION = 'tool-normalizer:top-errors'

export const DEFAULT_GUIDANCE_HEADING = '## Tool Call Reliability & Best Practices'

/**
 * Factory default guidance text users can restore at any time.
 */
export const DEFAULT_GUIDANCE_TEXT = `${DEFAULT_GUIDANCE_HEADING}
- In Code-Mode (when \`run_code\` is provided), write complete executable JavaScript to dispatch tools sequentially via \`await tools.<name>(args)\`. Avoid raw string escaping pitfalls for complex shell scripts by using variables or script files.
- Inside \`run_code\`, write JavaScript only: never paste Python (\`def\`, \`print\`, \`'''\` strings) as program source, and escape backticks inside template literals or write the script to a file instead.
- Inside \`run_code\`, include a short \`description\` string for every \`tools.<name>({...})\` call whose tool schema marks that parameter as required; do not add fields that the target schema does not declare.
- Always observe (read) files before editing or replacing text to ensure exact content alignment.
- Always provide absolute paths for file manipulation tools.`

/** Runtime mutable holder of the current guidance text. */
let currentGuidanceText = DEFAULT_GUIDANCE_TEXT

/** Top-errors snapshot: captured once at session start, never changes mid-session. */
let currentTopErrorsText = ''

/**
 * Return the latest guidance text. Called on every prompt assemble.
 * KV-cache-stable: only changes on explicit user edit.
 */
export function getGuidanceText(): string {
  return currentGuidanceText
}

/**
 * Replace the runtime guidance text. Returns the old text.
 */
export function setGuidanceText(text: string): string {
  const prev = currentGuidanceText
  currentGuidanceText = text.trim().length > 0 ? text : DEFAULT_GUIDANCE_TEXT
  return prev
}

/** Restore the factory default guidance text. */
export function resetGuidanceText(): void {
  currentGuidanceText = DEFAULT_GUIDANCE_TEXT
}

/** Return the top-errors snapshot (empty string when no frequent errors). */
export function getTopErrorsText(): string {
  return currentTopErrorsText
}

/**
 * Refresh the top-errors snapshot from the tracker. Called at session start
 * and optionally on explicit user request. Never called mid-turn.
 * @param tracker - Aggregate source exposing the counter snapshot.
 */
export function refreshTopErrors(tracker: {
  getAggregate(): {
    byTool: Record<string, number>;
    byCategory: Record<string, number>;
    passThroughFailed: number;
    totalIntercepted: number;
  }
}): void {
  const stats = tracker.getAggregate()
  if (stats.totalIntercepted === 0) {
    currentTopErrorsText = ''
    return
  }
  // Collect high-frequency tool failures (tools with >1 recorded failure)
  const toolFailures: string[] = Object.entries(stats.byCategory)
    .filter(([cat]) => cat !== 'PASSTHROUGH' && cat !== 'READ_ARGS')
    .map(([cat, count]) => ({ cat, count }))
    .filter(e => e.count >= 2)
    .sort((a, b) => b.count - a.count)
    .slice(0, 3)
    .map(e => `  - ${e.cat}: ${e.count} occurrences`)

  const toolCallErrors: string[] = Object.entries(stats.byTool)
    .filter(([tool]) => tool !== 'run_code')
    .map(([tool, count]) => ({ tool, count }))
    .filter(e => e.count >= 2)
    .sort((a, b) => b.count - a.count)
    .slice(0, 3)
    .map(e => `  - ${e.tool}: ${e.count} failed calls`)

  const parts: string[] = []
  if (toolCallErrors.length > 0) {
    parts.push('High-frequency tool failures in this session:')
    parts.push(...toolCallErrors)
  }
  if (toolFailures.length > 0) {
    parts.push('High-frequency error categories:')
    parts.push(...toolFailures)
  }
  if (stats.passThroughFailed > 0) {
    parts.push(`Unrecovered errors: ${stats.passThroughFailed}`)
  }
  currentTopErrorsText = parts.length > 0 ? parts.join('\
') : ''
}

/**
 * Register guidance as a prompt section and top errors as runtime context.
 * Hosts predating `systemPrompt.context` keep the previous section slot, so
 * one registration path covers every host version. Both use function-backed
 * `text` for runtime mutability, but their underlying data only changes on
 * explicit user action or session boundary, preserving KV cache stability.
 * @param ctx - Cordis Context.
 */
export function registerPromptGuidance(ctx: any): void {
  const systemPrompt = typeof ctx.get === 'function' ? ctx.get('systemPrompt') : ctx.systemPrompt
  if (!systemPrompt || typeof systemPrompt.section !== 'function') return

  // Top-errors diagnostics: runtime context when available (order 130 sits
  // above the central 110/115/120 allocations), section fallback otherwise.
  const topErrorsText = () => getTopErrorsText()
  if (typeof ctx.effect === 'function') {
    if (typeof systemPrompt.context === 'function') {
      ctx.effect(() => systemPrompt.context({
        name: TOOL_NORMALIZER_TOP_ERRORS_SECTION,
        order: 130,
        text: topErrorsText,
      }), 'tool-normalizer: top-errors')
    } else {
      ctx.effect(() => systemPrompt.section({
        name: TOOL_NORMALIZER_TOP_ERRORS_SECTION,
        order: 395,
        text: topErrorsText,
      }), 'tool-normalizer: top-errors')
    }
  } else if (typeof systemPrompt.context === 'function') {
    systemPrompt.context({
      name: TOOL_NORMALIZER_TOP_ERRORS_SECTION,
      order: 130,
      text: topErrorsText,
    })
  }

  // Main guidance section: order 400
  // Changes only on explicit user edit via dashboard
  const section = {
    name: TOOL_NORMALIZER_PROMPT_SECTION,
    order: 400,
    text: () => getGuidanceText(),
  }
  if (typeof ctx.effect === 'function') {
    ctx.effect(() => systemPrompt.section(section), 'tool-normalizer: prompt guidance')
  } else {
    systemPrompt.section(section)
  }
}
