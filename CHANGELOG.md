# Changelog

All notable changes to this project are documented in this file.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.4.0] - 2026-09-04

### Added

- **失败即时提示 (`errorHints`, 默认开启)**: PTC 折叠直调与不可修复的 `run_code` 解析失败，在保留原报错文本的前提下追加一条可操作提示（直调改写示例、语法排障要点），模型当轮即可纠正；`errorHints: false` 保持宿主报错逐字节不变。
- **`FS_STALE_VERSION` 观察后重试**: 与 `FS_NOT_OBSERVED` 同路径处理（重读刷新观察版本后按原参重试一次）；`FS_EDIT_NOT_FOUND` / `FS_AMBIGUOUS_EDIT` 绝不盲目重试，仅预读刷新观察态以便下次重试。
- **规则页第 6 张卡片**: 看板规则页新增失败提示说明；深色主题下选中的筛选 pill 与页签修复为 tint 底 + 品牌色文字（此前为黑底黑字）；正常放行状态改用中性色。

### Fixed

- **统计分类补齐 `RUN_CODE_SYNTAX`**: `stats-log.ts` 的持久化分类集合此前遗漏该类别，触发后重启即在恢复时被丢弃。
- **空命令静默成功**: `{"command": []}` 此前被归一化为空程序并记一次成功；现在保留原参数交由宿主大声拒绝，不计入自愈。
- **自愈嵌套调用重复计数**: 插件自身的嵌套恢复调用（`callId` 含 `:normalizer:`）不再计入拦截总数与日志，分母仅为面向用户的调用；Code-Mode 内层 `tools.*` 调用仍正常计数。
- **成功率归因**: 前置规范化改对、但终错属于另一失败类别时，记为无关的未修复失败而非修复失败。
- **桥接名单扩展**: `web_fetch` / `web_search` / `todo_write` / `skill` / `ask_user_question` 纳入可桥接范围（仍要求目标在同作用域可见；PTC 预拒绝路径任何插件均不可见）。

### Changed

- 提示词新增一行：`run_code` 内只写 JS（禁 `def` / `print` / `'''`）与反引号转义要求；静态文本，前缀缓存友好。

## [Unreleased]

### Added

- **run_code 程序语法自愈 (RUN_CODE_SYNTAX)**: programs that fail to parse are repaired before execution with three mechanical fixes, each re-verified against `new AsyncFunction` parsing before acceptance and never applied to valid code — truncated tails (the emitted `code` ends inside an unterminated string or an unclosed call), Python-style triple-quoted strings (`'''`/`"""` spans containing a newline) rewritten as template literals with escaped contents, and unescaped stray backticks inside template literals (escape candidates tried tail-first, already-escaped `` ` `` pairs never double-escaped). This closes the gap where argument-level heals (description completion, inner-description injection) reported a heal while the program body still failed with a parse error. New dashboard category label `RUN_CODE_SYNTAX`.

## [0.3.5] - 2026-08-28

### Removed

- **Stale client runtime inject**: the `dsh.client.inject` list no longer names `@deepseek-ai/dsh-client-runtime`, which the host removed in favor of `@deepseek-ai/dsh-client-store` and the session-controller client. The client half never required it at runtime, so the entry was dead metadata against the post-runtime host.

## [0.3.4] - 2026-08-27

### Changed

- **Measured token-savings projection**: the dashboard's "预估节省Token" KPI now sums tokens measured at heal time from the host `ctx.tokenMeter` — one-request context pressure times the model round-trips each heal skips (`FS_OBSERVED` counts two, every argument normalization counts one) — instead of `healedSuccess × estimatedRetryTokenCost`. The `estimatedRetryTokenCost` config is removed; the per-event `tokensSaved` figure is persisted to the JSONL log, so replay across restarts reconstructs the same total. A composition without `@deepseek-ai/dsh-token-meter` reports `0` rather than guessing.

## [0.3.3] - 2026-08-26

### Fixed

- **Schema-aware inner descriptions**: `run_code` only adds an inner `description` when the active target tool schema declares it required, avoiding unnecessary mutations to open schemas such as `read`, `glob`, and `grep`.
- **Diagnostic diff visibility**: long before/after previews retain both ends and display a bounded summary of the actual changed fields or recovery path.
- **Token projection accounting**: the configured retry cost is applied to the in-memory tracker as well as the durable summary, so the dashboard no longer reports zero for successful healing attempts.

## [0.3.2] - 2026-08-26

### Added

- **Context-preserving nested recovery**: UNKNOWN_TOOL recovery and observe-then-retry now redispatch through the host `tools.execute()` path with the original agent, root call, parent token, cancellation signal, and standard result handling.
- **Observe-then-retry for filesystem mutations**: after `FS_NOT_OBSERVED`, the plugin reads the target and retries the mutation at most once; out-of-range editor errors can likewise trigger one bounded retry using the session working directory.

### Changed

- Successful untouched pass-through calls now contribute to aggregate counters and a compact summary, but are excluded from detailed JSONL records by default. Set `persistPassthrough: true` when per-call auditing is required.
- Failure accounting distinguishes failed healing attempts from unmodified pass-through failures, and the reset endpoint clears both in-memory and durable statistics.

## [0.3.1] - 2026-08-26

### Fixed

- **v0.3.0 injection bug (breaking)**: the inner-description pass spliced the generated property at the wrong position (between `(` and `{`) — every healed call became a JS syntax error (`Expected ',', got ':'`). Rewritten as a linear state-machine scanner that skips string, template, and comment contexts; a `tools.*({` shape inside a string literal is data and is never rewritten. The insertion now lands inside the braces. Scanner aborts conservatively when it cannot parse with confidence.

## [0.3.0] - 2026-08-26

### Added

- **Inner-call description injection (INNER_DESC)**: before a \`run_code\` program executes, the listener scans its \`tools.<name>({ ... })\` options objects and inserts a generated description into any that lack one. Inner sub-dispatch validation requires \`description\`, and this failure class was the dominant one in production sessions (4 of 7 failures). The scanner is string/template-aware and bails out conservatively when it cannot parse confidently; the transformation happens pre-execution, so there is no side-effect duplication risk.
- New \`INNER_DESC\` category surfaces in the dashboard breakdown and locale copy.

## [0.2.2] - 2026-08-26

### Fixed

- **Test runs no longer contaminate the production statistics log**: the plugin's own vitest invocations were appending fixture events to \`~/.dsh/tool-normalizer-events.jsonl\`, permanently inflating healed counts and the token-savings projection with every test run. Log appends are now skipped when VITEST or NODE_ENV=test is detected (in-memory tracking still works for assertions).

## [0.2.1] - 2026-08-26

### Fixed

- **Stats feed 404 under activation-order races**: the plugin resolved the webserver service exactly once at apply time, before the webserver plugin had mounted in some boot orders, so the stats route never registered and the dashboard polled a 404 forever. Registration now polls for up to 60s (1s interval) and logs a warning if no webserver ever appears; deployments without one are unaffected.

## [0.2.0] - 2026-08-26

### Added

- **Durable JSONL event history**: every interception appends one line to \`~/.dsh/tool-normalizer-events.jsonl\` — O(1) appends with no record ceiling; boot-time replay rebuilds cumulative aggregates so statistics and the token-savings projection accumulate across restarts.
- **Dashboard live feed**: the node half registers `GET /plugin-api/tool-normalizer/stats` (same-origin, optional-service: deployments without a webserver load fine), and the panel's refresh now adopts that authoritative snapshot — the dashboard finally shows real server-side data.

### Changed

- Replaced the bounded JSON snapshot mirror (`tool-normalizer-stats.json`) with the append-only event log; the old file can be deleted.
- The in-memory record window widened to 1000 for dashboard transport; full history lives only in the log.

## [0.1.9] - 2026-08-26

### Changed

- **README accuracy fix for the bridge rule's applicability**: direct-tool bridging only applies to deployments that do not register the standard tools (only `run_code`). Under the PTC (`code`) presentation collapse, collapsed tools stay registered and the host deterministically denies direct calls before any listener runs — the rule does not participate there; the host's own denial message routes the model back to `run_code`. Both READMEs now state this scope explicitly.

## [0.1.8] - 2026-08-26

### Added

- **Estimated token savings KPI**: the dashboard gains an "预估节省Token" card (`healedSuccess × estimatedRetryTokenCost`), clearly badged as an estimate; the new `estimatedRetryTokenCost` config (default 8000) tunes the per-retry cost to the deployment's typical conversation length. The projection also flows into the on-disk stats mirror.
- **Inner-call description prevention**: the injected prompt guidance now states that every `tools.*()` call inside `run_code` must carry a `description` — sub-dispatches validate against the full model-facing schema where it is required, and the failure surfaces as a failed outer call. Static text only, so prefix caching is unaffected.
- **Server-side observability**: plugin activation logs one info line; every interception logs a debug line; the aggregate snapshot mirrors (debounced) to \`$DSH_HOME/tool-normalizer-stats.json\` so real interception counts are inspectable without the browser.

## [0.1.7] - 2026-08-26

### Added

- **Version badge in the dashboard header**: the section title now carries a `v<version>` pill so an installed copy's exact build is visible at a glance. The version is injected into the client bundle at build time from `package.json` (`scripts/build.mjs` esbuild `define`), so it can never drift from the published release.

## [0.1.6] - 2026-08-26

### Removed

- **All fabricated dashboard data**: the seeded demo trace records (`norm_init_*`), the hardcoded KPI defaults (118/112/6/84), and the simulate button that injected synthetic events are gone. The panel now renders only genuinely adopted snapshots and shows a designed empty state until real data arrives through the host.
- Persisted state moved to a fresh localStorage key (`..._v2`) so stale pre-0.1.6 demo payloads are never reloaded.

### Changed

- **Theme-aware restyle**: every literal color replaced with `--dsw-alias-*` semantic tokens (surfaces, borders, labels, success/error/warn states); the dashboard now follows light/dark theme automatically.
- **Responsive layout**: KPI cards, ranking cards, rule cards, and the before/after diff grid reflow on narrow panels.

### Added

- Per-pill live counts and a per-tab record count badge.
- One-click copy buttons on the before/after argument boxes with confirmation feedback.
- Visible-state auto-refresh (15s) keeps relative timestamps current.
- Full accessibility pass: focus-visible rings, `role="tablist"`/`aria-selected` tabs, `aria-expanded` expanders, reduced-motion support.
- Export/clear actions disable while there is nothing to act on.

## [0.1.5] - 2026-02-13

### Fixed

- **Settings panel controls did not respond**: the DSH slot renderer passes a registration's inject face as top-level component props, but `NormalizerSection` read a nonexistent nested `injected` prop. The controller stayed `undefined`, so every optional-chained handler (tab switching, search, filters, simulate/export/clear/refresh buttons) was a silent no-op. The section now accepts `controller`/`t` directly.
- **Analytics rankings rendered as NaN**: `byTool`/`byCategory` were typed and stored as per-key counter objects in the tracker while the store and UI consumed them as plain numbers. Both are now flat `Record<string, number>` totals; the store coerces stale persisted counter shapes from earlier localStorage payloads on load.
- **TypeScript resolution**: added a CSS Module type declaration (`src/client/css-modules.d.ts`) so `tsc --noEmit` passes without editor-only shims; the subscribe cleanup no longer returns the `Set.delete` result.

### Changed

- Rebuilt `lib/client.js` / `lib/index.js` from the fixed sources.

## [0.1.4]

- Full Chinese localization of the dashboard UI and a CSS class scoping regex fix in the build script.

## [0.1.3]

- Modernized high-fidelity statistics dashboard.
