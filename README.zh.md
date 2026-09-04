# dsh-tool-normalizer (中文文档)

[![dsh-plugin](https://img.shields.io/badge/dsh--plugin-tools-blue)](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![npm version](https://img.shields.io/npm/v/dsh-tool-normalizer.svg)](https://www.npmjs.com/package/dsh-tool-normalizer)

> DeepSeek Harness (DSH) 工具调用自愈、参数自动归一化、Code-Mode 透明桥接与可视化诊断面板插件。

[English Documentation (README.md)](./README.md)

---

## 📖 前因后果与数据驱动背景

在 DeepSeek Harness 的自主 Agent 循环中，工具调用的鲁棒性直接决定了任务的成功率与流畅度。通过对 **111 个真实持久化会话**（共包含 **11,176 次工具调用**）进行全量统计与诊断，发现共有 **543 次 Tool Call 错误**（整体错误率 **4.86%**，影响了 **53.2%** 的会话）。

深层归因分析揭示了 **四大结构性错误根因**：

1. **`INVALID_ARGS` 参数契约错位 (13.6%, 74 次)**：
   - 模型在调用 `run_code` 时常套用 bash 惯性，传递 `{"command": "..."}` 而非 `{"description": "...", "code": "..."}`。
   - 模型常漏传 `description` 必填字段。
2. **`UNKNOWN_TOOL` Code-Mode 认知惯性冲突 (12.3%, 67 次)**：
   - 当配置启用 Code-Mode 时，系统仅向模型暴露 `run_code` 单一入口。但模型常习惯性直接发起 `read`、`bash`、`write`、`grep` 等独立工具调用，导致直接报 `UNKNOWN_TOOL` 失败。
3. **`CODE_RUN_FAILED` 沙箱内执行异常 (46.8%, 254 次)**：
   - 模型在 JS 模板字符串中嵌套生成复杂多行 shell 脚本或 Python 脚本时，因反引号未转义或换行破裂导致 JS 语法解析失败。
4. **文件系统安全策略门禁 (5.5%, 30 次)**：
   - 未遵循先读后改策略（`FS_NOT_OBSERVED`）、编辑器 `view_range` 行号超界、或者使用了相对路径。

### 线上实际效果（v0.4.0 · 192 会话 / 15,460 次调用）

插件首次生效前（7,182 次调用，错误率 **7.95%**）与生效后（8,289 次调用，错误率 **2.20%**）对比：

- `INVALID_ARGS` 缺描述失败从 74 降到 2（外层 `RUN_CODE_DESC` + 前置 `INNER_DESC` 修复）。
- 以 `CODE_RUN_FAILED` 形式暴露的内层缺 `description` 从 45 降到 0（插件日志中 598 次前置 `INNER_DESC` 成功）。
- `FS_NOT_OBSERVED` 从 10 降到 0（169 次观察后重试成功）。
- `UNKNOWN_TOOL` 减半（71 → 35）但未消除：PTC 折叠调用在 waterfall 之前即被拒绝，任何插件都观测不到；v0.4.0 改为向这类错误追加可直接改写的提示，而不是静默丢弃。
- 残留 `CODE_RUN_FAILED` 语法失败多为安全改写无法猜测的语义错误（把 Python 当 JS 粘贴、调错 API）；v0.4.0 对其追加解析失败提示。

反事实上界：若没有 837 次成功自愈，生效后窗口错误率约为 12.3% 而非 2.20%。节省 Token 累计的是实测避免的重传（token-meter 压力量 × 跳过回环数），非硬编码常量。v0.4.0 起插件自身的嵌套恢复调用不再计入拦截总数，分母仅为面向用户的调用。

---

## 🎯 `dsh-tool-normalizer` 想解决的问题

本插件基于 Cordis 的 `tools/execute` 瀑布流扩展点构建，作为低开销、确定性的前置中间件对模型生成的工具调用进行自动纠偏与自愈，并配套提供 Web UI 诊断与统计看板：

```
       模型发起的 Tool Call
              │
              ▼
   ┌────────────────────────────────────────────────────────┐
   │             dsh-tool-normalizer 插件                   │
   │                                                        │
   │  1. run_code 自动归一化 (command ➔ code, 补全描述)       │
   │  2. 直接调用安全恢复 (保留上下文的嵌套派发)              │
   │  3. 编辑器路径与范围修正 (相对路径、倒置/越界范围)       │
   │  4. 动态精简提示词注入 (按需挂载, 零冗余 Token)          │
   │  5. 实时运行遥测与统计分析追踪器 (Tracker)              │
   └────────────────────────────────────────────────────────┘
              │
              ▼
       尽量恢复可修复错误
              │
              ▼
    [Web UI] 设置面板 ➔ 工具自愈与统计 (实时图表与日志)
```

### 核心功能

- 🛠️ **`run_code` 参数智能自愈**：
  - 自动识别并转换 `{"command": "git status"}` / `{"cmd": "..."}` 为标准的 `run_code` JavaScript 调用。空或非字符串 command 不再自愈为空程序（会静默成功），而是留给宿主大声拒绝。
  - 自动补全缺失或为空的 `description` 字段。
  - 自动剥离误包含的 Markdown 代码块标记（如 ````typescript ... ````）。
  - 仅当内层目标工具的当前 schema 将 `description` 标记为必填时才补全；`read`、`glob`、`grep` 等开放参数工具保持原始参数不变。
- 🌉 **Code-Mode 透明工具桥接**：
  - 当 `UNKNOWN_TOOL` 已经进入 `tools/execute` 且目标工具在当前 Agent 作用域中可见时，插件通过宿主的 `tools.execute()` 重新以嵌套调用派发，保留 Agent、会话、取消信号、上下文和终结状态。可桥接名单覆盖 `bash/read/write/grep/edit/glob/str_replace_editor/job_output/job_kill` 及 `web_fetch/web_search/todo_write/skill/ask_user_question`。
  - 适用范围说明：在 PTC（`code`）折叠模式下，宿主在任何监听器之前拒绝直调，这条路径插件无法仅靠自身拦截；v0.4.0 对这类错误在保留原文的基础上追加一条可直接粘贴的 `run_code` 改写提示。插件也不会直接调用工具定义的 `execute()` 方法。
- 💡 **失败即时提示**（`errorHints`，默认开启）：
  - 对无法恢复的 PTC 直调错误与不可修复的 `run_code` 解析失败，在保留原报错文本的前提下追加一条可操作提示，模型当轮即可纠正。设为 `false` 可保持宿主报错逐字节不变。
- 📐 **编辑器参数与边界纠偏**：
  - 自动将相对路径转换为当前会话工作目录下的绝对路径。
  - 先做结构性范围修正；当 `str_replace_editor` 返回包含文件行数的越界错误时，按真实行数嵌套重试，并保留 `-1` 到文件末尾的语义。
- 🩹 **文件观察后重试**：
  - 在编辑/写入返回 `FS_NOT_OBSERVED` 或 `FS_STALE_VERSION` 后读取目标文件，再通过宿主标准派发重试一次；锚点丢失类错误（`FS_EDIT_NOT_FOUND`、`FS_AMBIGUOUS_EDIT`）绝不盲目重试，仅预读刷新观察态以便模型下次重试不再被额外拦截；正常调用不会预先增加一次读取。
- 📊 **可视化运行与诊断面板 (Web UI)**：
  - 无缝挂载至 DSH 的 **设置面板（`settings.section`）**。
  - 实时呈现核心 KPI 指标：拦截总数、成功纠正数、纠正尝试成功率 %、未恢复错误数。
  - 工具维度与问题类别的可视化分布进度条。
  - 支持按状态（全部 / 仅看纠偏 / 仅看失败）筛选的实时运行流水明细表，直观对比纠偏前后的输入差异。
  - v0.4.0 界面修复：深色主题下选中的筛选 pill 与页签不再是黑底黑字（改为 tint 底 + 品牌色文字）；未修改的正常放行行改用中性色而非成功绿；规则页新增第 6 张卡片说明失败提示。布局与信息架构未变，无需更新截图。

---

## 🧭 UI 页面放置位置与设计考量

**挂载位置**：DeepSeek Harness 设置导航页（`settings.section`，ID 为 `tool-normalizer`，序号 `25`）。

### 选址考量：
1. **符合 DSH 官方架构规范**：在 DeepSeek Harness 的 Web UI 规范中，所有系统监控、用量统计（如 `dsh-usage-atlas`）、模型配置与插件管理均统一收纳于设置抽屉（Settings Panel）内。
2. **保持主对话界面纯净**：将诊断与统计收纳于设置页，既不干扰 Agent 主对话流与工作区画布，又可通过侧边栏左下角齿轮图标一键直达。
3. **运维与排障一体化**：开发者可在同一设置视窗内完成模型切换、插件开关以及工具自愈率观察。

---

## 🚀 安装与快速上手

在 DeepSeek Harness 中，插件是按 **组合 Profile**（如 `web`, `headless`, `tui` 等）进行隔离与依赖管理的。

### 第一步：安装插件至目标 Profile

使用全局 `dsh` 命令（或在源码仓库下使用 `pnpm dsh`）：

```sh
# 1. 安装至 Web UI 模式（含设置面板可视化看板）
dsh plugin --profile web add dsh-tool-normalizer
# （若在 deepseek-harness 源码仓库下开发调试）
pnpm dsh plugin --profile web add dsh-tool-normalizer

# 2. 安装至 Headless 自动化模式
dsh plugin --profile headless add dsh-tool-normalizer

# 3. 安装至 TUI 终端交互模式
dsh plugin --profile tui add dsh-tool-normalizer
```

#### 本地开发模式链接（可选）
如果你正在本地修改或测试插件源码：
```sh
pnpm dsh plugin --profile web add ./plugins/dsh-tool-normalizer
```

### 第二步：启动并查看效果

```sh
# 启动 Web 界面
dsh web
# （或源码启动）
pnpm dsh web
```

打开浏览器进入 Harness 界面，点击左下角 **设置 (⚙️)** ➔ **「工具自愈与统计」**，即可实时查看所有工具调用拦截流水、纠偏统计与成功率图表！

---

## ⚙️ 配置项说明

你可以在工作区的 `cordis.patch.yml` 中自定义插件的运行参数：

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
        errorHints: true
        persistPassthrough: false
```

| 配置字段 | 类型 | 默认值 | 作用说明 |
| :--- | :---: | :---: | :--- |
| `autoWrapRunCode` | `boolean` | `true` | 自动转换 `command` 属性为 `code`，自动补全描述，剥离 Markdown 标记 |
| `autoBridgeDirectTools` | `boolean` | `true` | 仅对已进入 `tools/execute` 的 `UNKNOWN_TOOL` 结果尝试安全嵌套恢复；宿主提前拒绝的调用插件无法拦截 |
| `autoObserveFiles` | `boolean` | `true` | 仅在收到 `FS_NOT_OBSERVED` 后读取目标并重试一次编辑/写入 |
| `autoClampRanges` | `boolean` | `true` | 修正编辑器范围并将相对路径转为当前会话目录下的绝对路径 |
| `injectPrompt` | `boolean` | `true` | 动态向 `systemPrompt` 注册极简工具最佳实践提示词（静态文本，不影响前缀缓存命中） |
| `errorHints` | `boolean` | `true` | 对不可恢复的 PTC/语法错误追加一条可操作提示，原报错文本完整保留 |
| `persistPassthrough` | `boolean` | `false` | 是否将未修改且成功的正常放行调用逐条写入 JSONL；默认仅保留聚合计数，失败和自愈事件仍保留明细 |

成功率只计算实际发生修复/恢复尝试的调用：`healedSuccess / (healedSuccess + healedFailed)`。前置规范化改对、但终错属于另一失败类别时，记为无关的未修复失败而非修复失败，成功率才反映真实修复能力。正常成功放行不会进入详细 JSONL，以避免日志被高频健康调用淹没；其计数写入同目录的 `tool-normalizer-summary.json`。

"预估节省 Token"KPI 为每次成功自愈累计的**实测**输入 token：每次修复记为「跳过的模型回环数 × token-meter 请求压力量」（即再多一次请求需重新提交的整段提示词）。它依赖组合中的 `@deepseek-ai/dsh-token-meter`；未挂载时该统计保持为 `0`，不再使用硬编码的单次重试成本。

流水明细对长参数只保留首尾预览，并额外显示实际修改的字段或恢复路径，避免新增字段位于截断区域时看起来没有变化。

---

## 📦 发版与发布指南 (Release & Publishing)

### 方式一：基于 GitHub Actions 自动化发版（推荐）

1. 在 GitHub 仓库设置中配置 npm Token：
   - 进入 **GitHub 仓库 Settings ➔ Secrets and variables ➔ Actions ➔ New repository secret**。
   - Secret 名称：`NPM_TOKEN`，值为开启了 2FA Bypass 权限的 npm Token。
2. 升级版本号并推送 Tag：
   ```sh
   # 升级小版本（patch / minor / major）
   npm version patch

   # 推送分支与 Tags 到 GitHub
   git push origin main --tags
   ```
3. 在 GitHub 页面基于新推送的 Tag 发布 Release，GitHub Actions 流程（`.github/workflows/publish.yml`）将自动运行全套测试、打包并将新版本发布至 npm 官方镜像源！

### 方式二：本地手动发布到 npm

```sh
# 1. 执行全量测试与打包编译检查
npm run check

# 2. 登录 npm 账号（若未登录）
npm login

# 3. 执行发布
npm publish --access public
```

---

## 🧪 单元测试与验证

```sh
# 运行单元测试
pnpm test

# 运行测试并打包产物
pnpm run check
```

---

## 📄 开源许可

MIT © [merenguesL](https://github.com/merenguesL)
