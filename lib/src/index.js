/**
 * Auto-healing, argument normalization, and Code-Mode direct tool bridging for DeepSeek Harness.
 *
 * @module dsh-tool-normalizer
 */
import { executeBridgeDirectCall, isBridgeableDirectCall } from './normalizers/direct-bridge.ts';
import { normalizeEditorArguments } from './normalizers/range-clamper.ts';
import { normalizeRunCodeArguments } from './normalizers/run-code.ts';
import { registerPromptGuidance } from './prompt.ts';
export * from './types.ts';
export * from './normalizers/run-code.ts';
export * from './normalizers/range-clamper.ts';
export * from './normalizers/direct-bridge.ts';
export * from './prompt.ts';
/** Cordis plugin identifier. */
export const name = 'tool-normalizer';
/** Injected services. */
export const inject = {
    required: ['tools'],
    optional: ['systemPrompt'],
};
/**
 * Applies the tool normalizer and auto-healing plugin.
 *
 * @param ctx - Cordis Context.
 * @param userConfig - Plugin configuration.
 */
export function apply(ctx, userConfig = {}) {
    const config = {
        autoWrapRunCode: userConfig.autoWrapRunCode ?? true,
        autoBridgeDirectTools: userConfig.autoBridgeDirectTools ?? true,
        autoObserveFiles: userConfig.autoObserveFiles ?? true,
        autoClampRanges: userConfig.autoClampRanges ?? true,
        injectPrompt: userConfig.injectPrompt ?? true,
    };
    // Register dynamic prompt guidelines if enabled
    if (config.injectPrompt) {
        registerPromptGuidance(ctx);
    }
    // Intercept and normalize tool dispatches
    ctx.on('tools/execute', async (exec, next) => {
        // 1. Direct tool to Code-Mode bridging when tool is not registered directly
        if (config.autoBridgeDirectTools && isBridgeableDirectCall(exec.name, ctx.tools)) {
            return executeBridgeDirectCall(exec, ctx.tools);
        }
        // 2. Normalize `run_code` arguments (handle command -> code, missing description, etc.)
        if (exec.name === 'run_code' && config.autoWrapRunCode) {
            exec.arguments = normalizeRunCodeArguments(exec.arguments);
        }
        // 3. Normalize editor arguments (relative paths, view ranges)
        if ((exec.name === 'edit' || exec.name === 'str_replace_editor') && config.autoClampRanges) {
            exec.arguments = normalizeEditorArguments(exec.name, exec.arguments);
        }
        // 4. Delegate to the downstream execution pipeline
        try {
            return await next();
        }
        catch (error) {
            // If downstream execution failed due to ToolNotFoundError (UNKNOWN_TOOL),
            // attempt fallback bridging to run_code
            if (config.autoBridgeDirectTools
                && isBridgeableDirectCall(exec.name, ctx.tools)) {
                return executeBridgeDirectCall(exec, ctx.tools);
            }
            throw error;
        }
    });
}
export default { name, inject, apply };
