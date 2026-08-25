/**
 * Bridge for direct tool calls made when the agent is in Code-Mode.
 *
 * @module dsh-tool-normalizer/normalizers/direct-bridge
 */
/** Standard capabilities that can be auto-bridged into Code-Mode. */
const BRIDGEABLE_TOOLS = new Set([
    'bash',
    'read',
    'write',
    'grep',
    'edit',
    'glob',
    'str_replace_editor',
    'job_output',
    'job_kill',
]);
/**
 * Checks whether a tool call can be bridged into `run_code`.
 * @param toolName - Name of the requested tool.
 * @param tools - Tool runtime registry.
 * @returns True if tool is bridgeable and `run_code` is available.
 */
export function isBridgeableDirectCall(toolName, tools) {
    // If the tool is already registered directly, no need to bridge
    if (tools.get(toolName) !== undefined) {
        return false;
    }
    // If run_code is registered and this is a standard bridgeable tool
    return BRIDGEABLE_TOOLS.has(toolName) && tools.get('run_code') !== undefined;
}
/**
 * Synthesizes and executes a `run_code` call for a direct tool invocation.
 *
 * @param exec - The direct tool execution.
 * @param tools - Tool runtime registry.
 * @returns The execution result from the synthesized `run_code` call.
 */
export async function executeBridgeDirectCall(exec, tools) {
    const runCodeTool = tools.get('run_code', exec.agent);
    if (!runCodeTool) {
        return {
            content: [{ type: 'text', text: `Error: tool ${JSON.stringify(exec.name)} not found and run_code is unavailable.` }],
            isError: true,
            error: { message: `tool ${exec.name} not found`, info: { name: 'ToolNotFoundError', code: 'UNKNOWN_TOOL' } },
        };
    }
    const argsJson = JSON.stringify(exec.arguments ?? {});
    const synthesizedCode = `const result = await tools.${exec.name}(${argsJson});\nreturn result;`;
    try {
        const rawResult = await runCodeTool.execute({
            description: `Auto-bridged direct invocation: ${exec.name}`,
            code: synthesizedCode,
        }, exec);
        // Render the output if available
        if (runCodeTool.output?.render) {
            return {
                content: runCodeTool.output.render({ description: 'Auto-bridged', code: synthesizedCode }, rawResult),
                isError: false,
            };
        }
        const outputText = typeof rawResult === 'string' ? rawResult : JSON.stringify(rawResult, null, 2);
        return {
            content: [{ type: 'text', text: outputText }],
            isError: false,
        };
    }
    catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
            content: [{ type: 'text', text: `Error during bridged ${exec.name} execution: ${message}` }],
            isError: true,
            error: { message, info: { name: 'BridgedExecutionError', code: 'CODE_RUN_FAILED' } },
        };
    }
}
