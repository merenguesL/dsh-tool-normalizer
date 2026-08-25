/**
 * Bridge for direct tool calls made when the agent is in Code-Mode.
 *
 * @module dsh-tool-normalizer/normalizers/direct-bridge
 */
import type { ToolDispatchExecution, ToolExecutionResult, ToolRuntime } from '@deepseek-ai/dsh-tools';
/**
 * Checks whether a tool call can be bridged into `run_code`.
 * @param toolName - Name of the requested tool.
 * @param tools - Tool runtime registry.
 * @returns True if tool is bridgeable and `run_code` is available.
 */
export declare function isBridgeableDirectCall(toolName: string, tools: ToolRuntime): boolean;
/**
 * Synthesizes and executes a `run_code` call for a direct tool invocation.
 *
 * @param exec - The direct tool execution.
 * @param tools - Tool runtime registry.
 * @returns The execution result from the synthesized `run_code` call.
 */
export declare function executeBridgeDirectCall(exec: ToolDispatchExecution, tools: ToolRuntime): Promise<ToolExecutionResult>;
//# sourceMappingURL=direct-bridge.d.ts.map