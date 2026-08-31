import { describe, expect, it } from "vitest";
import {
  escapeStrayTemplateBackticks,
  missingTailClosers,
  parseProgram,
  repairRunCodeSyntax,
  repairTruncatedTail,
  rewriteTripleQuotedStrings,
} from "../src/normalizers/run-code-syntax.ts";

describe("run-code syntax repair", () => {
  describe("parseProgram", () => {
    it("accepts a valid async body with top-level await", () => {
      expect(
        parseProgram(
          'const out = await tools.bash({ command: "pwd" });\nreturn out;',
        ),
      ).toBe(true);
    });

    it("rejects a program with a parse error", () => {
      expect(
        parseProgram('const out = await tools.bash({\n  command: "pwd",\n'),
      ).toBe(false);
    });

    it("rejects Python-style triple-quoted strings", () => {
      expect(
        parseProgram("const s = '''\nimport urllib\n'''\nconsole.log(s)"),
      ).toBe(false);
    });

    it("rejects an unterminated template literal", () => {
      expect(parseProgram("const s = `cd /tmp\nls")).toBe(false);
    });
  });

  describe("repairTruncatedTail", () => {
    it("closes a tail cut inside a description string and its call", () => {
      // Reproduced from a production record: the model's `code` ended inside
      // the inner `description` string, leaving the object and call open.
      const code = [
        "const out = await tools.bash({",
        "  command: `cd /home/mgl/AIRepo/elec_dashboard",
        'grep -n "def " src/pipeline/a.py | head -30`,',
        '  description: "Map backtest task functions and feature assembly',
      ].join("\n");
      const repaired = repairTruncatedTail(code);
      expect(repaired).toBeDefined();
      expect(repaired).toContain('feature assembly"})');
      expect(parseProgram(repaired!)).toBe(true);
    });

    it("closes a tail cut inside a template command", () => {
      const code =
        "const out = await tools.bash({\n  command: `cd /tmp\nls -la\n";
      const repaired = repairTruncatedTail(code);
      expect(repaired).toBeDefined();
      expect(parseProgram(repaired!)).toBe(true);
      expect(repaired!.endsWith("`})")).toBe(true);
    });

    it("returns undefined for a program with a balanced tail", () => {
      const code =
        'const out = await tools.bash({ command: "pwd" });\nconsole.log(out)';
      expect(repairTruncatedTail(code)).toBeUndefined();
    });

    it("returns undefined when the tail is not a plain cut", () => {
      // Stray backtick inside the template: closing it would truncate the
      // content, so the tail repair must refuse and let the backtick repair
      // handle it.
      const code = "const s = `cd /tmp\nls `*.json`\n";
      expect(repairTruncatedTail(code)).toBeUndefined();
    });
  });

  describe("rewriteTripleQuotedStrings", () => {
    it("converts a python-style triple-single-quote span to a template", () => {
      const code = [
        "const script = '''",
        "import urllib.request, json",
        'HOST = "http://47.106.189.209:9000"',
        "''';",
        "console.log(script)",
      ].join("\n");
      const repaired = rewriteTripleQuotedStrings(code);
      expect(repaired).toBeDefined();
      expect(repaired).not.toContain("'''");
      expect(repaired).toContain("const script = `");
      expect(parseProgram(repaired!)).toBe(true);
    });

    it("converts a triple-double-quote span used as a JS string value", () => {
      const code = [
        "await tools.write({",
        '  file_path: "/tmp/openmeteo.py",',
        '  content: """Open-Meteo 气象客户端（archive / forecast / historical-forecast）。',
        "    移植自 ../electricityPrice/common/weather/openweather.py",
        '  """,',
        "});",
      ].join("\n");
      const repaired = rewriteTripleQuotedStrings(code);
      expect(repaired).toBeDefined();
      expect(repaired).toContain("content: `");
      expect(parseProgram(repaired!)).toBe(true);
    });

    it("escapes backticks and interpolations inside the converted span", () => {
      const code = ["const s = '''", "run `head -30`; value ${x}", "'''"].join(
        "\n",
      );
      const repaired = rewriteTripleQuotedStrings(code);
      expect(repaired).toBeDefined();
      expect(repaired).toContain("\\`head -30\\`");
      expect(repaired).toContain("\\${x}");
      expect(parseProgram(repaired!)).toBe(true);
    });

    it("leaves a one-line single-quoted string untouched", () => {
      const code = "const a = 'foo';";
      expect(rewriteTripleQuotedStrings(code)).toBeUndefined();
    });
  });

  describe("escapeStrayTemplateBackticks", () => {
    it("escapes a stray backtick inside a template literal", () => {
      const code = [
        "const content = `# 云南水文径流数据接入设计",
        "",
        "> 表格列 `station_id` 为主键，快照表 `glofas_v4_consolidated` 每天更新。",
        "`;",
        "console.log(content.length)",
      ].join("\n");
      expect(parseProgram(code)).toBe(false);
      const repaired = escapeStrayTemplateBackticks(code);
      expect(repaired).toBeDefined();
      expect(parseProgram(repaired!)).toBe(true);
      expect(repaired).toContain("\\`station_id\\`");
      expect(repaired).toContain("\\`glofas_v4_consolidated\\`");
    });

    it("keeps the template tail pair when a repair parses", () => {
      // Four backticks for three strings: escaping the middle two yields
      // one template whose content holds them as escaped characters.
      const code = "const s = `a`b`c`;";
      const repaired = escapeStrayTemplateBackticks(code);
      expect(repaired).toBeDefined();
      expect(parseProgram(repaired!)).toBe(true);
      expect(repaired).toContain("\\`b\\`");
    });
  });

  describe("missingTailClosers", () => {
    it("returns the bracket chain for an unclosed call", () => {
      expect(
        missingTailClosers(
          'const out = await tools.bash({\n  command: "pwd",\n',
        ),
      ).toBe("})");
    });

    it("returns undefined on an unbalanced closer", () => {
      expect(missingTailClosers("const x = (1));")).toBeUndefined();
    });
  });

  describe("repairRunCodeSyntax", () => {
    it("returns undefined for parseable programs", () => {
      const code = 'return await tools.bash({ command: "pwd" })';
      expect(parseProgram(code)).toBe(true);
      expect(repairRunCodeSyntax(code)).toBeUndefined();
    });

    it("repairs a truncated tail end-to-end", () => {
      const code = [
        "const out = await tools.bash({",
        "  command: `cd /repo",
        'grep -n "def " src/a.py | head -30`,',
        '  description: "Map functions and assembly',
      ].join("\n");
      const repaired = repairRunCodeSyntax(code);
      expect(repaired).toBeDefined();
      expect(parseProgram(repaired!)).toBe(true);
    });

    it("repairs a python-style span end-to-end", () => {
      const code = [
        "const script = '''",
        "import urllib.request",
        'print("hi")',
        "''';",
        "console.log(script)",
      ].join("\n");
      const repaired = repairRunCodeSyntax(code);
      expect(repaired).toBeDefined();
      expect(parseProgram(repaired!)).toBe(true);
    });
  });
});
