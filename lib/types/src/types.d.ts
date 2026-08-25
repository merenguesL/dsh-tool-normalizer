/**
 * Type definitions and configuration schema for dsh-tool-normalizer.
 *
 * @module dsh-tool-normalizer/types
 */
/**
 * Configuration for the tool normalizer and auto-healing plugin.
 */
export interface Config {
    /**
     * Automatically normalize `run_code` argument schema mismatches
     * (e.g. `command` -> `code`, missing `description`, stripping markdown codeblocks).
     * @default true
     */
    autoWrapRunCode?: boolean;
    /**
     * Automatically bridge direct tool calls (e.g. `bash`, `read`, `write`, `grep`)
     * when the agent is in Code-Mode and those tools are not exposed directly to the model.
     * @default true
     */
    autoBridgeDirectTools?: boolean;
    /**
     * Automatically pre-observe (read) files before `edit` operations if they haven't
     * been read in the current turn, preventing `FS_NOT_OBSERVED` failures.
     * @default true
     */
    autoObserveFiles?: boolean;
    /**
     * Automatically clamp out-of-bounds `view_range` parameters in editor tools.
     * @default true
     */
    autoClampRanges?: boolean;
    /**
     * Inject concise, high-value prompt guidance into `systemPrompt`.
     * @default true
     */
    injectPrompt?: boolean;
}
/**
 * Mutable representation of arguments during normalization.
 */
export type RawArguments = Record<string, unknown>;
