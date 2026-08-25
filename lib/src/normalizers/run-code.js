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
export function stripMarkdownFences(code) {
    const trimmed = code.trim();
    const match = /^```(?:[a-zA-Z0-9_-]+)?\r?\n([\s\S]*?)\r?\n```$/m.exec(trimmed);
    if (match && match[1]) {
        return match[1].trim();
    }
    return trimmed;
}
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
export function normalizeRunCodeArguments(rawArgs) {
    let argsObj = {};
    if (typeof rawArgs === 'string') {
        const trimmed = rawArgs.trim();
        try {
            const parsed = JSON.parse(trimmed);
            if (parsed && typeof parsed === 'object') {
                argsObj = parsed;
            }
            else {
                argsObj = { code: trimmed };
            }
        }
        catch {
            argsObj = { code: trimmed };
        }
    }
    else if (rawArgs && typeof rawArgs === 'object') {
        argsObj = { ...rawArgs };
    }
    // Case 1: Model passed "command" or "cmd" (treating run_code as bash)
    const rawCommand = argsObj['command'] ?? argsObj['cmd'];
    if (typeof rawCommand === 'string' && (!argsObj['code'] || typeof argsObj['code'] !== 'string')) {
        const cmdStr = rawCommand.trim();
        const description = typeof argsObj['description'] === 'string' && argsObj['description'].trim().length > 0
            ? argsObj['description'].trim()
            : `Execute command: ${cmdStr.slice(0, 50)}`;
        const synthesizedCode = `const result = await tools.bash(${JSON.stringify({ command: cmdStr })});\nreturn result;`;
        return {
            description,
            code: synthesizedCode,
        };
    }
    // Case 2: Extract and clean `code`
    let code = typeof argsObj['code'] === 'string' ? argsObj['code'] : '';
    code = stripMarkdownFences(code);
    // Case 3: Ensure non-empty description
    let description = typeof argsObj['description'] === 'string' ? argsObj['description'].trim() : '';
    if (!description) {
        const firstLine = code.split('\n')[0]?.trim() || '';
        if (firstLine.startsWith('//') || firstLine.startsWith('#') || firstLine.startsWith('/*')) {
            description = firstLine.replace(/^[/#*\s]+/, '').slice(0, 60).trim();
        }
        if (!description) {
            description = 'Execute code script';
        }
    }
    return {
        code,
        description,
    };
}
