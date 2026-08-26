window.__ModuleLoader__.load({ id: "dsh-tool-normalizer", factory: (require) => { var module = { exports: {} }; var exports = module.exports;
"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/client/index.ts
var index_exports = {};
__export(index_exports, {
  apply: () => apply,
  default: () => index_default,
  inject: () => inject
});
module.exports = __toCommonJS(index_exports);

// src/client/NormalizerSection.tsx
var import_react = require("react");

// src/client/locales.ts
var zh = {
  nav: "\u5DE5\u5177\u81EA\u6108\u4E0E\u7EDF\u8BA1",
  title: "\u5DE5\u5177\u81EA\u6108\u4E0E\u8FD0\u884C\u8BCA\u65AD\u770B\u677F",
  subtitle: "\u5B9E\u65F6\u62E6\u622A\u6A21\u578B Tool Call \u5F02\u5E38\u3001\u667A\u80FD\u4FEE\u590D\u53C2\u6570\u3001\u900F\u660E\u6865\u63A5 Code-Mode \u5E76\u8FFD\u8E2A\u81EA\u6108\u6210\u6548",
  refresh: "\u5237\u65B0\u6570\u636E",
  clear: "\u6E05\u7A7A\u8BB0\u5F55",
  export: "\u5BFC\u51FA\u8BCA\u65AD\u62A5\u544A",
  // Tabs
  tabLive: "\u5B9E\u65F6\u62E6\u622A\u6D41\u6C34",
  tabAnalytics: "\u6839\u56E0\u5206\u5E03\u4E0E\u6392\u884C",
  tabRules: "\u81EA\u6108\u89C4\u5219\u4E0E\u5065\u5EB7\u5EA6",
  // Hero KPIs
  kpiRate: "\u81EA\u6108\u6210\u529F\u7387",
  kpiRateDesc: "\u62E6\u622A\u5E76\u6210\u529F\u4FEE\u590D\u7684\u8C03\u7528\u5360\u6BD4",
  kpiTotal: "\u62E6\u622A\u4E0E\u8C03\u7528\u603B\u6570",
  kpiTotalDesc: "\u7D2F\u8BA1\u6355\u83B7\u7684\u5DE5\u5177\u8C03\u5EA6\u4E8B\u4EF6",
  kpiHealed: "\u6210\u529F\u81EA\u6108\u6B21\u6570",
  kpiHealedDesc: "\u907F\u514D\u4E86\u6A21\u578B\u62A5\u9519\u91CD\u8BD5\u7684\u6B21\u6570",
  kpiSavedRounds: "\u9884\u4F30\u8282\u7701\u4EA4\u4E92\u8F6E\u6B21",
  kpiSavedRoundsDesc: "\u6709\u6548\u907F\u514D\u7684 Agent \u4E2D\u65AD\u4E0E Token \u6D6A\u8D39",
  kpiFailed: "\u672A\u6062\u590D\u5F02\u5E38",
  kpiFailedDesc: "\u5E95\u5C42\u5DE5\u5177\u6267\u884C\u672C\u8EAB\u7684\u4E1A\u52A1\u9519\u8BEF",
  kpiSavedTokens: "\u9884\u4F30\u8282\u7701Token",
  kpiSavedTokensDesc: "\u81EA\u6108\u6B21\u6570 \xD7 \u5355\u6B21\u91CD\u8BD5\u4F30\u7B97\u6210\u672C\uFF08\u53EF\u5728\u63D2\u4EF6\u914D\u7F6E\u8C03\u6574\uFF09",
  estimateBadge: "\u4F30\u7B97\u503C",
  // Status Labels
  statusSuccess: "\u81EA\u6108\u6210\u529F",
  statusFailed: "\u6267\u884C\u5931\u8D25",
  statusPassthrough: "\u6B63\u5E38\u653E\u884C",
  // Category Labels
  catInvalidArgs: "\u53C2\u6570\u7F3A\u5931/\u9519\u4F4D (INVALID_ARGS)",
  catUnknownTool: "Code-Mode \u60EF\u6027\u76F4\u63A5\u8C03\u7528 (UNKNOWN_TOOL)",
  catRangeClamp: "\u7F16\u8F91\u5668\u8FB9\u754C\u4E0E\u76F8\u5BF9\u8DEF\u5F84 (RANGE_CLAMP)",
  catCodeWrap: "\u4EE3\u7801\u5757\u8BED\u6CD5\u4E0E\u683C\u5F0F\u81EA\u6108 (CODE_WRAP)",
  catPassthrough: "\u6B63\u5E38\u76F4\u901A (PASSTHROUGH)",
  // Table & Filters
  filterAll: "\u5168\u90E8\u4E8B\u4EF6",
  filterHealed: "\u4EC5\u770B\u5DF2\u81EA\u6108",
  filterFailed: "\u4EC5\u770B\u6267\u884C\u5931\u8D25",
  filterDirect: "\u4EC5\u770B\u76F4\u63A5\u8C03\u7528\u6865\u63A5",
  searchPlaceholder: "\u641C\u7D22\u5DE5\u5177\u540D\u3001\u9519\u8BEF\u4FE1\u606F\u6216\u53C2\u6570...",
  colTime: "\u65F6\u95F4",
  colTool: "\u89E6\u53D1\u5DE5\u5177",
  colCategory: "\u5F02\u5E38\u7C7B\u578B / \u4FEE\u590D\u673A\u5236",
  colStatus: "\u72B6\u6001",
  colDetails: "\u8F93\u5165\u53C2\u6570\u5BF9\u6BD4 (Before / After)",
  noData: "\u6682\u65E0\u5DE5\u5177\u8C03\u7528\u4E0E\u81EA\u6108\u8BB0\u5F55",
  noDataDesc: "\u5F53 Agent \u5728\u5BF9\u8BDD\u4E2D\u8C03\u7528\u5DE5\u5177\u65F6\uFF0C\u62E6\u622A\u3001\u7EA0\u504F\u4E0E\u81EA\u6108\u8BE6\u60C5\u5C06\u5B9E\u65F6\u5448\u73B0\u5728\u8FD9\u91CC\u3002",
  // Diff View
  beforeInput: "\u539F\u59CB\u8F93\u5165 (Before)",
  afterInput: "\u81EA\u6108\u4FEE\u590D\u540E (After)",
  diffDetails: "\u67E5\u770B\u53C2\u6570\u5DEE\u5F02",
  hideDetails: "\u6536\u8D77\u53C2\u6570\u5DEE\u5F02",
  errorDetail: "\u5F02\u5E38\u62A5\u9519\u539F\u56E0",
  // Analytics View
  toolRankTitle: "\u9AD8\u9891\u5F02\u5E38\u5DE5\u5177\u6392\u884C",
  categoryRankTitle: "\u5F02\u5E38\u539F\u56E0\u5F52\u56E0\u5360\u6BD4",
  healthScoreTitle: "Agent \u5DE5\u5177\u8C03\u7528\u5065\u5EB7\u5EA6\u8BC4\u4F30",
  healthGood: "\u5065\u5EB7\u5EA6\u6781\u4F73\uFF1A\u5927\u90E8\u5206\u5F02\u5E38\u5DF2\u88AB\u81EA\u6108\u62E6\u622A\u5668\u5E73\u6ED1\u515C\u5E95\u3002",
  healthFair: "\u5065\u5EB7\u5EA6\u826F\u597D\uFF1A\u5B58\u5728\u5076\u53D1\u672A\u6355\u83B7\u9519\u8BEF\uFF0C\u5EFA\u8BAE\u5173\u6CE8\u6A21\u578B Prompt \u89C4\u8303\u3002",
  healthWarn: "\u9700\u5173\u6CE8\uFF1A\u672A\u6062\u590D\u5F02\u5E38\u8F83\u591A\uFF0C\u5EFA\u8BAE\u68C0\u67E5\u6C99\u7BB1\u73AF\u5883\u6216\u672C\u5730\u4F9D\u8D56\u3002",
  // Rules View
  rule1Title: "run_code \u53C2\u6570\u667A\u80FD\u81EA\u6108 (Schema Auto-Healing)",
  rule1Desc: "\u81EA\u52A8\u5C06\u6A21\u578B\u8BEF\u4F20\u7684 command \u8F6C\u6362\u4E3A\u6807\u51C6 JavaScript \u4EE3\u7801\uFF0C\u81EA\u52A8\u8865\u9F50\u7F3A\u5931\u7684 description \u5FC5\u586B\u9879\uFF0C\u81EA\u52A8\u5265\u79BB Markdown \u56F4\u680F\u3002",
  rule2Title: "Code-Mode \u900F\u660E\u5DE5\u5177\u6865\u63A5 (Direct-to-CodeMode Bridge)",
  rule2Desc: "\u5F53\u5904\u4E8E Code-Mode \u65F6\uFF0C\u82E5\u6A21\u578B\u76F4\u63A5\u8C03\u7528 read/bash/write/grep\uFF0C\u81EA\u52A8\u5C06\u5176\u6865\u63A5\u4E3A run_code(tools.xxx) \u5B50\u8C03\u7528\uFF0C\u5F7B\u5E95\u675C\u7EDD UNKNOWN_TOOL\u3002",
  rule3Title: "\u7F16\u8F91\u5668\u8FB9\u754C\u4E0E\u7EDD\u5BF9\u8DEF\u5F84\u6536\u655B (Range & Path Clamper)",
  rule3Desc: "\u81EA\u52A8\u5C06\u76F8\u5BF9\u8DEF\u5F84\u8F6C\u6362\u4E3A\u57FA\u4E8E\u5F53\u524D\u5DE5\u4F5C\u533A\u7684\u7EDD\u5BF9\u8DEF\u5F84\uFF0C\u81EA\u52A8\u6536\u655B\u5E76\u4FEE\u6B63 str_replace_editor \u4E2D\u8D8A\u754C\u6216\u5012\u7F6E\u7684\u884C\u53F7\u3002",
  rule4Title: "\u52A8\u6001\u6781\u7B80\u63D0\u793A\u8BCD\u589E\u5F3A (Prompt Invariant Injection)",
  rule4Desc: "\u5411\u7CFB\u7EDF\u63D0\u793A\u8BCD\u6CE8\u5165\u6781\u5C0F\u4F53\u79EF\u7684\u6700\u4F73\u5B9E\u8DF5\u89C4\u8303\uFF08\u5148\u8BFB\u540E\u6539\u3001\u7EDD\u5BF9\u8DEF\u5F84\u4F7F\u7528\uFF09\uFF0C\u4ECE\u6E90\u5934\u51CF\u5C11\u6A21\u578B\u8BD5\u9519\u3002",
  statusEnabled: "\u5DF2\u542F\u7528",
  statusActive: "\u751F\u6548\u4E2D",
  times: "\u6B21"
};

// src/client/NormalizerSection.module.css
var css = "/* Tool-normalizer dashboard. Semantic --dsw-alias-* tokens only; light and\n   dark themes resolve through the shared ui-theme sheets. */\n\n.dsh_tn_container {\n  display: flex;\n  flex-direction: column;\n  gap: 16px;\n  max-width: 960px;\n}\n\n/* ---- Header ---- */\n\n.dsh_tn_header {\n  display: flex;\n  align-items: flex-end;\n  justify-content: space-between;\n  gap: 16px;\n  flex-wrap: wrap;\n}\n\n.dsh_tn_titleGroup {\n  min-width: 240px;\n}\n\n.dsh_tn_titleRow {\n  display: flex;\n  align-items: center;\n  gap: 8px;\n}\n\n.dsh_tn_versionBadge {\n  padding: 1px 8px;\n  border: 1px solid var(--dsw-alias-border-l3);\n  border-radius: 999px;\n  background: var(--dsw-alias-bg-layer-3);\n  color: var(--dsw-alias-label-tertiary);\n  font-size: 11px;\n  line-height: 1.6;\n  font-variant-numeric: tabular-nums;\n  white-space: nowrap;\n}\n\n.dsh_tn_title {\n  margin: 0;\n  font-size: var(--dsw-static-font-size-2xl, 20px);\n  line-height: 1.3;\n  font-weight: 600;\n  color: var(--dsw-alias-label-primary);\n}\n\n.dsh_tn_subtitle {\n  margin: 4px 0 0;\n  font-size: 13px;\n  line-height: 1.5;\n  color: var(--dsw-alias-label-tertiary);\n}\n\n.dsh_tn_headerActions {\n  display: flex;\n  gap: 8px;\n  flex-wrap: wrap;\n}\n\n.dsh_tn_btnIcon {\n  font-size: 14px;\n  line-height: 1;\n}\n\n.dsh_tn_btnGhost,\n.dsh_tn_btnDanger {\n  display: inline-flex;\n  align-items: center;\n  gap: 6px;\n  padding: 6px 12px;\n  border: 1px solid var(--dsw-alias-border-l2);\n  border-radius: 8px;\n  background: transparent;\n  color: var(--dsw-alias-label-secondary);\n  font-size: 13px;\n  line-height: 1.4;\n  cursor: pointer;\n  transition: background-color 120ms ease, color 120ms ease, border-color 120ms ease;\n}\n\n.dsh_tn_btnGhost:hover {\n  background: var(--dsw-alias-interactive-bg-hover);\n  color: var(--dsw-alias-label-primary);\n}\n\n.dsh_tn_btnDanger:hover {\n  background: var(--dsw-alias-interactive-bg-hover-danger);\n  color: var(--dsw-alias-state-error-primary);\n  border-color: var(--dsw-alias-state-error-primary);\n}\n\n.dsh_tn_btnGhost:disabled,\n.dsh_tn_btnDanger:disabled {\n  opacity: 0.45;\n  cursor: not-allowed;\n}\n\n.dsh_tn_btnGhost:focus-visible,\n.dsh_tn_btnDanger:focus-visible,\n.dsh_tn_pill:focus-visible,\n.dsh_tn_tabItem:focus-visible,\n.dsh_tn_expandBtn:focus-visible,\n.dsh_tn_copyBtn:focus-visible,\n.dsh_tn_searchInput:focus-visible {\n  outline: 2px solid var(--dsw-alias-brand-primary);\n  outline-offset: 1px;\n}\n\n@media (prefers-reduced-motion: reduce) {\n  .dsh_tn_btnGhost, .dsh_tn_btnDanger, .dsh_tn_pill, .dsh_tn_tabItem { transition: none; }\n}\n\n/* ---- KPI cards ---- */\n\n.dsh_tn_kpiGrid {\n  display: grid;\n  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));\n  gap: 12px;\n}\n\n.dsh_tn_kpiCard {\n  display: flex;\n  flex-direction: column;\n  gap: 4px;\n  padding: 14px 16px;\n  border: 1px solid var(--dsw-alias-border-l2);\n  border-radius: 12px;\n  background: var(--dsw-alias-bg-layer-2);\n}\n\n.dsh_tn_kpiTitle {\n  display: flex;\n  align-items: center;\n  gap: 6px;\n  font-size: 12px;\n  color: var(--dsw-alias-label-tertiary);\n}\n\n.dsh_tn_estimateBadge {\n  padding: 0 6px;\n  border-radius: 999px;\n  border: 1px solid var(--dsw-alias-border-l3);\n  background: var(--dsw-alias-bg-layer-3);\n  color: var(--dsw-alias-label-dimmed);\n  font-size: 10px;\n  line-height: 1.5;\n}\n\n.dsh_tn_kpiValue {\n  font-size: 26px;\n  font-weight: 600;\n  line-height: 1.2;\n  color: var(--dsw-alias-label-primary);\n  font-variant-numeric: tabular-nums;\n}\n\n.dsh_tn_kpiValueAccent { color: var(--dsw-alias-brand-primary); }\n.dsh_tn_kpiValueSuccess { color: var(--dsw-alias-state-success-primary); }\n.dsh_tn_kpiValueDanger { color: var(--dsw-alias-state-error-primary); }\n\n.dsh_tn_kpiDesc {\n  font-size: 12px;\n  color: var(--dsw-alias-label-dimmed);\n}\n\n/* ---- Tabs ---- */\n\n.dsh_tn_tabsBar {\n  display: flex;\n  gap: 4px;\n  border-bottom: 1px solid var(--dsw-alias-border-l2);\n}\n\n.dsh_tn_tabItem {\n  display: inline-flex;\n  align-items: center;\n  gap: 6px;\n  padding: 8px 14px;\n  border: none;\n  border-bottom: 2px solid transparent;\n  background: none;\n  color: var(--dsw-alias-label-secondary);\n  font-size: 13px;\n  cursor: pointer;\n  transition: color 120ms ease, border-color 120ms ease;\n}\n\n.dsh_tn_tabItem:hover { color: var(--dsw-alias-label-primary); }\n\n.dsh_tn_tabActive {\n  color: var(--dsw-alias-brand-primary);\n  border-bottom-color: var(--dsw-alias-brand-primary);\n  font-weight: 500;\n}\n\n.dsh_tn_tabCount {\n  min-width: 18px;\n  padding: 0 5px;\n  border-radius: 999px;\n  background: var(--dsw-alias-bg-layer-3);\n  font-size: 11px;\n  text-align: center;\n  color: var(--dsw-alias-label-tertiary);\n}\n\n.dsh_tn_tabActive .dsh_tn_tabCount {\n  background: var(--dsw-alias-brand-primary);\n  color: var(--dsw-alias-brand-text, var(--dsw-alias-bg-layer-1));\n}\n\n/* ---- Live pane ---- */\n\n.dsh_tn_toolbar {\n  display: flex;\n  gap: 10px;\n  align-items: center;\n  flex-wrap: wrap;\n}\n\n.dsh_tn_searchInput {\n  flex: 1 1 220px;\n  min-width: 160px;\n  padding: 7px 12px;\n  border: 1px solid var(--dsw-alias-border-l2);\n  border-radius: 8px;\n  background: var(--dsw-alias-bg-layer-2);\n  color: var(--dsw-alias-label-primary);\n  font-size: 13px;\n}\n\n.dsh_tn_searchInput::placeholder { color: var(--dsw-alias-label-dimmed); }\n\n.dsh_tn_pills {\n  display: flex;\n  gap: 6px;\n  flex-wrap: wrap;\n}\n\n.dsh_tn_pill {\n  display: inline-flex;\n  align-items: center;\n  gap: 5px;\n  padding: 4px 10px;\n  border: 1px solid var(--dsw-alias-border-l2);\n  border-radius: 999px;\n  background: transparent;\n  color: var(--dsw-alias-label-secondary);\n  font-size: 12px;\n  cursor: pointer;\n  transition: background-color 120ms ease, color 120ms ease;\n}\n\n.dsh_tn_pill:hover { background: var(--dsw-alias-interactive-bg-hover); }\n\n.dsh_tn_pillActive {\n  background: var(--dsw-alias-brand-primary);\n  border-color: var(--dsw-alias-brand-primary);\n  color: var(--dsw-alias-brand-text, var(--dsw-alias-bg-layer-1));\n}\n\n.dsh_tn_countBadge {\n  font-size: 11px;\n  font-variant-numeric: tabular-nums;\n  opacity: 0.75;\n}\n\n.dsh_tn_traceList {\n  list-style: none;\n  margin: 0;\n  padding: 0;\n  display: flex;\n  flex-direction: column;\n  gap: 8px;\n}\n\n.dsh_tn_traceCard {\n  border: 1px solid var(--dsw-alias-border-l2);\n  border-radius: 10px;\n  background: var(--dsw-alias-bg-layer-2);\n  overflow: hidden;\n}\n\n.dsh_tn_traceHeader {\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  gap: 10px;\n  flex-wrap: wrap;\n  padding: 10px 14px;\n}\n\n.dsh_tn_traceMeta {\n  display: flex;\n  align-items: center;\n  gap: 8px;\n  flex-wrap: wrap;\n  min-width: 0;\n}\n\n.dsh_tn_traceSide {\n  display: flex;\n  align-items: center;\n  gap: 10px;\n  flex-shrink: 0;\n}\n\n.dsh_tn_badgeTool {\n  padding: 2px 8px;\n  border-radius: 6px;\n  background: var(--dsw-alias-markdown-inline-code);\n  font-family: ui-monospace, 'SF Mono', 'Cascadia Mono', Consolas, monospace;\n  font-size: 12px;\n  color: var(--dsw-alias-label-primary);\n}\n\n.dsh_tn_badgeCategory {\n  padding: 2px 8px;\n  border-radius: 6px;\n  border: 1px solid var(--dsw-alias-border-l3);\n  font-size: 12px;\n  color: var(--dsw-alias-label-secondary);\n}\n\n.dsh_tn_statusDot {\n  width: 7px;\n  height: 7px;\n  border-radius: 50%;\n  flex-shrink: 0;\n}\n\n.dsh_tn_statusDotOk { background: var(--dsw-alias-state-success-primary); }\n.dsh_tn_statusDotFail { background: var(--dsw-alias-state-error-primary); }\n.dsh_tn_statusDotPass { background: var(--dsw-alias-label-dimmed); }\n\n.dsh_tn_statusText {\n  font-size: 12px;\n  color: var(--dsw-alias-state-success-primary);\n}\n\n.dsh_tn_statusTextFail { color: var(--dsw-alias-state-error-primary); }\n\n.dsh_tn_timeText {\n  font-size: 12px;\n  color: var(--dsw-alias-label-dimmed);\n  font-variant-numeric: tabular-nums;\n}\n\n.dsh_tn_expandBtn {\n  padding: 3px 8px;\n  border: 1px solid var(--dsw-alias-border-l2);\n  border-radius: 6px;\n  background: transparent;\n  color: var(--dsw-alias-label-secondary);\n  font-size: 12px;\n  cursor: pointer;\n}\n\n.dsh_tn_expandBtn:hover {\n  background: var(--dsw-alias-interactive-bg-hover);\n  color: var(--dsw-alias-label-primary);\n}\n\n.dsh_tn_diffGrid {\n  display: grid;\n  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));\n  gap: 10px;\n  padding: 0 14px 12px;\n}\n\n.dsh_tn_errorBlock {\n  grid-column: 1 / -1;\n  display: flex;\n  flex-direction: column;\n  gap: 4px;\n}\n\n.dsh_tn_diffBlock {\n  display: flex;\n  flex-direction: column;\n  gap: 4px;\n  min-width: 0;\n}\n\n.dsh_tn_diffLabelRow {\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n}\n\n.dsh_tn_diffLabel {\n  font-size: 11px;\n  font-weight: 600;\n  letter-spacing: 0.02em;\n}\n\n.dsh_tn_diffLabelBefore { color: var(--dsw-alias-state-warn-primary); }\n.dsh_tn_diffLabelAfter { color: var(--dsw-alias-state-success-primary); }\n\n.dsh_tn_copyBtn {\n  padding: 1px 7px;\n  border: 1px solid var(--dsw-alias-border-l2);\n  border-radius: 5px;\n  background: transparent;\n  color: var(--dsw-alias-label-tertiary);\n  font-size: 12px;\n  cursor: pointer;\n}\n\n.dsh_tn_copyBtn:hover {\n  background: var(--dsw-alias-interactive-bg-hover);\n  color: var(--dsw-alias-label-primary);\n}\n\n.dsh_tn_codeBox {\n  margin: 0;\n  padding: 10px 12px;\n  border-radius: 8px;\n  background: var(--dsw-alias-markdown-code-block);\n  color: var(--dsw-alias-label-primary);\n  font-family: ui-monospace, 'SF Mono', 'Cascadia Mono', Consolas, monospace;\n  font-size: 12px;\n  line-height: 1.55;\n  white-space: pre-wrap;\n  word-break: break-all;\n  overflow-x: auto;\n}\n\n.dsh_tn_codeBefore { border-left: 3px solid var(--dsw-alias-state-warn-primary); }\n.dsh_tn_codeAfter { border-left: 3px solid var(--dsw-alias-state-success-primary); }\n.dsh_tn_codeError {\n  border-left: 3px solid var(--dsw-alias-state-error-primary);\n  color: var(--dsw-alias-state-error-primary);\n}\n\n/* ---- Empty state ---- */\n\n.dsh_tn_emptyState {\n  display: flex;\n  flex-direction: column;\n  align-items: center;\n  gap: 8px;\n  padding: 48px 24px;\n  border: 1px dashed var(--dsw-alias-border-l3);\n  border-radius: 12px;\n  text-align: center;\n}\n\n.dsh_tn_emptyIcon { font-size: 32px; }\n\n.dsh_tn_emptyTitle {\n  font-size: 15px;\n  font-weight: 500;\n  color: var(--dsw-alias-label-primary);\n}\n\n.dsh_tn_emptyDesc {\n  margin: 0;\n  max-width: 420px;\n  font-size: 13px;\n  line-height: 1.6;\n  color: var(--dsw-alias-label-tertiary);\n}\n\n/* ---- Analytics ---- */\n\n.dsh_tn_analyticsPane {\n  display: flex;\n  flex-direction: column;\n  gap: 14px;\n}\n\n.dsh_tn_healthCard {\n  display: flex;\n  align-items: center;\n  gap: 14px;\n  padding: 16px 18px;\n  border: 1px solid var(--dsw-alias-border-l2);\n  border-left: 3px solid var(--dsw-alias-state-success-primary);\n  border-radius: 12px;\n  background: var(--dsw-alias-bg-layer-2);\n}\n\n.dsh_tn_healthCardMuted { border-left-color: var(--dsw-alias-border-l3); }\n\n.dsh_tn_healthIcon { font-size: 22px; }\n\n.dsh_tn_healthTitle {\n  font-size: 14px;\n  font-weight: 600;\n  color: var(--dsw-alias-label-primary);\n}\n\n.dsh_tn_healthDesc {\n  margin: 2px 0 0;\n  font-size: 13px;\n  line-height: 1.5;\n  color: var(--dsw-alias-label-tertiary);\n}\n\n.dsh_tn_rankGrid {\n  display: grid;\n  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));\n  gap: 12px;\n}\n\n.dsh_tn_rankCard {\n  padding: 14px 16px;\n  border: 1px solid var(--dsw-alias-border-l2);\n  border-radius: 12px;\n  background: var(--dsw-alias-bg-layer-2);\n}\n\n.dsh_tn_cardTitle {\n  margin-bottom: 12px;\n  font-size: 13px;\n  font-weight: 600;\n  color: var(--dsw-alias-label-primary);\n}\n\n.dsh_tn_rankEmpty {\n  margin: 0;\n  font-size: 13px;\n  color: var(--dsw-alias-label-dimmed);\n}\n\n.dsh_tn_rankList {\n  display: flex;\n  flex-direction: column;\n  gap: 10px;\n}\n\n.dsh_tn_rankItem {\n  display: flex;\n  flex-direction: column;\n  gap: 4px;\n}\n\n.dsh_tn_rankLabelRow {\n  display: flex;\n  justify-content: space-between;\n  align-items: baseline;\n  gap: 8px;\n}\n\n.dsh_tn_rankName {\n  font-size: 12px;\n  color: var(--dsw-alias-label-secondary);\n  overflow: hidden;\n  text-overflow: ellipsis;\n  white-space: nowrap;\n}\n\n.dsh_tn_rankValue {\n  font-size: 12px;\n  color: var(--dsw-alias-label-dimmed);\n  font-variant-numeric: tabular-nums;\n  flex-shrink: 0;\n}\n\n.dsh_tn_barBg {\n  height: 6px;\n  border-radius: 999px;\n  background: var(--dsw-alias-bg-layer-3);\n  overflow: hidden;\n}\n\n.dsh_tn_barFillAccent {\n  height: 100%;\n  border-radius: 999px;\n  background: var(--dsw-alias-brand-primary);\n}\n\n.dsh_tn_barFillSuccess {\n  height: 100%;\n  border-radius: 999px;\n  background: var(--dsw-alias-state-success-primary);\n}\n\n/* ---- Rules ---- */\n\n.dsh_tn_rulesGrid {\n  display: grid;\n  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));\n  gap: 12px;\n}\n\n.dsh_tn_ruleCard {\n  padding: 14px 16px;\n  border: 1px solid var(--dsw-alias-border-l2);\n  border-radius: 12px;\n  background: var(--dsw-alias-bg-layer-2);\n}\n\n.dsh_tn_ruleHead {\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  gap: 10px;\n  margin-bottom: 6px;\n}\n\n.dsh_tn_ruleTitle {\n  margin: 0;\n  font-size: 13px;\n  font-weight: 600;\n  color: var(--dsw-alias-label-primary);\n}\n\n.dsh_tn_ruleTag {\n  flex-shrink: 0;\n  padding: 1px 8px;\n  border-radius: 999px;\n  background: color-mix(in srgb, var(--dsw-alias-state-success-primary) 12%, transparent);\n  color: var(--dsw-alias-state-success-primary);\n  font-size: 11px;\n}\n\n.dsh_tn_ruleDesc {\n  margin: 0;\n  font-size: 12.5px;\n  line-height: 1.65;\n  color: var(--dsw-alias-label-tertiary);\n}\n";
if (typeof document !== "undefined" && !document.querySelector('style[data-plugin="dsh-tool-normalizer"]')) {
  const tag = document.createElement("style");
  tag.dataset.plugin = "dsh-tool-normalizer";
  tag.textContent = css;
  document.head.appendChild(tag);
}
var NormalizerSection_default = { "container": "dsh_tn_container", "header": "dsh_tn_header", "titleGroup": "dsh_tn_titleGroup", "titleRow": "dsh_tn_titleRow", "versionBadge": "dsh_tn_versionBadge", "title": "dsh_tn_title", "subtitle": "dsh_tn_subtitle", "headerActions": "dsh_tn_headerActions", "btnIcon": "dsh_tn_btnIcon", "btnGhost": "dsh_tn_btnGhost", "btnDanger": "dsh_tn_btnDanger", "pill": "dsh_tn_pill", "tabItem": "dsh_tn_tabItem", "expandBtn": "dsh_tn_expandBtn", "copyBtn": "dsh_tn_copyBtn", "searchInput": "dsh_tn_searchInput", "kpiGrid": "dsh_tn_kpiGrid", "kpiCard": "dsh_tn_kpiCard", "kpiTitle": "dsh_tn_kpiTitle", "estimateBadge": "dsh_tn_estimateBadge", "kpiValue": "dsh_tn_kpiValue", "kpiValueAccent": "dsh_tn_kpiValueAccent", "kpiValueSuccess": "dsh_tn_kpiValueSuccess", "kpiValueDanger": "dsh_tn_kpiValueDanger", "kpiDesc": "dsh_tn_kpiDesc", "tabsBar": "dsh_tn_tabsBar", "tabActive": "dsh_tn_tabActive", "tabCount": "dsh_tn_tabCount", "toolbar": "dsh_tn_toolbar", "pills": "dsh_tn_pills", "pillActive": "dsh_tn_pillActive", "countBadge": "dsh_tn_countBadge", "traceList": "dsh_tn_traceList", "traceCard": "dsh_tn_traceCard", "traceHeader": "dsh_tn_traceHeader", "traceMeta": "dsh_tn_traceMeta", "traceSide": "dsh_tn_traceSide", "badgeTool": "dsh_tn_badgeTool", "badgeCategory": "dsh_tn_badgeCategory", "statusDot": "dsh_tn_statusDot", "statusDotOk": "dsh_tn_statusDotOk", "statusDotFail": "dsh_tn_statusDotFail", "statusDotPass": "dsh_tn_statusDotPass", "statusText": "dsh_tn_statusText", "statusTextFail": "dsh_tn_statusTextFail", "timeText": "dsh_tn_timeText", "diffGrid": "dsh_tn_diffGrid", "errorBlock": "dsh_tn_errorBlock", "diffBlock": "dsh_tn_diffBlock", "diffLabelRow": "dsh_tn_diffLabelRow", "diffLabel": "dsh_tn_diffLabel", "diffLabelBefore": "dsh_tn_diffLabelBefore", "diffLabelAfter": "dsh_tn_diffLabelAfter", "codeBox": "dsh_tn_codeBox", "codeBefore": "dsh_tn_codeBefore", "codeAfter": "dsh_tn_codeAfter", "codeError": "dsh_tn_codeError", "emptyState": "dsh_tn_emptyState", "emptyIcon": "dsh_tn_emptyIcon", "emptyTitle": "dsh_tn_emptyTitle", "emptyDesc": "dsh_tn_emptyDesc", "analyticsPane": "dsh_tn_analyticsPane", "healthCard": "dsh_tn_healthCard", "healthCardMuted": "dsh_tn_healthCardMuted", "healthIcon": "dsh_tn_healthIcon", "healthTitle": "dsh_tn_healthTitle", "healthDesc": "dsh_tn_healthDesc", "rankGrid": "dsh_tn_rankGrid", "rankCard": "dsh_tn_rankCard", "cardTitle": "dsh_tn_cardTitle", "rankEmpty": "dsh_tn_rankEmpty", "rankList": "dsh_tn_rankList", "rankItem": "dsh_tn_rankItem", "rankLabelRow": "dsh_tn_rankLabelRow", "rankName": "dsh_tn_rankName", "rankValue": "dsh_tn_rankValue", "barBg": "dsh_tn_barBg", "barFillAccent": "dsh_tn_barFillAccent", "barFillSuccess": "dsh_tn_barFillSuccess", "rulesGrid": "dsh_tn_rulesGrid", "ruleCard": "dsh_tn_ruleCard", "ruleHead": "dsh_tn_ruleHead", "ruleTitle": "dsh_tn_ruleTitle", "ruleTag": "dsh_tn_ruleTag", "ruleDesc": "dsh_tn_ruleDesc" };

// src/client/NormalizerSection.tsx
var import_jsx_runtime = require("react/jsx-runtime");
function idleState() {
  return {
    status: "idle",
    stats: {
      totalIntercepted: 0,
      healedSuccess: 0,
      healedFailed: 0,
      passThrough: 0,
      estimatedTokensSaved: 0,
      healingSuccessRate: 100,
      byTool: {},
      byCategory: {},
      recentRecords: []
    },
    activeTab: "live",
    searchQuery: "",
    statusFilter: "all"
  };
}
function NormalizerSection(props) {
  const controller = props.controller;
  const t = (k) => {
    const v = props.t?.(k);
    if (v && v !== k) return v;
    return zh[k] || k;
  };
  const [state, setState] = (0, import_react.useState)(() => controller?.getSnapshot() ?? idleState());
  const [expandedIds, setExpandedIds] = (0, import_react.useState)(/* @__PURE__ */ new Set());
  const [copiedKey, setCopiedKey] = (0, import_react.useState)(null);
  (0, import_react.useEffect)(() => {
    if (!controller) return;
    const unsubscribe = controller.subscribe(() => {
      setState(controller.getSnapshot());
    });
    controller.refresh();
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") controller.refresh();
    }, 15e3);
    return () => {
      unsubscribe();
      window.clearInterval(timer);
    };
  }, [controller]);
  const toggleExpand = (id) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const copyText = (key, text) => {
    void navigator.clipboard?.writeText(text).then(() => {
      setCopiedKey(key);
      window.setTimeout(() => {
        setCopiedKey((current) => current === key ? null : current);
      }, 1500);
    }).catch(() => {
    });
  };
  const stats = state.stats;
  const filteredRecords = (0, import_react.useMemo)(() => stats.recentRecords.filter((record) => {
    if (state.statusFilter === "healed" && (!record.wasHealed || record.status !== "success")) return false;
    if (state.statusFilter === "failed" && record.status !== "failed") return false;
    if (state.statusFilter === "direct" && record.category !== "UNKNOWN_TOOL") return false;
    if (state.searchQuery) {
      const q = state.searchQuery.toLowerCase();
      const matchTool = record.toolName.toLowerCase().includes(q);
      const matchCat = record.category.toLowerCase().includes(q);
      const matchRaw = (record.originalArgsPreview || "").toLowerCase().includes(q);
      const matchNorm = (record.normalizedArgsPreview || "").toLowerCase().includes(q);
      if (!matchTool && !matchCat && !matchRaw && !matchNorm) return false;
    }
    return true;
  }), [stats.recentRecords, state.statusFilter, state.searchQuery]);
  const formatCategory = (cat) => {
    switch (cat) {
      case "INVALID_ARGS":
        return t("catInvalidArgs");
      case "UNKNOWN_TOOL":
        return t("catUnknownTool");
      case "RANGE_CLAMP":
        return t("catRangeClamp");
      case "CODE_WRAP":
        return t("catCodeWrap");
      case "PASSTHROUGH":
        return t("statusPassthrough");
      default:
        return cat;
    }
  };
  const formatTime = (ts) => {
    const diffSec = Math.floor((Date.now() - ts) / 1e3);
    if (diffSec < 60) return `${diffSec}\u79D2\u524D`;
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}\u5206\u949F\u524D`;
    const diffHour = Math.floor(diffMin / 60);
    if (diffHour < 24) return `${diffHour}\u5C0F\u65F6\u524D`;
    return new Date(ts).toLocaleString();
  };
  const rankEntries = (source) => Object.entries(source).sort((a, b) => b[1] - a[1]);
  const maxOf = (entries) => entries.length > 0 ? Math.max(...entries.map((e) => e[1])) : 1;
  const hasData = stats.totalIntercepted > 0;
  const formatTokens = (n) => n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `${(n / 1e3).toFixed(1)}k` : String(n);
  const renderRanking = (title, entries, tone) => {
    const max = maxOf(entries);
    return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: NormalizerSection_default.rankCard, children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: NormalizerSection_default.cardTitle, children: title }),
      entries.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: NormalizerSection_default.rankEmpty, children: t("noData") }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: NormalizerSection_default.rankList, children: entries.map(([name, count]) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: NormalizerSection_default.rankItem, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: NormalizerSection_default.rankLabelRow, children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: NormalizerSection_default.rankName, title: formatCategory(name), children: formatCategory(name) }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: NormalizerSection_default.rankValue, children: [
            count,
            " ",
            t("times")
          ] })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: NormalizerSection_default.barBg, children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          "div",
          {
            className: tone === "accent" ? NormalizerSection_default.barFillAccent : NormalizerSection_default.barFillSuccess,
            style: { width: `${Math.max(6, Math.round(count / max * 100))}%` }
          }
        ) })
      ] }, name)) })
    ] });
  };
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: NormalizerSection_default.container, children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", { className: NormalizerSection_default.header, children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: NormalizerSection_default.titleGroup, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: NormalizerSection_default.titleRow, children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { className: NormalizerSection_default.title, children: t("title") }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: NormalizerSection_default.versionBadge, title: "plugin version", children: [
            "v",
            "0.2.0"
          ] })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: NormalizerSection_default.subtitle, children: t("subtitle") })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: NormalizerSection_default.headerActions, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", { type: "button", className: NormalizerSection_default.btnGhost, onClick: () => controller?.refresh(), children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: NormalizerSection_default.btnIcon, children: "\u27F3" }),
          t("refresh")
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", { type: "button", className: NormalizerSection_default.btnGhost, onClick: () => controller?.exportReport(), disabled: !hasData, children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: NormalizerSection_default.btnIcon, children: "\u2913" }),
          t("export")
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", { type: "button", className: NormalizerSection_default.btnDanger, onClick: () => controller?.reset(), disabled: !hasData, children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: NormalizerSection_default.btnIcon, children: "\u232B" }),
          t("clear")
        ] })
      ] })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { className: NormalizerSection_default.kpiGrid, children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: NormalizerSection_default.kpiCard, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: NormalizerSection_default.kpiTitle, children: t("kpiRate") }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: `${NormalizerSection_default.kpiValue} ${NormalizerSection_default.kpiValueAccent}`, children: [
          stats.healingSuccessRate,
          "%"
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: NormalizerSection_default.kpiDesc, children: t("kpiRateDesc") })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: NormalizerSection_default.kpiCard, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: NormalizerSection_default.kpiTitle, children: t("kpiHealed") }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: `${NormalizerSection_default.kpiValue} ${NormalizerSection_default.kpiValueSuccess}`, children: stats.healedSuccess }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: NormalizerSection_default.kpiDesc, children: t("kpiHealedDesc") })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: NormalizerSection_default.kpiCard, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: NormalizerSection_default.kpiTitle, children: t("kpiTotal") }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: NormalizerSection_default.kpiValue, children: stats.totalIntercepted }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: NormalizerSection_default.kpiDesc, children: t("kpiTotalDesc") })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: NormalizerSection_default.kpiCard, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: NormalizerSection_default.kpiTitle, children: t("kpiFailed") }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: `${NormalizerSection_default.kpiValue} ${stats.healedFailed > 0 ? NormalizerSection_default.kpiValueDanger : ""}`, children: stats.healedFailed }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: NormalizerSection_default.kpiDesc, children: t("kpiFailedDesc") })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: NormalizerSection_default.kpiCard, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: NormalizerSection_default.kpiTitle, children: [
          t("kpiSavedTokens"),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: NormalizerSection_default.estimateBadge, children: t("estimateBadge") })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: `${NormalizerSection_default.kpiValue} ${NormalizerSection_default.kpiValueSuccess}`, children: formatTokens(stats.estimatedTokensSaved) }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: NormalizerSection_default.kpiDesc, children: t("kpiSavedTokensDesc") })
      ] })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("nav", { className: NormalizerSection_default.tabsBar, role: "tablist", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
        "button",
        {
          type: "button",
          role: "tab",
          "aria-selected": state.activeTab === "live",
          className: `${NormalizerSection_default.tabItem} ${state.activeTab === "live" ? NormalizerSection_default.tabActive : ""}`,
          onClick: () => controller?.setActiveTab("live"),
          children: [
            t("tabLive"),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: NormalizerSection_default.tabCount, children: stats.recentRecords.length })
          ]
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
        "button",
        {
          type: "button",
          role: "tab",
          "aria-selected": state.activeTab === "analytics",
          className: `${NormalizerSection_default.tabItem} ${state.activeTab === "analytics" ? NormalizerSection_default.tabActive : ""}`,
          onClick: () => controller?.setActiveTab("analytics"),
          children: t("tabAnalytics")
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
        "button",
        {
          type: "button",
          role: "tab",
          "aria-selected": state.activeTab === "rules",
          className: `${NormalizerSection_default.tabItem} ${state.activeTab === "rules" ? NormalizerSection_default.tabActive : ""}`,
          onClick: () => controller?.setActiveTab("rules"),
          children: t("tabRules")
        }
      )
    ] }),
    state.activeTab === "live" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("section", { className: NormalizerSection_default.livePane, children: !hasData ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: NormalizerSection_default.emptyState, children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: NormalizerSection_default.emptyIcon, children: "\u{1F6E1}\uFE0F" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: NormalizerSection_default.emptyTitle, children: t("noData") }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: NormalizerSection_default.emptyDesc, children: t("noDataDesc") })
    ] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: NormalizerSection_default.toolbar, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          "input",
          {
            type: "search",
            className: NormalizerSection_default.searchInput,
            placeholder: t("searchPlaceholder"),
            value: state.searchQuery,
            onChange: (e) => controller?.setSearchQuery(e.target.value)
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: NormalizerSection_default.pills, children: [
          ["all", t("filterAll"), stats.recentRecords.length],
          ["healed", t("filterHealed"), stats.recentRecords.filter((r) => r.wasHealed && r.status === "success").length],
          ["failed", t("filterFailed"), stats.recentRecords.filter((r) => r.status === "failed").length],
          ["direct", t("filterDirect"), stats.recentRecords.filter((r) => r.category === "UNKNOWN_TOOL").length]
        ].map(([key, label, count]) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
          "button",
          {
            type: "button",
            className: `${NormalizerSection_default.pill} ${state.statusFilter === key ? NormalizerSection_default.pillActive : ""}`,
            onClick: () => controller?.setStatusFilter(key),
            children: [
              label,
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: NormalizerSection_default.countBadge, children: count })
            ]
          },
          key
        )) })
      ] }),
      filteredRecords.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: NormalizerSection_default.emptyState, children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: NormalizerSection_default.emptyTitle, children: t("noData") }) }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", { className: NormalizerSection_default.traceList, children: filteredRecords.map((record) => {
        const isExpanded = expandedIds.has(record.id);
        return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { className: NormalizerSection_default.traceCard, children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: NormalizerSection_default.traceHeader, children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: NormalizerSection_default.traceMeta, children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: NormalizerSection_default.badgeTool, children: record.toolName }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: NormalizerSection_default.badgeCategory, children: formatCategory(record.category) }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                "span",
                {
                  className: `${NormalizerSection_default.statusDot} ${record.status === "failed" ? NormalizerSection_default.statusDotFail : record.wasHealed && record.status === "success" ? NormalizerSection_default.statusDotOk : NormalizerSection_default.statusDotPass}`
                }
              ),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: `${NormalizerSection_default.statusText} ${record.status === "failed" ? NormalizerSection_default.statusTextFail : ""}`, children: record.status === "failed" ? t("statusFailed") : record.wasHealed ? t("statusSuccess") : t("statusPassthrough") })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: NormalizerSection_default.traceSide, children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: NormalizerSection_default.timeText, children: formatTime(record.time) }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                "button",
                {
                  type: "button",
                  className: NormalizerSection_default.expandBtn,
                  "aria-expanded": isExpanded,
                  onClick: () => toggleExpand(record.id),
                  children: isExpanded ? `\u25B2 ${t("hideDetails")}` : `\u25BC ${t("diffDetails")}`
                }
              )
            ] })
          ] }),
          isExpanded && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: NormalizerSection_default.diffGrid, children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: NormalizerSection_default.diffBlock, children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: NormalizerSection_default.diffLabelRow, children: [
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: `${NormalizerSection_default.diffLabel} ${NormalizerSection_default.diffLabelBefore}`, children: t("beforeInput") }),
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                  "button",
                  {
                    type: "button",
                    className: NormalizerSection_default.copyBtn,
                    onClick: () => copyText(`${record.id}:before`, record.originalArgsPreview || "{}"),
                    children: copiedKey === `${record.id}:before` ? "\u2713" : "\u29C9"
                  }
                )
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("pre", { className: `${NormalizerSection_default.codeBox} ${NormalizerSection_default.codeBefore}`, children: record.originalArgsPreview || "{}" })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: NormalizerSection_default.diffBlock, children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: NormalizerSection_default.diffLabelRow, children: [
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: `${NormalizerSection_default.diffLabel} ${NormalizerSection_default.diffLabelAfter}`, children: t("afterInput") }),
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                  "button",
                  {
                    type: "button",
                    className: NormalizerSection_default.copyBtn,
                    onClick: () => copyText(`${record.id}:after`, record.normalizedArgsPreview || ""),
                    children: copiedKey === `${record.id}:after` ? "\u2713" : "\u29C9"
                  }
                )
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("pre", { className: `${NormalizerSection_default.codeBox} ${NormalizerSection_default.codeAfter}`, children: record.normalizedArgsPreview || "\uFF08\u6B63\u5E38\u653E\u884C\uFF09" })
            ] }),
            record.errorMessage && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: NormalizerSection_default.errorBlock, children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: `${NormalizerSection_default.diffLabel} ${NormalizerSection_default.diffLabelBefore}`, children: t("errorDetail") }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("pre", { className: `${NormalizerSection_default.codeBox} ${NormalizerSection_default.codeError}`, children: record.errorMessage })
            ] })
          ] })
        ] }, record.id);
      }) })
    ] }) }),
    state.activeTab === "analytics" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { className: NormalizerSection_default.analyticsPane, children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: `${NormalizerSection_default.healthCard} ${!hasData ? NormalizerSection_default.healthCardMuted : ""}`, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: NormalizerSection_default.healthIcon, children: "\u{1F6E1}\uFE0F" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: NormalizerSection_default.healthTitle, children: t("healthScoreTitle") }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: NormalizerSection_default.healthDesc, children: hasData ? stats.healingSuccessRate >= 90 ? t("healthGood") : stats.healingSuccessRate >= 75 ? t("healthFair") : t("healthWarn") : t("noDataDesc") })
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: NormalizerSection_default.rankGrid, children: [
        renderRanking(t("toolRankTitle"), rankEntries(stats.byTool), "accent"),
        renderRanking(t("categoryRankTitle"), rankEntries(stats.byCategory), "success")
      ] })
    ] }),
    state.activeTab === "rules" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("section", { className: NormalizerSection_default.rulesGrid, children: [1, 2, 3, 4].map((n) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", { className: NormalizerSection_default.ruleCard, children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: NormalizerSection_default.ruleHead, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { className: NormalizerSection_default.ruleTitle, children: t(`rule${n}Title`) }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: NormalizerSection_default.ruleTag, children: [
          "\u2713 ",
          t("statusActive")
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: NormalizerSection_default.ruleDesc, children: t(`rule${n}Desc`) })
    ] }, n)) })
  ] });
}

// src/tracker.ts
var ToolNormalizerTracker = class _ToolNormalizerTracker {
  static instance;
  totalIntercepted = 0;
  healedSuccess = 0;
  healedFailed = 0;
  passThrough = 0;
  estimatedTokensSaved = 0;
  byTool = {};
  byCategory = {};
  records = [];
  /** Dashboard transport window; the JSONL log holds the unbounded history. */
  maxRecords = 1e3;
  retryTokenCost = 0;
  static getInstance() {
    if (!_ToolNormalizerTracker.instance) {
      _ToolNormalizerTracker.instance = new _ToolNormalizerTracker();
    }
    return _ToolNormalizerTracker.instance;
  }
  /**
   * Record one tool normalizer event.
   */
  record(record) {
    this.totalIntercepted++;
    if (record.status === "success" && record.wasHealed) {
      this.healedSuccess++;
    } else if (record.status === "failed") {
      this.healedFailed++;
    } else {
      this.passThrough++;
    }
    this.byTool[record.toolName] = (this.byTool[record.toolName] ?? 0) + 1;
    this.byCategory[record.category] = (this.byCategory[record.category] ?? 0) + 1;
    if (record.status === "success" && record.wasHealed && this.retryTokenCost > 0) {
      this.estimatedTokensSaved += Math.round(this.retryTokenCost);
    }
    this.records.unshift(record);
    if (this.records.length > this.maxRecords) {
      this.records.pop();
    }
  }
  /**
   * Set the per-healed-call token-cost estimate used by the projection.
   * Non-finite or non-positive values disable the projection.
   */
  setRetryTokenCost(cost) {
    this.retryTokenCost = Number.isFinite(cost) && cost > 0 ? cost : 0;
  }
  /**
   * Rebuild aggregates from a replayed history (JSONL log restore). Counters
   * and maps are replaced wholesale; the record ring keeps the newest window
   * of the supplied events.
   */
  restore(stats) {
    this.totalIntercepted = stats.totalIntercepted;
    this.healedSuccess = stats.healedSuccess;
    this.healedFailed = stats.healedFailed;
    this.passThrough = stats.passThrough;
    this.estimatedTokensSaved = stats.estimatedTokensSaved;
    this.byTool = { ...stats.byTool };
    this.byCategory = { ...stats.byCategory };
    this.records = [...stats.recentRecords].sort((a, b) => b.time - a.time).slice(0, this.maxRecords);
  }
  /**
   * Retrieve the current aggregate statistics snapshot.
   */
  getSnapshot() {
    const totalHealAttempts = this.healedSuccess + this.healedFailed;
    const healingSuccessRate = totalHealAttempts > 0 ? Math.round(this.healedSuccess / totalHealAttempts * 1e3) / 10 : 100;
    return {
      totalIntercepted: this.totalIntercepted,
      healedSuccess: this.healedSuccess,
      healedFailed: this.healedFailed,
      passThrough: this.passThrough,
      estimatedTokensSaved: this.estimatedTokensSaved,
      healingSuccessRate,
      byTool: { ...this.byTool },
      byCategory: { ...this.byCategory },
      recentRecords: [...this.records]
    };
  }
  /**
   * Reset tracking metrics.
   */
  reset() {
    this.totalIntercepted = 0;
    this.healedSuccess = 0;
    this.healedFailed = 0;
    this.passThrough = 0;
    this.estimatedTokensSaved = 0;
    this.byTool = {};
    this.byCategory = {};
    this.records = [];
  }
};

// src/client/store.ts
var STORAGE_KEY = "dsh_tool_normalizer_stats_v2";
function emptyStats() {
  return {
    totalIntercepted: 0,
    healedSuccess: 0,
    healedFailed: 0,
    passThrough: 0,
    estimatedTokensSaved: 0,
    healingSuccessRate: 100,
    byTool: {},
    byCategory: {},
    recentRecords: []
  };
}
function coerceCounts(source) {
  if (source === null || typeof source !== "object") return {};
  const out = {};
  for (const [key, value] of Object.entries(source)) {
    if (typeof value === "number") out[key] = value;
    else if (value !== null && typeof value === "object") {
      const counter = value;
      out[key] = typeof counter.intercepted === "number" ? counter.intercepted : typeof counter.count === "number" ? counter.count : 0;
    }
  }
  return out;
}
function coerceStats(stats) {
  return {
    ...stats,
    estimatedTokensSaved: typeof stats.estimatedTokensSaved === "number" ? stats.estimatedTokensSaved : 0,
    byTool: coerceCounts(stats.byTool),
    byCategory: coerceCounts(stats.byCategory)
  };
}
function isPersistedStats(value) {
  if (value === null || typeof value !== "object") return false;
  const candidate = value;
  return typeof candidate.totalIntercepted === "number" && Array.isArray(candidate.recentRecords);
}
var NormalizerStore = class {
  current;
  listeners = /* @__PURE__ */ new Set();
  constructor() {
    this.current = {
      status: "idle",
      stats: this.loadFromStorage() ?? emptyStats(),
      activeTab: "live",
      searchQuery: "",
      statusFilter: "all"
    };
  }
  getSnapshot = () => {
    return this.current;
  };
  subscribe = (listener) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  setActiveTab = (tab) => {
    this.current = { ...this.current, activeTab: tab };
    this.notify();
  };
  setSearchQuery = (query) => {
    this.current = { ...this.current, searchQuery: query };
    this.notify();
  };
  setStatusFilter = (filter) => {
    this.current = { ...this.current, statusFilter: filter };
    this.notify();
  };
  /** Adopt the freshest available snapshot; keeps the newest non-empty source. */
  /** Adopt the freshest available snapshot: host feed first, tracker fallback. */
  refresh = () => {
    void this.refreshAsync();
  };
  refreshAsync = async () => {
    let adoptedFromFeed = false;
    if (typeof fetch === "function") {
      try {
        const res = await fetch("/plugin-api/tool-normalizer/stats", { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          if (isPersistedStats(data)) {
            this.current.stats = coerceStats(data);
            this.saveToStorage();
            adoptedFromFeed = true;
          }
        }
      } catch {
      }
    }
    if (!adoptedFromFeed) {
      try {
        const liveSnapshot = ToolNormalizerTracker.getInstance().getSnapshot();
        if (liveSnapshot.totalIntercepted > this.current.stats.totalIntercepted) {
          this.current.stats = coerceStats(liveSnapshot);
          this.saveToStorage();
        }
      } catch {
      }
    }
    this.current.status = "ready";
    this.notify();
  };
  reset = () => {
    try {
      ToolNormalizerTracker.getInstance().reset();
    } catch {
    }
    this.current = {
      ...this.current,
      stats: emptyStats(),
      statusFilter: "all",
      searchQuery: ""
    };
    this.saveToStorage();
    this.notify();
  };
  exportReport = () => {
    try {
      const payload = JSON.stringify(this.current.stats, null, 2);
      const anchor = document.createElement("a");
      anchor.setAttribute("href", "data:text/json;charset=utf-8," + encodeURIComponent(payload));
      anchor.setAttribute("download", `dsh_tool_normalizer_report_${(/* @__PURE__ */ new Date()).toISOString().slice(0, 10)}.json`);
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
    } catch {
    }
  };
  loadFromStorage() {
    if (typeof localStorage === "undefined") return null;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw && isPersistedStats(JSON.parse(raw))) {
        return coerceStats(JSON.parse(raw));
      }
    } catch {
    }
    return null;
  }
  saveToStorage() {
    if (typeof localStorage === "undefined") return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.current.stats));
    } catch {
    }
  }
  notify() {
    for (const listener of this.listeners) {
      listener();
    }
  }
};

// src/client/index.ts
var NS = "settings.tool-normalizer";
var inject = ["slots", "locale"];
function apply(ctx) {
  ctx.effect?.(() => ctx.locale?.register(NS, { zh, en: zh }), "tool-normalizer: copy dictionaries");
  const controller = new NormalizerStore();
  const boundT = ctx.locale?.bind?.(NS);
  const t = ((k) => {
    if (boundT) {
      const v = boundT(k);
      if (v && v !== k) return v;
    }
    return zh[k] || k;
  });
  const injected = () => ({
    controller,
    t
  });
  ctx.slots?.inject?.("settings.section", () => ctx.slots?.register?.({
    name: "settings.section",
    id: "tool-normalizer",
    order: 25,
    label: () => zh.nav,
    inject: injected
  }, NormalizerSection));
}
var index_default = { name: "tool-normalizer-client", inject, apply };
return module.exports; } });
