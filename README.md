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

`dsh-tool-normalizer` acts as a low-overhead, deterministic safety middleware on the `tools/execute` waterfall extension point, paired with an integrated Web UI diagnostics dashboard.

```
       Model Tool Call
              │
              ▼
   ┌────────────────────────────────────────────────────────┐
   │             dsh-tool-normalizer (Plugin)               │
   │                                                        │
   │  1. run_code Normalizer (command ➔ code, description)   │
   │  2. Safe Direct-Call Recovery (context-preserving nested dispatch) │
   │  3. Range & Path Normalizer (relative paths, real bounds)        │
   │  4. Dynamic Prompt Guidance (minimal token footprint)  │
   │  5. Real-Time Telemetry & Statistics Tracker           │
   └────────────────────────────────────────────────────────┘
              │
              ▼
    Best-effort Recovery of Repairable Errors
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
  - When an `UNKNOWN_TOOL` result reaches `tools/execute` and the target is visible in the active agent scope, the plugin re-dispatches it through the host's `tools.execute()` API as a nested call, preserving agent/session ownership, cancellation, contexts, and terminal state.
  - Scope note: under the PTC (`code`) presentation collapse, the host may reject a direct call before any listener runs; a plugin cannot intercept that path. The plugin never invokes a tool definition's `execute()` method directly.
- 🩹 **Inner-Call Description Injection**:
  - Before a `run_code` program executes, inserts generated descriptions into its `tools.*()` calls that lack them — inner sub-dispatch validation requires `description`, and missing ones were the dominant production failure class.
- 📐 **Editor Parameter & Bounds Normalization**:
  - Corrects structural and inverted `view_range` values in `str_replace_editor`; when the real error reports a line count, it retries with that bound and preserves the `-1` end-of-file sentinel.
  - Resolves relative file paths to absolute paths against the session working directory.
- 🩹 **Observe-then-Retry Recovery**:
  - Only after `FS_NOT_OBSERVED` does the plugin read the target and retry the mutation once through the host dispatcher; normal calls do not pay for a speculative read.
- 📈 **Projected Token Savings**:
  - Estimates the input tokens avoided by each successful healing (`healedSuccess × estimatedRetryTokenCost`), shown in the dashboard, clearly labeled as an estimate.
  - Live observability: every interception updates aggregate counters. Healing attempts and failures append detailed JSONL events to `~/.dsh/tool-normalizer-events.jsonl`; successful untouched pass-through calls are aggregated in `tool-normalizer-summary.json` by default instead of expanding the detail log.
  - The dashboard reads live data from the same-origin feed `GET /plugin-api/tool-normalizer/stats`, registered by the node half when a webserver is present.
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

## 🚀 Installation & Quick Start

In DeepSeek Harness, plugins are managed per composition profile (`web`, `headless`, `tui`, etc.).

### Step 1: Install Plugin into your Target Profile

Using the `dsh` CLI (or `pnpm dsh` from monorepo root):

```sh
# 1. Install into Web UI profile (Includes Settings Dashboard)
dsh plugin --profile web add dsh-tool-normalizer
# (or if running from source repository)
pnpm dsh plugin --profile web add dsh-tool-normalizer

# 2. Install into Headless automation profile
dsh plugin --profile headless add dsh-tool-normalizer

# 3. Install into TUI terminal profile
dsh plugin --profile tui add dsh-tool-normalizer
```

#### Local Development Link (Optional)
If you are developing or testing local changes:
```sh
pnpm dsh plugin --profile web add ./plugins/dsh-tool-normalizer
```

### Step 2: Launch and Verify

```sh
# Boot Web UI mode
dsh web
# (or from source)
pnpm dsh web
```

Open your browser, navigate to **Settings (⚙️)** ➔ **Tool Normalizer**, and observe real-time tool execution metrics and auto-healing in action!

---

## ⚙️ Configuration

You can customize plugin behavior in your workspace's `cordis.patch.yml` or `cordis.yml`:

```yaml
- insert:
    - id: tool-normalizer
      name: dsh-tool-normalizer
      config:
        autoWrapRunCode: true
        autoBridgeDirectTools: true
        autoObserveFiles: true
        autoClampRanges: true
        injectPrompt: true
        estimatedRetryTokenCost: 8000
        persistPassthrough: false
```

| Option | Type | Default | Description |
| :--- | :---: | :---: | :--- |
| `autoWrapRunCode` | `boolean` | `true` | Auto-convert `command` -> `code`, supply missing descriptions, strip Markdown fences. |
| `autoBridgeDirectTools` | `boolean` | `true` | Safely re-dispatch an `UNKNOWN_TOOL` result that reached `tools/execute`; host-level pre-dispatch denials cannot be intercepted by a plugin. |
| `autoObserveFiles` | `boolean` | `true` | After `FS_NOT_OBSERVED`, read the target and retry one edit/write through the host dispatcher. |
| `autoClampRanges` | `boolean` | `true` | Correct editor ranges and resolve relative paths against the session directory. |
| `injectPrompt` | `boolean` | `true` | Dynamically register prompt guidelines with `ctx.systemPrompt`. Static text only — never breaks prefix caching. |
| `estimatedRetryTokenCost` | `number` | `8000` | Estimated input tokens of one avoided retry; drives the dashboard's token-savings projection (labeled as an estimate). |
| `persistPassthrough` | `boolean` | `false` | Persist successful untouched pass-through calls as detailed JSONL events; failures and healing attempts are always retained. |

Healing success rate is `healedSuccess / (healedSuccess + healedFailed)` and excludes untouched pass-through failures. Successful untouched calls are kept in aggregate counters and the compact `tool-normalizer-summary.json`, not one detail line per call.

---

## 📦 Release & Publishing Guide

### Option 1: Automated Release via GitHub Actions (Recommended)

1. Set your npm access token as a secret in your GitHub repository:
   - Go to **GitHub Repository Settings ➔ Secrets and variables ➔ Actions ➔ New repository secret**.
   - Name: `NPM_TOKEN`, Value: `<your-npm-automation-token>` (Ensure 2FA bypass is enabled for write actions).
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
