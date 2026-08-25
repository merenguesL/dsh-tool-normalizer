# dsh-tool-normalizer

[![dsh-plugin](https://img.shields.io/badge/dsh--plugin-tools-blue)](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![npm version](https://img.shields.io/npm/v/dsh-tool-normalizer.svg)](https://www.npmjs.com/package/dsh-tool-normalizer)

> An auto-healing, argument normalization, Code-Mode direct tool bridging, and execution diagnostics plugin for [DeepSeek Harness (DSH)](https://github.com/deepseek-ai/deepseek-harness).

[中文文档 (README.zh.md)](./README.zh.md)

---

## 📖 Background & Empirical Motivation

In DeepSeek Harness, tool execution reliability is critical for autonomous agent loops. An empirical analysis across **111 persisted sessions** (containing **11,176 total tool invocations**) revealed **543 tool call errors** (a **4.86% error rate** across 53.2% of sessions).

Detailed root-cause analysis identified four primary structural error drivers:

1. **`INVALID_ARGS` Schema Incompatibilities (13.6%, 74 cases)**:
   - The model frequently treats `run_code` as `bash`, supplying `{"command": "..."}` instead of `{"description": "...", "code": "..."}`.
   - The model frequently omits the required `description` field in `run_code`.
2. **`UNKNOWN_TOOL` Code-Mode Cognitive Inertia (12.3%, 67 cases)**:
   - When Code-Mode is active, only `run_code` is exposed directly to the model. However, the model regularly hallucinates direct tool calls like `read`, `bash`, `write`, or `grep`, which fail immediately with `UNKNOWN_TOOL`.
3. **`CODE_RUN_FAILED` In-Sandbox Failures (46.8%, 254 cases)**:
   - JavaScript syntax errors caused by multiline shell or Python scripts nested inside JS template strings with unescaped backticks or newlines.
4. **File System Safety Policy Violations (5.5%, 30 cases)**:
   - Violating DSH's read-before-edit invariant (`FS_NOT_OBSERVED`), editor `view_range` line count out-of-bounds, or using relative paths instead of absolute paths.

---

## 🎯 What Problems `dsh-tool-normalizer` Solves

`dsh-tool-normalizer` acts as a zero-overhead, deterministic safety middleware on the `tools/execute` waterfall extension point, paired with an integrated Web UI diagnostics dashboard.

```
       Model Tool Call
              │
              ▼
   ┌────────────────────────────────────────────────────────┐
   │             dsh-tool-normalizer (Plugin)               │
   │                                                        │
   │  1. run_code Normalizer (command ➔ code, description)   │
   │  2. Direct-to-Code-Mode Bridge (read/bash ➔ run_code)  │
   │  3. Range & Path Clamper (relative ➔ absolute, bounds) │
   │  4. Dynamic Prompt Guidance (minimal token footprint)  │
   │  5. Real-Time Telemetry & Statistics Tracker           │
   └────────────────────────────────────────────────────────┘
              │
              ▼
    Clean & Valid Execution (0% Interruption)
              │
              ▼
    [Web UI] Settings ➔ Tool Normalizer & Diagnostics Page
```

### Key Features

- 🛠️ **`run_code` Schema Auto-Healing**:
  - Automatically wraps `{"command": "git status"}` or `{"cmd": "..."}` into valid `run_code` JavaScript dispatches.
  - Fills in missing `description` fields with sensible contextual defaults.
  - Strips accidental Markdown code block fences (e.g. ````typescript ... ````).
- 🌉 **Code-Mode Direct Tool Bridging**:
  - When Code-Mode is enabled and the model directly calls `bash`, `read`, `write`, `grep`, `edit`, or `glob`, the plugin transparently synthesizes an internal `run_code` wrapper instead of crashing with `UNKNOWN_TOOL`.
- 📐 **Editor Parameter & Bounds Normalization**:
  - Clamps inverted or out-of-bounds `view_range` parameters in `str_replace_editor`.
  - Resolves relative file paths to absolute paths against the session root.
- 📊 **Web UI Execution & Diagnostics Dashboard**:
  - Embedded directly into DSH's **Settings (`settings.section`)** panel.
  - Displays real-time KPI metrics (Total Interceptions, Auto-Healed Count, Healing Success Rate %, Unrecovered Errors).
  - Visual breakdown by tool and category with progress meters.
  - Filterable live table of execution logs showing original input vs. normalized payload.

---

## 🧭 UI Location & Design Rationale

**Placement**: DeepSeek Harness Settings panel (`settings.section` with ID `tool-normalizer`, order `25`).

### Rationale:
1. **Consistency with DSH Architecture**: In DSH Web UI, developer diagnostics and usage metrics (like `dsh-usage-atlas`, Model configuration, and Plugin inventory) are hosted as first-class sections inside the Settings panel.
2. **Zero Conversation Clutter**: Placing diagnostics in Settings keeps the primary agent chat canvas distraction-free while remaining just one click away via the gear icon in the sidebar rail.
3. **Unified Management**: Allows administrators and developers to observe runtime error rates and clear logs in the same panel where they configure models and plugins.

---

## 🚀 Installation

Install via the DSH plugin manager:

```sh
dsh plugin add dsh-tool-normalizer
```

Or add it manually to your workspace's `package.json` dependencies:

```json
{
  "dependencies": {
    "dsh-tool-normalizer": "^0.1.0"
  }
}
```

And mount it in your `cordis.patch.yml` or `cordis.yml`:

```yaml
- insert:
    - id: tool-normalizer
      name: dsh-tool-normalizer
      config:
        autoWrapRunCode: true
        autoBridgeDirectTools: true
        autoClampRanges: true
        injectPrompt: true
```

---

## ⚙️ Configuration

| Option | Type | Default | Description |
| :--- | :---: | :---: | :--- |
| `autoWrapRunCode` | `boolean` | `true` | Auto-convert `command` -> `code`, supply missing descriptions, strip Markdown fences. |
| `autoBridgeDirectTools` | `boolean` | `true` | Bridge direct `bash`/`read`/`write` calls into `run_code` when in Code-Mode. |
| `autoClampRanges` | `boolean` | `true` | Clamp out-of-bounds `view_range` and resolve relative paths. |
| `injectPrompt` | `boolean` | `true` | Dynamically register prompt guidelines with `ctx.systemPrompt`. |

---

## 📦 Release & Publishing Guide

### Option 1: Automated Release via GitHub Actions (Recommended)

1. Set your npm access token as a secret in your GitHub repository:
   - Go to **GitHub Repository Settings ➔ Secrets and variables ➔ Actions ➔ New repository secret**.
   - Name: `NPM_TOKEN`, Value: `<your-npm-automation-token>`.
2. Bump the version and push a release tag:
   ```sh
   # Bump version (patch / minor / major)
   npm version patch

   # Push commit and tags to GitHub
   git push origin main --tags
   ```
3. Create a GitHub Release on the new tag. The GitHub Actions workflow (`.github/workflows/publish.yml`) will automatically run tests, build artifacts, and publish to npm!

### Option 2: Manual npm Publishing

```sh
# 1. Ensure clean build & passing tests
npm run check

# 2. Login to npm (if not already logged in)
npm login

# 3. Publish to npm registry
npm publish --access public
```

---

## 🧪 Testing & Verification

```sh
# Run all unit tests
pnpm test

# Run tests and compile build artifacts
pnpm run check
```

---

## 📄 License

MIT © [merenguesL](https://github.com/merenguesL)
