/**
 * Normalizer and auto-healer for `run_code` tool calls.
 *
 * @module dsh-tool-normalizer/normalizers/run-code
 */
/**
 * Strips markdown code block wrappers (e.g. ```typescript ... ``` or ```js ... ```).
 * @param code - Raw code string potentially containing markdown fences.
 * @returns Cleaned code without surrounding markdown fences.
 */
export declare function stripMarkdownFences(code: string): string;
/**
 * Normalizes arguments for `run_code` calls.
 * Handles common model errors:
 * - Sending `{"command": "..."}` or `{"cmd": "..."}` instead of JS `code`
 * - Missing `description` field
 * - Markdown-fenced code
 * - Raw string arguments
 *
 * @param rawArgs - Raw arguments object or string produced by the model.
 * @returns Validated and normalized `run_code` arguments.
 */
export declare function normalizeRunCodeArguments(rawArgs: unknown): {
    code: string;
    description: string;
};
//# sourceMappingURL=run-code.d.ts.map