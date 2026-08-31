/**
 * Localization strings for tool-normalizer client UI.
 *
 * @module dsh-tool-normalizer/client/locales
 */

export const zh = {
 nav: "工具自愈与统计",
 title: "工具自愈与运行诊断看板",
 subtitle: "实时诊断 Tool Call 异常、保留宿主上下文恢复调用并追踪修复成效",
 refresh: "刷新数据",
 clear: "清空记录",
 export: "导出诊断报告",

 // Tabs
 tabLive: "实时拦截流水",
 tabAnalytics: "根因分布与排行",
 tabRules: "自愈规则与健康度",

 // Hero KPIs
 kpiRate: "自愈成功率",
 kpiRateDesc: "拦截并成功修复的调用占比",
 kpiTotal: "拦截与调用总数",
 kpiTotalDesc: "累计捕获的工具调度事件",
 kpiHealed: "成功自愈次数",
 kpiHealedDesc: "避免了模型报错重试的次数",
 kpiSavedRounds: "预估节省交互轮次",
 kpiSavedRoundsDesc: "有效避免的 Agent 中断与 Token 浪费",
 kpiFailed: "未恢复异常",
 kpiFailedDesc: "自愈失败与未修改调用的底层错误",
 kpiSavedTokens: "预估节省Token",
 kpiSavedTokensDesc:
  "按 token-meter 实测请求压力量 × 跳过模型回环数累计（未挂载则为 0）",
 estimateBadge: "估算值",

 // Status Labels
 statusSuccess: "自愈成功",
 statusFailed: "执行失败",
 statusPassthrough: "正常放行",

 // Category Labels
 catInvalidArgs: "参数缺失/错位 (INVALID_ARGS)",
 catUnknownTool: "未知工具安全恢复 (UNKNOWN_TOOL)",
 catRangeClamp: "编辑器范围与会话路径 (RANGE_CLAMP)",
 catCodeWrap: "代码围栏清理 (CODE_WRAP)",
 catRunCodeDesc: "run_code 描述补全 (RUN_CODE_DESC)",
 catRunCodeSyntax: "run_code 语法自愈 (RUN_CODE_SYNTAX)",
 catInnerDesc: "内层调用补全描述 (INNER_DESC)",
 catFsObserved: "文件观察后重试 (FS_OBSERVED)",
 catPassthrough: "正常直通 (PASSTHROUGH)",

 // Table & Filters
 filterAll: "全部事件",
 filterHealed: "仅看已自愈",
 filterFailed: "仅看执行失败",
 filterDirect: "仅看直接调用桥接",
 searchPlaceholder: "搜索工具名、错误信息或参数...",
 colTime: "时间",
 colTool: "触发工具",
 colCategory: "异常类型 / 修复机制",
 colStatus: "状态",
 colDetails: "输入参数对比 (Before / After)",
 noData: "暂无工具调用与自愈记录",
 noDataDesc:
  "当 Agent 在对话中调用工具时，拦截、纠偏与自愈详情将实时呈现在这里。",

 // Diff View
 beforeInput: "原始输入预览 (Before)",
 afterInput: "修复后输入预览 (After)",
 changeSummary: "实际变更",
 diffDetails: "查看参数差异",
 hideDetails: "收起参数差异",
 errorDetail: "异常报错原因",

 // Analytics View
 toolRankTitle: "高频异常工具排行",
 categoryRankTitle: "事件类别与修复方式",
 healthScoreTitle: "Agent 工具调用健康度评估",
 healthGood: "健康度极佳：大部分异常已被自愈拦截器平滑兜底。",
 healthFair: "健康度良好：存在偶发未捕获错误，建议关注模型 Prompt 规范。",
 healthWarn: "需关注：未恢复异常较多，建议检查沙箱环境或本地依赖。",

 // Rules View
 rule1Title: "run_code 参数智能自愈 (Schema Auto-Healing)",
 rule1Desc:
  "自动将模型误传的 command 转换为标准 JavaScript 代码，自动补齐缺失的 description 必填项，自动剥离 Markdown 围栏。",
 rule2Title: "Code-Mode 透明工具桥接 (Direct-to-CodeMode Bridge)",
 rule2Desc:
  "仅对已经进入 tools/execute 的 UNKNOWN_TOOL 结果尝试保留上下文的嵌套派发；宿主提前拒绝的直调无法由插件拦截。",
 rule3Title: "编辑器范围与会话路径修正 (Range & Path Normalizer)",
 rule3Desc:
  "按当前会话工作目录修正相对路径，修正倒置范围，并在错误提供真实行数时安全重试越界 view_range。",
 rule4Title: "文件观察后重试 (Observe-then-Retry)",
 rule4Desc:
  "仅在编辑或写入收到 FS_NOT_OBSERVED 后读取目标，再通过宿主标准派发重试一次，避免无条件增加读取调用。",
 rule5Title: "动态极简提示词增强 (Prompt Invariant Injection)",
 rule5Desc:
  "向系统提示词注入极小体积的最佳实践规范（先读后改、绝对路径使用），从源头减少模型试错。",

 statusEnabled: "已启用",
 statusActive: "生效中",
 times: "次",
};

export type NormalizerKey = keyof typeof zh;
export const en = zh; // Default to Chinese as requested
