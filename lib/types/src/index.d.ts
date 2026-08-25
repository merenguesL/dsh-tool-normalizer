/**
 * Auto-healing, argument normalization, and Code-Mode direct tool bridging for DeepSeek Harness.
 *
 * @module dsh-tool-normalizer
 */
import type { Context } from '@deepseek-ai/cordis';
import type { Config } from './types.ts';
export * from './types.ts';
export * from './normalizers/run-code.ts';
export * from './normalizers/range-clamper.ts';
export * from './normalizers/direct-bridge.ts';
export * from './prompt.ts';
/** Cordis plugin identifier. */
export declare const name = "tool-normalizer";
/** Injected services. */
export declare const inject: {
    required: string[];
    optional: string[];
};
/**
 * Applies the tool normalizer and auto-healing plugin.
 *
 * @param ctx - Cordis Context.
 * @param userConfig - Plugin configuration.
 */
export declare function apply(ctx: Context, userConfig?: Config): void;
declare const _default: {
    name: string;
    inject: {
        required: string[];
        optional: string[];
    };
    apply: typeof apply;
};
export default _default;
