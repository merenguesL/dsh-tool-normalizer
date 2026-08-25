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

---

## 🎯 `dsh-tool-normalizer` 想解决的问题

本插件基于 Cordis 的 `tools/execute` 瀑布流扩展点构建，作为零开销、确定性的前置中间件对模型生成的工具调用进行自动纠偏与自愈，并配套提供完整的 Web UI 诊断与统计看板：

```
       模型发起的 Tool Call
              │
              ▼
   ┌────────────────────────────────────────────────────────┐
   │             dsh-tool-normalizer 插件                   │
   │                                                        │
   │  1. run_code 自动归一化 (command ➔ code, 补全描述)       │
   │  2. 直接调用透明桥接 (read/bash ➔ run_code 子调用)       │
   │  3. 编辑器越界与路径修剪 (相对路径 ➔ 绝对路径, 范围收敛) │
   │  4. 动态精简提示词注入 (按需挂载, 零冗余 Token)          │
   │  5. 实时运行遥测与统计分析追踪器 (Tracker)              │
   └────────────────────────────────────────────────────────┘
              │
              ▼
       执行成功 (0 报错阻断)
              │
              ▼
    [Web UI] 设置面板 ➔ 工具自愈与统计 (实时图表与日志)
```

### 核心功能

- 🛠️ **`run_code` 参数智能自愈**：
  - 自动识别并转换 `{"command": "git status"}` / `{"cmd": "..."}` 为标准的 `run_code` JavaScript 调用。
  - 自动补全缺失或为空的 `description` 字段。
  - 自动剥离误包含的 Markdown 代码块标记（如 ````typescript ... ````）。
- 🌉 **Code-Mode 透明工具桥接**：
  - 当 Agent 处于 Code-Mode 时，若模型直接调用了 `bash`、`read`、`write`、`grep`、`edit` 或 `glob`，插件自动在后台将其包装为 `run_code` 子分发执行并回传结果，不再抛出 `UNKNOWN_TOOL`。
- 📐 **编辑器参数与边界纠偏**：
  - 自动将相对路径转换为基于当前工作区的绝对路径。
  - 自动收敛 `str_replace_editor` 中越界或倒置的 `view_range` 行号范围。
- 📊 **可视化运行与诊断面板 (Web UI)**：
  - 无缝挂载至 DSH 的 **设置面板（`settings.section`）**。
  - 实时呈现核心 KPI 指标：拦截总数、成功纠正数、纠正成功率 %、未恢复错误数。
  - 工具维度与问题类别的可视化分布进度条。
  - 支持按状态（全部 / 仅看纠偏 / 仅看失败）筛选的实时运行流水明细表，直观对比纠偏前后的输入差异。

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
        autoClampRanges: true
        injectPrompt: true
```

| 配置字段 | 类型 | 默认值 | 作用说明 |
| :--- | :---: | :---: | :--- |
| `autoWrapRunCode` | `boolean` | `true` | 自动转换 `command` 属性为 `code`，自动补全描述，剥离 Markdown 标记 |
| `autoBridgeDirectTools` | `boolean` | `true` | 在 Code-Mode 下自动将直接工具调用桥接为 `run_code` 执行 |
| `autoClampRanges` | `boolean` | `true` | 自动收敛编辑器的 `view_range` 并将相对路径转为绝对路径 |
| `injectPrompt` | `boolean` | `true` | 动态向 `systemPrompt` 注册极简工具最佳实践提示词 |

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
