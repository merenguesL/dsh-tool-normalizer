# Changelog

All notable changes to this project are documented in this file.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.5.2] - 2026-09-17

### Fixed

- **`自愈规则与健康度` 页整块样式失效**: `.ruleTag` 的 `font-weight` 缺了取值、分号与收尾 `}`，浏览器遂把其后所有内容折进这条非法声明，从 `.ruleTag` 往后的规则**全部被静默丢弃**——提示词编辑区因此退回浏览器默认宽度、图标与标题竖排堆叠、预览区失去样式。该缺陷自 v0.4.x 起存在，构建与运行均无任何报错。
- **构建期拒绝会被浏览器丢弃的样式**: 新增 `scripts/css-guard.mjs`，在 CSS-module 处理器加载时校验括号配平、规则不得嵌套在声明块内、禁止未终止声明；命中即**构建失败并打印行号**。以 v0.5.1 的样式表回放，守卫准确指认 `line 932: unterminated declaration "font-weight"` 与 `line 925: unclosed block`（`.ruleTag`）。

### Changed

- **看板视觉重做**: 建立单一本地尺度（卡 16 / 内层 12 / 控件 10 / 胶囊 999 圆角，统一边框与间距变量），修正此前的结构性问题——hero 因 `justify-content: space-between` 把副标题挤到操作按钮下方、`保存修改` 按钮误用 `label-primary` 令牌作底色导致禁用态不可读、`guidanceEditorMsg`/`kpiMeterFill` 等既有类从未被渲染、`.healthCard` 的 `border-left` 被简写覆盖。KPI 五卡改为「2+2+整行」布局消除孤格；执行记录卡改为工具徽章 + 状态药丸（此前跟随标题变宽而漂移），参数对比改为真正的双列网格，全部 `⟳ ⤓ ⌫ ▼ ✓ ⧉` 文本字形替换为 16px 描边 SVG 图标；新增窄面板响应式折行与 `prefers-reduced-motion` 支持。
- **失败记录的 After 栏不再自称「正常放行」**: 未做修改的失败调用现显示「（未做修改）」，避免与同卡的失败状态自相矛盾。

## [0.5.1] - 2026-09-17

### Fixed

- **明细日志自 0.5.0 起全线丢失**: `PendingHeal` 新增的 `agent` 字段被 `buildRecord` 展开进记录，而宿主 agent 是含循环引用的活动对象，`appendEvent` 首行的 `JSON.stringify(record)` 必然抛 `Converting circular structure to JSON`。抛出点位于 `enqueue` 与 `scheduleSummary` 之前，异常又被 `tools/result` 观察者的 `try/catch` 静默吞掉——**失败与自愈的明细行再未写入**，该次 summary 写入同时被跳过。健康直通按设计跳过序列化并仍改写 summary，后续直通又会用 `tracker.getAggregate()` 写回含失败数的新快照，因此计数器照常增长、表面毫无异常，故障被完全掩盖。agent 引用现只保留在 `StashedHeal`（token meter 需要它，且该层从不落盘），记录本身不含任何活动引用。
- **`appendEvent` 不再因单条记录报废整体统计**: 序列化改经 `serializeRecordLine`，先按原样序列化，失败时用带 `WeakSet` 的降级 replacer 丢弃循环与函数；即便彻底不可序列化也只跳过该明细行，summary 必定照常写入。
- **Dashboard `/plugin-api/tool-normalizer/stats` 返回空响应**: 计数环里带着 agent 引用，`JSON.stringify(tracker.getSnapshot())` 抛错导致该路由挂掉（`/guidance` 同路径注册正常返回 200，可作对照）。记录不含活动引用后恢复。

### Changed

- **注入模型的高频错误改为真实失败计数**: 原实现把 `byTool`/`byCategory`（**全部**拦截次数，其中绝大多数是成功自愈）当作失败数，向模型宣称 `bash: 13038 failed calls` 之类的前提，且标题写 “in this session” 实为全局累计。新增 `failuresByTool`/`failuresByCategory`（仅在 `status === "failed"` 时累加），诊断文本改读二者，标题改为 “recorded history”。

## [0.5.0] - 2026-09-14

### Added

- **统计迁入 `tools/result` 观察者**: 归一化与自愈仍在 `tools/execute`（预检阶段禁止改写参数），计数与落盘改从冻结终局读取并移出分发热路径；预检/守卫拒绝等 wrapper 见不到的调用首次被诚实计入未修复失败。早于该事件的宿主经 15 秒回收自动降级为内联记录。
- **Top-errors 改走运行时上下文**: 诊断类文本改用 `systemPrompt.context`（旧宿主回退到原 section 槽位）；指导文本仍为 section。
- **明细日志轮转**: JSONL 超 2 MB 时保留最新约 1 MB，启动与每 128 次明细追加各检查一次。

### Changed

- **日志资源占用**: summary 全结局防抖至每秒至多一次落盘；debug 行仅记录失败与自愈；健康直通保持零序列化、零明细行。
- **`edit` 相对路径交还宿主**: 宿主 `edit`/`read`/`write` 本就按会话工作目录解析，只有 `str_replace_editor` 拒收相对路径——路径解析仅保留给后者，跨远端执行世界不再错位，自愈率不再掺水。
- **错误归因优先结构码**: 参数类自愈先认 `INVALID_ARGS` 结构码，再回退消息匹配。

### Fixed

- **Throw 路径记录崩溃**: 两个异常分支仍在读取惰性化前的 `rawArgsStr`（多为 `undefined`，进 `compactPreview` 必抛，恰好吞掉原始异常）；四个记录点现收敛为单一 stash 助手。

## [0.4.7] - 2026-09-14

### Fixed

- **统计分类补齐 `READ_ARGS`，不再丢事件**: `stats-log.ts` 的持久化分类集合遗漏该类别，`read`/`glob`/`grep` 的纠偏事件写入后重启即在恢复时被丢弃。分类集合现由 `tracker.ts` 的 `NORMALIZER_CATEGORIES` 单点派生，新增分类无法再与校验集合漂移。
- **Python `run_code` 跳过 TypeScript 程序修复**: 挂载 Python code runtime 时，内层 description 补全（JS 对象语法拼接）与三类语法修复（`AsyncFunction` 解析）不再触碰 Python 程序体；JS 语法提示亦不再追加到 Python 失败上。参数级归一化（`command`/`description`/Markdown 围栏）不受影响。

### Changed

- **热路径降为健康调用零序列化**: 原参数序列化改为惰性，仅在编辑器比对或诊断记录真正需要时执行；`appendEvent` 改用不拷贝 1000 条记录环的计数快照；无 `tools.` 子串的程序跳过内层扫描。行为与统计口径不变。

## [0.4.1] - 2026-09-04

### Fixed

- Rebuilt artifacts carry the correct `v0.4.1` dashboard version badge (v0.4.0 npm tarball functionally identical, badge text only).

### Added

- Dashboard screenshots (`assets/`, `screenshots.json`) and a story-first README rewrite with measured savings percentages.

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
