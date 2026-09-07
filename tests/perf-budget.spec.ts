import { beforeEach, describe, expect, it, vi } from "vitest";
import { apply } from "../src/index.ts";
import { ToolNormalizerTracker } from "../src/tracker.ts";

const tracker = ToolNormalizerTracker.getInstance();

beforeEach(() => {
  tracker.reset();
});

function createMockContext() {
  const listeners: Record<string, ((...args: any[]) => any)[]> = {};
  return {
    on(event: string, fn: (...args: any[]) => any) {
      if (!listeners[event]) listeners[event] = [];
      listeners[event].push(fn);
    },
    async runWaterfall(event: string, exec: any, next: () => Promise<any>) {
      const handlers = listeners[event] || [];
      let index = 0;
      const dispatch = async (): Promise<any> => {
        if (index < handlers.length) {
          const handler = handlers[index++]!;
          return handler(exec, dispatch);
        }
        return next();
      };
      return dispatch();
    },
  };
}

function healthyRunCodeExec(code: string) {
  return {
    name: "run_code",
    arguments: { code, description: "Healthy program" },
    callId: `perf-${Math.random().toString(36).slice(2)}`,
    rootCallId: "perf",
    token: "tok",
    agent: { session: { header: { cwd: "/workspace" }, events: [] } },
    signal: new AbortController().signal,
  };
}

const okNext = () =>
  vi.fn().mockResolvedValue({
    content: [{ type: "text", text: "OK" }],
    isError: false,
  });

describe("hot-path budgets", () => {
  it("serializes arguments once for a healthy run_code call", async () => {
    const tools = {
      get: vi.fn(() => ({
        name: "bash",
        parameters: { type: "object", required: ["command", "description"] },
      })),
      execute: vi.fn(),
    };
    const ctx: any = {
      ...createMockContext(),
      get: (name: string) => (name === "tools" ? tools : undefined),
    };
    apply(ctx, { autoWrapRunCode: true });

    // A healthy program: valid fields plus one inner call needing lookup.
    const exec = healthyRunCodeExec(
      'const r = await tools.bash({ command: "pwd", description: "d" }); return r;',
    );
    const stringify = vi.spyOn(JSON, "stringify");
    stringify.mockClear();
    await ctx.runWaterfall("tools/execute", exec, okNext());
    // One serialization (the raw-args capture); the unchanged-arguments fast
    // path must not stringify the normalized copy again.
    expect(stringify).toHaveBeenCalledTimes(1);
    stringify.mockRestore();
    expect(tracker.getSnapshot().healedSuccess).toBe(0);
  });

  it("resolves each inner tool schema once per dispatch", async () => {
    const tools = {
      get: vi.fn((name: string) =>
        name === "bash"
          ? {
              name,
              parameters: {
                type: "object",
                required: ["command", "description"],
              },
            }
          : undefined,
      ),
      execute: vi.fn(),
    };
    const ctx: any = {
      ...createMockContext(),
      get: (name: string) => (name === "tools" ? tools : undefined),
    };
    apply(ctx, { autoWrapRunCode: true });

    // Eight references to one tool: schema lookups must not scale with them.
    const refs = Array.from(
      { length: 8 },
      (_, i) => `await tools.bash({ command: "echo ${i}" })`,
    ).join("; ");
    const exec = healthyRunCodeExec(`${refs}; return "done";`);
    tools.get.mockClear();
    await ctx.runWaterfall("tools/execute", exec, okNext());
    expect(tools.get).toHaveBeenCalledTimes(1);
  });
});
