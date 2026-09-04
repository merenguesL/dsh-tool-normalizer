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
    tools: {
      get: vi.fn(),
      execute: vi.fn(),
    },
    systemPrompt: {
      section: vi.fn(),
    },
    on(event: string, fn: (...args: any[]) => any) {
      if (!listeners[event]) listeners[event] = [];
      listeners[event].push(fn);
    },
    async runWaterfall(event: string, exec: any, next: () => Promise<any>) {
      const handlers = listeners[event] || [];
      if (handlers.length === 0) return next();
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

describe("dsh-tool-normalizer plugin", () => {
  it("intercepts run_code calls and auto-fixes command argument", async () => {
    const ctx = createMockContext();
    (ctx as any).tokenMeter = {
      measure: vi.fn(() => ({ totalTokens: 12345 })),
    };
    ctx.tools.get.mockImplementation((name: string) =>
      name === "bash"
        ? {
            name,
            parameters: {
              type: "object",
              required: ["command", "description"],
            },
          }
        : undefined,
    );

    apply(ctx as any, { autoWrapRunCode: true });

    const exec = {
      name: "run_code",
      arguments: { command: "pnpm test" },
      callId: "c1",
      rootCallId: "c1",
      token: "tok",
      agent: { session: { header: { cwd: "/workspace" }, events: [] } },
      signal: new AbortController().signal,
    };

    const next = vi
      .fn()
      .mockResolvedValue({
        content: [{ type: "text", text: "OK" }],
        isError: false,
      });

    await ctx.runWaterfall("tools/execute", exec, next);

    expect(next).toHaveBeenCalled();
    expect(exec.arguments).toMatchObject({
      description: "Execute command: pnpm test",
    });
    const healedCode = (exec.arguments as any).code as string;
    expect(healedCode).toContain('"command":"pnpm test"');
    // bash declares description as required, so the generated sub-dispatch
    // receives the missing field as well.
    expect(healedCode).toContain("description:");
    // One skipped round-trip × the meter's measured request pressure.
    expect(tracker.getSnapshot().estimatedTokensSaved).toBe(12345);
  });

  it("injects inner descriptions only for tools whose active schema requires them", async () => {
    const ctx = createMockContext();
    ctx.tools.get.mockImplementation((name: string) => {
      if (name === "bash")
        return {
          name,
          parameters: { type: "object", required: ["command", "description"] },
        };
      if (name === "read")
        return {
          name,
          parameters: { type: "object", required: ["file_path"] },
        };
      return undefined;
    });

    apply(ctx as any, { autoWrapRunCode: true });

    const exec = {
      name: "run_code",
      arguments: {
        code: 'const a = await tools.read({ file_path: "notes.md" }); const b = await tools.bash({ command: "pwd" });',
        description: "Inspect files",
      },
      callId: "schema-1",
      rootCallId: "schema-1",
      token: "tok",
      signal: new AbortController().signal,
    };
    const next = vi
      .fn()
      .mockResolvedValue({
        content: [{ type: "text", text: "OK" }],
        isError: false,
      });

    await ctx.runWaterfall("tools/execute", exec, next);

    const healedCode = (exec.arguments as { code: string }).code;
    expect(healedCode).toContain('tools.read({ file_path: "notes.md" })');
    expect(healedCode).toContain(
      'tools.bash({ description: "Inspect files · bash", command: "pwd" })',
    );
    expect(tracker.getSnapshot().recentRecords[0]?.normalizationSummary).toBe(
      "补全内层 description × 1",
    );
  });

  it("repairs a broken run_code program body before execution", async () => {
    const ctx = createMockContext();
    ctx.tools.get.mockReturnValue(undefined);
    apply(ctx as any, { autoWrapRunCode: true });

    // Truncated tail, reproduced from a production record: the `code` ends
    // inside the inner description string and the call stays open.
    const exec = {
      name: "run_code",
      arguments: {
        code: [
          "const out = await tools.bash({",
          "  command: `cd /repo",
          'grep -n "def " src/a.py | head -30`,',
          '  description: "Map functions and feature assembly',
        ].join("\n"),
      },
      callId: "syntax-1",
      rootCallId: "syntax-1",
      token: "tok",
      signal: new AbortController().signal,
    };
    const next = vi
      .fn()
      .mockResolvedValue({
        content: [{ type: "text", text: "OK" }],
        isError: false,
      });

    await ctx.runWaterfall("tools/execute", exec, next);

    const healedCode = (exec.arguments as { code: string }).code;
    expect(healedCode).toContain('feature assembly"})');
    const record = tracker.getSnapshot().recentRecords[0];
    expect(record?.category).toBe("RUN_CODE_SYNTAX");
    expect(record?.normalizationSummary).toContain("修复 run_code 程序语法");
  });

  it("does not touch a run_code program body that already parses", async () => {
    const ctx = createMockContext();
    ctx.tools.get.mockReturnValue(undefined);
    apply(ctx as any, { autoWrapRunCode: true });

    // The program embeds already-escaped backticks (healthy template): the
    // syntax pass must leave it byte-identical.
    const code =
      "const content = `inline \\`code\\` span\n`;\nconsole.log(content.length)";
    const exec = {
      name: "run_code",
      arguments: { code, description: "Render doc" },
      callId: "syntax-2",
      rootCallId: "syntax-2",
      token: "tok",
      signal: new AbortController().signal,
    };
    const next = vi
      .fn()
      .mockResolvedValue({
        content: [{ type: "text", text: "OK" }],
        isError: false,
      });

    await ctx.runWaterfall("tools/execute", exec, next);

    expect((exec.arguments as { code: string }).code).toBe(code);
    expect(tracker.getSnapshot().healedSuccess).toBe(0);
  });

  it("records the changed tail when a long run_code description is added", async () => {
    const ctx = createMockContext();
    ctx.tools.get.mockReturnValue(undefined);
    apply(ctx as any, { autoWrapRunCode: true });

    const exec = {
      name: "run_code",
      arguments: { code: `const value = "${"x".repeat(300)}"; return value;` },
      callId: "preview-1",
      rootCallId: "preview-1",
      token: "tok",
      signal: new AbortController().signal,
    };
    const next = vi
      .fn()
      .mockResolvedValue({
        content: [{ type: "text", text: "OK" }],
        isError: false,
      });

    await ctx.runWaterfall("tools/execute", exec, next);

    const record = tracker.getSnapshot().recentRecords[0];
    expect(record?.category).toBe("RUN_CODE_DESC");
    expect(record?.normalizationSummary).toContain("补全 run_code.description");
    expect(record?.normalizedArgsPreview).toContain("Execute code script");
    expect(record?.originalArgsPreview).not.toContain("Execute code script");
  });

  it("does not count a canonical run_code call as healed just because field order differs", async () => {
    const ctx = createMockContext();
    ctx.tools.get.mockReturnValue(undefined);
    apply(ctx as any, { autoWrapRunCode: true });

    const exec = {
      name: "run_code",
      arguments: { description: "Return a value", code: "return 1;" },
      callId: "canonical-1",
      rootCallId: "canonical-1",
      token: "tok",
      signal: new AbortController().signal,
    };
    const next = vi
      .fn()
      .mockResolvedValue({
        content: [{ type: "text", text: "OK" }],
        isError: false,
      });

    await ctx.runWaterfall("tools/execute", exec, next);

    expect(tracker.getSnapshot().healedSuccess).toBe(0);
    expect(tracker.getSnapshot().passThrough).toBe(1);
    expect(tracker.getSnapshot().recentRecords).toHaveLength(0);
  });

  it("normalizes editor path and view ranges", async () => {
    const ctx = createMockContext();
    ctx.tools.get.mockReturnValue({ name: "edit" });

    apply(ctx as any, { autoClampRanges: true });

    const exec = {
      name: "edit",
      arguments: { path: "relative/file.ts", view_range: [-1, 20] },
      callId: "c2",
      rootCallId: "c2",
      token: "tok",
      signal: new AbortController().signal,
    };

    const next = vi
      .fn()
      .mockResolvedValue({
        content: [{ type: "text", text: "OK" }],
        isError: false,
      });

    await ctx.runWaterfall("tools/execute", exec, next);

    expect(next).toHaveBeenCalled();
    expect((exec.arguments as any).path).toMatch(/^\//);
    expect((exec.arguments as any).view_range).toEqual([1, 20]);
  });

  it("observes an unread file and retries a guarded mutation through the host dispatcher", async () => {
    const ctx = createMockContext();
    const agent = { session: { header: { cwd: "/workspace" } } };
    const calls: Array<Record<string, unknown>> = [];
    ctx.tools.get.mockImplementation((name: string) => {
      if (name === "read" || name === "edit") return { name };
      return undefined;
    });
    ctx.tools.execute.mockImplementation(
      async (input: Record<string, unknown>) => {
        calls.push(input);
        return {
          isError: false,
          value: { ok: true },
          content: [{ type: "text", text: `${String(input.name)} ok` }],
        };
      },
    );

    apply(ctx as any, { autoObserveFiles: true });

    const token = Symbol("token");
    const exec = {
      name: "edit",
      arguments: { file_path: "src/file.ts", old_string: "a", new_string: "b" },
      callId: "c3",
      rootCallId: "root-3",
      token,
      agent,
      signal: new AbortController().signal,
    };
    const next = vi.fn().mockResolvedValue({
      isError: true,
      content: [{ type: "text", text: "read first" }],
      error: {
        message: "edit requires reading first",
        info: { code: "FS_NOT_OBSERVED" },
      },
    });

    const result = await ctx.runWaterfall("tools/execute", exec, next);

    expect(result.isError).toBe(false);
    expect(next).toHaveBeenCalledOnce();
    expect(calls.map((call) => call.name)).toEqual(["read", "edit"]);
    expect(calls[0]).toMatchObject({
      arguments: { file_path: "/workspace/src/file.ts" },
      rootCallId: "root-3",
      parent: token,
      agent,
    });
    expect(calls[1]).toMatchObject({
      arguments: {
        file_path: "/workspace/src/file.ts",
        old_string: "a",
        new_string: "b",
      },
      rootCallId: "root-3",
      parent: token,
      agent,
    });
  });

  it("bridges only an observed UNKNOWN_TOOL result through nested tools.execute", async () => {
    const ctx = createMockContext();
    const agent = { session: { id: "session-4" } };
    const calls: Array<Record<string, unknown>> = [];
    ctx.tools.get.mockImplementation((name: string) => {
      if (name === "run_code" || name === "bash") return { name };
      return undefined;
    });
    ctx.tools.execute.mockImplementation(
      async (input: Record<string, unknown>) => {
        calls.push(input);
        return {
          isError: false,
          value: { stdout: "ok" },
          content: [{ type: "text", text: "ok" }],
        };
      },
    );

    apply(ctx as any, { autoBridgeDirectTools: true });

    const token = Symbol("token");
    const exec = {
      name: "bash",
      arguments: { command: "echo ok" },
      callId: "c4",
      rootCallId: "root-4",
      token,
      agent,
      signal: new AbortController().signal,
    };
    const next = vi.fn().mockResolvedValue({
      isError: true,
      content: [{ type: "text", text: "unknown tool" }],
      error: { message: 'unknown tool "bash"', info: { code: "UNKNOWN_TOOL" } },
    });

    const result = await ctx.runWaterfall("tools/execute", exec, next);

    expect(result.isError).toBe(false);
    expect(next).toHaveBeenCalledOnce();
    expect(calls).toHaveLength(1);
    expect(calls[0]).toMatchObject({
      name: "bash",
      arguments: { command: "echo ok" },
      rootCallId: "root-4",
      parent: token,
      agent,
    });
  });

  it("uses the editor-reported line count to retry an out-of-bounds view range", async () => {    const ctx = createMockContext();
    const agent = { session: { header: { cwd: "/workspace" } } };
    const calls: Array<Record<string, unknown>> = [];
    ctx.tools.get.mockImplementation((name: string) =>
      name === "str_replace_editor" ? { name } : undefined,
    );
    ctx.tools.execute.mockImplementation(
      async (input: Record<string, unknown>) => {
        calls.push(input);
        return {
          isError: false,
          value: "view ok",
          content: [{ type: "text", text: "view ok" }],
        };
      },
    );

    apply(ctx as any, { autoClampRanges: true, autoObserveFiles: false });

    const exec = {
      name: "str_replace_editor",
      arguments: { command: "view", path: "notes.md", view_range: [1, 99] },
      callId: "c5",
      rootCallId: "root-5",
      token: Symbol("token"),
      agent,
      signal: new AbortController().signal,
    };
    const next = vi.fn().mockResolvedValue({
      isError: true,
      content: [{ type: "text", text: "range invalid" }],
      error: {
        message:
          "Invalid `view_range`: its second element should be smaller than the number of lines in the file: `10`",
      },
    });

    const result = await ctx.runWaterfall("tools/execute", exec, next);

    expect(result.isError).toBe(false);
    expect(calls).toHaveLength(1);
    expect(calls[0]).toMatchObject({
      name: "str_replace_editor",
      arguments: { path: "/workspace/notes.md", view_range: [1, 10] },
    });
  });

  it("leaves an empty non-string command for the host to reject instead of healing it into a no-op", async () => {
    const ctx = createMockContext();
    ctx.tools.get.mockReturnValue(undefined);
    apply(ctx as any, { autoWrapRunCode: true });

    const exec = {
      name: "run_code",
      arguments: { command: [], description: "placeholder" },
      callId: "empty-cmd-1",
      rootCallId: "empty-cmd-1",
      token: "tok",
      signal: new AbortController().signal,
    };
    const next = vi.fn().mockResolvedValue({
      content: [{ type: "text", text: "OK" }],
      isError: false,
    });

    await ctx.runWaterfall("tools/execute", exec, next);

    // The invalid `command` field is preserved so the host schema rejects it
    // loudly; an empty synthesized program would succeed silently instead.
    expect(exec.arguments).toMatchObject({ command: [] });
    expect(exec.arguments).not.toHaveProperty("code");
    expect(tracker.getSnapshot().healedSuccess).toBe(0);
  });

  it("does not record the plugin's own nested recoveries as interceptions", async () => {
    const ctx = createMockContext();
    ctx.tools.get.mockReturnValue(undefined);
    apply(ctx as any, {});

    const exec = {
      name: "read",
      arguments: { file_path: "/workspace/notes.md" },
      callId: "c3:normalizer:observe-read",
      rootCallId: "root-3",
      token: "tok",
      parent: Symbol("parent"),
      signal: new AbortController().signal,
    };
    const next = vi.fn().mockResolvedValue({
      content: [{ type: "text", text: "notes" }],
      isError: false,
    });

    const result = await ctx.runWaterfall("tools/execute", exec, next);

    expect(result.isError).toBe(false);
    expect(tracker.getSnapshot().totalIntercepted).toBe(0);
  });

  it("retries a stale-version mutation the same way as an unobserved one", async () => {
    const ctx = createMockContext();
    const agent = { session: { header: { cwd: "/workspace" } } };
    const calls: Array<Record<string, unknown>> = [];
    ctx.tools.get.mockImplementation((name: string) => {
      if (name === "read" || name === "edit") return { name };
      return undefined;
    });
    ctx.tools.execute.mockImplementation(
      async (input: Record<string, unknown>) => {
        calls.push(input);
        return {
          isError: false,
          value: { ok: true },
          content: [{ type: "text", text: `${String(input.name)} ok` }],
        };
      },
    );

    apply(ctx as any, { autoObserveFiles: true });

    const exec = {
      name: "edit",
      arguments: { file_path: "src/file.ts", old_string: "a", new_string: "b" },
      callId: "stale-1",
      rootCallId: "root-stale-1",
      token: Symbol("token"),
      agent,
      signal: new AbortController().signal,
    };
    const next = vi.fn().mockResolvedValue({
      isError: true,
      content: [{ type: "text", text: "file changed" }],
      error: {
        message: "file changed since it was read",
        info: { code: "FS_STALE_VERSION" },
      },
    });

    const result = await ctx.runWaterfall("tools/execute", exec, next);

    expect(result.isError).toBe(false);
    expect(calls.map((call) => call.name)).toEqual(["read", "edit"]);
    const record = tracker.getSnapshot().recentRecords[0];
    expect(record?.category).toBe("FS_OBSERVED");
    expect(record?.normalizationSummary).toContain("重读最新版本后重试修改");
  });

  it("attributes a pre-dispatch heal honestly when the final error is unrelated", async () => {
    const ctx = createMockContext();
    ctx.tools.get.mockReturnValue(undefined);
    apply(ctx as any, { autoWrapRunCode: true });

    const exec = {
      name: "run_code",
      arguments: { code: "const value = 1;\nreturn value;" },
      callId: "attr-1",
      rootCallId: "attr-1",
      token: "tok",
      signal: new AbortController().signal,
    };
    const next = vi.fn().mockResolvedValue({
      isError: true,
      content: [{ type: "text", text: "parse failed" }],
      error: {
        message: "code run failed (exception): Expected ',', got 'ident'",
        info: { code: "CODE_RUN_FAILED" },
      },
    });

    await ctx.runWaterfall("tools/execute", exec, next);

    // The description completion was real but did not address a syntax
    // failure, so the call counts as an unhealed failure, not a failed heal.
    const snapshot = tracker.getSnapshot();
    expect(snapshot.healedFailed).toBe(0);
    expect(snapshot.passThroughFailed).toBe(1);
    const record = snapshot.recentRecords[0];
    expect(record?.category).toBe("PASSTHROUGH");
    expect(record?.wasHealed).toBe(false);
    expect(record?.normalizationSummary).toContain("计入未修复");
  });

  it("appends a recovery hint to a PTC-collapsed direct call it cannot bridge", async () => {
    const ctx = createMockContext();
    // Nothing visible in scope, so bridging is unavailable and the hint path
    // is the only help the plugin can offer.
    ctx.tools.get.mockReturnValue(undefined);
    apply(ctx as any, { autoBridgeDirectTools: true, errorHints: true });

    const exec = {
      name: "bash",
      arguments: { command: "echo ok", description: "Echo" },
      callId: "hint-1",
      rootCallId: "root-hint-1",
      token: Symbol("token"),
      agent: { session: { id: "session-hint" } },
      signal: new AbortController().signal,
    };
    const next = vi.fn().mockResolvedValue({
      isError: true,
      content: [
        {
          type: "text",
          text: 'Error: unknown tool "bash": only `run_code` is callable directly — call `bash` from inside a `run_code` program instead',
        },
      ],
      error: {
        message:
          'unknown tool "bash": only `run_code` is callable directly — call `bash` from inside a `run_code` program instead',
        info: { code: "UNKNOWN_TOOL" },
      },
    });

    const result = await ctx.runWaterfall("tools/execute", exec, next);

    expect(result.isError).toBe(true);
    const text = (result.content as Array<{ text?: string }>)
      .map((block) => block.text ?? "")
      .join("\n");
    expect(text).toContain('only `run_code` is callable directly');
    expect(text).toContain("[tool-normalizer hint]");
    expect(text).toContain("await tools.bash");
  });

  it("appends a syntax hint to an unrepairable run_code parse failure", async () => {
    const ctx = createMockContext();
    ctx.tools.get.mockReturnValue(undefined);
    apply(ctx as any, { autoWrapRunCode: true, errorHints: true });

    const exec = {
      name: "run_code",
      arguments: { code: "return 1;", description: "Return one" },
      callId: "hint-2",
      rootCallId: "root-hint-2",
      token: "tok",
      signal: new AbortController().signal,
    };
    const next = vi.fn().mockResolvedValue({
      isError: true,
      content: [{ type: "text", text: "parse failed" }],
      error: {
        message: "code run failed (exception): Expected ',', got 'ident'",
        info: { code: "CODE_RUN_FAILED" },
      },
    });

    const result = await ctx.runWaterfall("tools/execute", exec, next);

    const text = (result.content as Array<{ text?: string }>)
      .map((block) => block.text ?? "")
      .join("\n");
    expect(text).toContain("parse failed");
    expect(text).toContain("[tool-normalizer hint]");
  });

  it("leaves error results untouched when error hints are disabled", async () => {
    const ctx = createMockContext();
    ctx.tools.get.mockReturnValue(undefined);
    apply(ctx as any, { autoWrapRunCode: true, errorHints: false });

    const exec = {
      name: "run_code",
      arguments: { code: "return 1;", description: "Return one" },
      callId: "hint-3",
      rootCallId: "root-hint-3",
      token: "tok",
      signal: new AbortController().signal,
    };
    const next = vi.fn().mockResolvedValue({
      isError: true,
      content: [{ type: "text", text: "parse failed" }],
      error: {
        message: "code run failed (exception): Expected ',', got 'ident'",
        info: { code: "CODE_RUN_FAILED" },
      },
    });

    const result = await ctx.runWaterfall("tools/execute", exec, next);

    expect(result.content).toEqual([{ type: "text", text: "parse failed" }]);
  });
});
