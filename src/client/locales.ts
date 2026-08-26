/**
 * Localization strings for tool-normalizer client UI.
 *
 * @module dsh-tool-normalizer/client/locales
 */

export const zh = {
  nav: '工具自愈与统计',
  title: '工具自愈与运行诊断看板',
  subtitle: '实时拦截模型 Tool Call 异常、智能修复参数、透明桥接 Code-Mode 并追踪自愈成效',
  refresh: '刷新数据',
  clear: '清空记录',
  export: '导出诊断报告',
  
  // Tabs
  tabLive: '实时拦截流水',
  tabAnalytics: '根因分布与排行',
  tabRules: '自愈规则与健康度',

  // Hero KPIs
  kpiRate: '自愈成功率',
  kpiRateDesc: '拦截并成功修复的调用占比',
  kpiTotal: '拦截与调用总数',
  kpiTotalDesc: '累计捕获的工具调度事件',
  kpiHealed: '成功自愈次数',
  kpiHealedDesc: '避免了模型报错重试的次数',
  kpiSavedRounds: '预估节省交互轮次',
  kpiSavedRoundsDesc: '有效避免的 Agent 中断与 Token 浪费',
  kpiFailed: '未恢复异常',
  kpiFailedDesc: '底层工具执行本身的业务错误',
  kpiSavedTokens: '预估节省Token',
  kpiSavedTokensDesc: '自愈次数 × 单次重试估算成本（可在插件配置调整）',
  estimateBadge: '估算值',

  // Status Labels
  statusSuccess: '自愈成功',
  statusFailed: '执行失败',
  statusPassthrough: '正常放行',

  // Category Labels
  catInvalidArgs: '参数缺失/错位 (INVALID_ARGS)',
  catUnknownTool: 'Code-Mode 惯性直接调用 (UNKNOWN_TOOL)',
  catRangeClamp: '编辑器边界与相对路径 (RANGE_CLAMP)',
  catCodeWrap: '代码块语法与格式自愈 (CODE_WRAP)',
  catPassthrough: '正常直通 (PASSTHROUGH)',

  // Table & Filters
  filterAll: '全部事件',
  filterHealed: '仅看已自愈',
  filterFailed: '仅看执行失败',
  filterDirect: '仅看直接调用桥接',
  searchPlaceholder: '搜索工具名、错误信息或参数...',
  colTime: '时间',
  colTool: '触发工具',
  colCategory: '异常类型 / 修复机制',
  colStatus: '状态',
  colDetails: '输入参数对比 (Before / After)',
  noData: '暂无工具调用与自愈记录',
  noDataDesc: '当 Agent 在对话中调用工具时，拦截、纠偏与自愈详情将实时呈现在这里。',

  // Diff View
  beforeInput: '原始输入 (Before)',
  afterInput: '自愈修复后 (After)',
  diffDetails: '查看参数差异',
  hideDetails: '收起参数差异',
  errorDetail: '异常报错原因',

  // Analytics View
  toolRankTitle: '高频异常工具排行',
  categoryRankTitle: '异常原因归因占比',
  healthScoreTitle: 'Agent 工具调用健康度评估',
  healthGood: '健康度极佳：大部分异常已被自愈拦截器平滑兜底。',
  healthFair: '健康度良好：存在偶发未捕获错误，建议关注模型 Prompt 规范。',
  healthWarn: '需关注：未恢复异常较多，建议检查沙箱环境或本地依赖。',

  // Rules View
  rule1Title: 'run_code 参数智能自愈 (Schema Auto-Healing)',
  rule1Desc: '自动将模型误传的 command 转换为标准 JavaScript 代码，自动补齐缺失的 description 必填项，自动剥离 Markdown 围栏。',
  rule2Title: 'Code-Mode 透明工具桥接 (Direct-to-CodeMode Bridge)',
  rule2Desc: '当处于 Code-Mode 时，若模型直接调用 read/bash/write/grep，自动将其桥接为 run_code(tools.xxx) 子调用，彻底杜绝 UNKNOWN_TOOL。',
  rule3Title: '编辑器边界与绝对路径收敛 (Range & Path Clamper)',
  rule3Desc: '自动将相对路径转换为基于当前工作区的绝对路径，自动收敛并修正 str_replace_editor 中越界或倒置的行号。',
  rule4Title: '动态极简提示词增强 (Prompt Invariant Injection)',
  rule4Desc: '向系统提示词注入极小体积的最佳实践规范（先读后改、绝对路径使用），从源头减少模型试错。',
  
  statusEnabled: '已启用',
  statusActive: '生效中',
  times: '次',
}

export type NormalizerKey = keyof typeof zh
export const en = zh // Default to Chinese as requested
