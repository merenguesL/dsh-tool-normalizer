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

// src/client/NormalizerSection.module.css
var css = ".dsh_tn_container {\n  display: flex;\n  flex-direction: column;\n  gap: 20px;\n  padding: 24px;\n  max-width: 1200px;\n  margin: 0 auto;\n  color: var(--dsh-text, #1e293b);\n  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;\n}\n\n/* Header */\n.dsh_tn_header {\n  display: flex;\n  justify-content: space-between;\n  align-items: flex-start;\n  flex-wrap: wrap;\n  gap: 16px;\n  padding-bottom: 16px;\n  border-bottom: 1px solid var(--dsh-border, #e2e8f0);\n}\n\n.dsh_tn_titleGroup h2 {\n  margin: 0 0 6px 0;\n  font-size: 1.dsh_tn_5rem;\n  font-weight: 700;\n  letter-spacing: -0.dsh_tn_02em;\n  color: var(--dsh-heading, #0f172a);\n}\n\n.dsh_tn_subtitle {\n  margin: 0;\n  font-size: 0.dsh_tn_88rem;\n  color: var(--dsh-text-muted, #64748b);\n  line-height: 1.dsh_tn_4;\n}\n\n.dsh_tn_headerActions {\n  display: flex;\n  gap: 8px;\n  align-items: center;\n  flex-wrap: wrap;\n}\n\n.dsh_tn_btnPrimary, .dsh_tn_btnSecondary, .dsh_tn_btnAccent {\n  padding: 7px 14px;\n  border-radius: 6px;\n  font-size: 0.dsh_tn_84rem;\n  font-weight: 600;\n  cursor: pointer;\n  transition: all 0.dsh_tn_15s ease;\n  display: inline-flex;\n  align-items: center;\n  gap: 6px;\n}\n\n.dsh_tn_btnPrimary {\n  background: var(--dsh-primary, #3b82f6);\n  color: #ffffff;\n  border: 1px solid transparent;\n}\n.dsh_tn_btnPrimary:hover {\n  background: #2563eb;\n}\n\n.dsh_tn_btnSecondary {\n  background: var(--dsh-surface, #ffffff);\n  color: var(--dsh-text, #334155);\n  border: 1px solid var(--dsh-border, #cbd5e1);\n}\n.dsh_tn_btnSecondary:hover {\n  background: var(--dsh-surface-hover, #f8fafc);\n  border-color: #94a3b8;\n}\n\n.dsh_tn_btnAccent {\n  background: #10b981;\n  color: #ffffff;\n  border: 1px solid transparent;\n}\n.dsh_tn_btnAccent:hover {\n  background: #059669;\n}\n\n/* KPI Hero Cards */\n.dsh_tn_kpiGrid {\n  display: grid;\n  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));\n  gap: 14px;\n}\n\n.dsh_tn_kpiCard {\n  background: var(--dsh-surface, #ffffff);\n  border: 1px solid var(--dsh-border, #e2e8f0);\n  border-radius: 10px;\n  padding: 16px 18px;\n  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.dsh_tn_04);\n  display: flex;\n  flex-direction: column;\n  gap: 4px;\n  transition: transform 0.dsh_tn_15s ease, box-shadow 0.dsh_tn_15s ease;\n}\n.dsh_tn_kpiCard:hover {\n  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.dsh_tn_06);\n}\n\n.dsh_tn_kpiTitle {\n  font-size: 0.dsh_tn_82rem;\n  font-weight: 600;\n  color: var(--dsh-text-muted, #64748b);\n  text-transform: uppercase;\n  letter-spacing: 0.dsh_tn_03em;\n}\n\n.dsh_tn_kpiValueRow {\n  display: flex;\n  align-items: baseline;\n  gap: 8px;\n}\n\n.dsh_tn_kpiValue {\n  font-size: 1.dsh_tn_85rem;\n  font-weight: 800;\n  letter-spacing: -0.dsh_tn_03em;\n  color: var(--dsh-heading, #0f172a);\n}\n\n.dsh_tn_kpiValueSuccess {\n  color: #10b981;\n}\n\n.dsh_tn_kpiValueRate {\n  color: #3b82f6;\n}\n\n.dsh_tn_kpiValueWarn {\n  color: #f59e0b;\n}\n\n.dsh_tn_kpiDesc {\n  font-size: 0.dsh_tn_76rem;\n  color: var(--dsh-text-muted, #94a3b8);\n  margin-top: 2px;\n}\n\n/* Tabs Navigation */\n.dsh_tn_tabsBar {\n  display: flex;\n  gap: 8px;\n  border-bottom: 1px solid var(--dsh-border, #e2e8f0);\n  padding-bottom: 2px;\n  margin-top: 4px;\n}\n\n.dsh_tn_tabItem {\n  padding: 8px 16px;\n  border-radius: 6px 6px 0 0;\n  font-size: 0.dsh_tn_88rem;\n  font-weight: 600;\n  cursor: pointer;\n  background: transparent;\n  border: none;\n  color: var(--dsh-text-muted, #64748b);\n  border-bottom: 2px solid transparent;\n  transition: all 0.dsh_tn_15s ease;\n}\n\n.dsh_tn_tabItem:hover {\n  color: var(--dsh-heading, #0f172a);\n}\n\n.dsh_tn_tabActive {\n  color: var(--dsh-primary, #3b82f6);\n  border-bottom: 2px solid var(--dsh-primary, #3b82f6);\n  background: rgba(59, 130, 246, 0.dsh_tn_05);\n}\n\n/* Search & Filter Bar */\n.dsh_tn_filterBar {\n  display: flex;\n  justify-content: space-between;\n  align-items: center;\n  gap: 12px;\n  flex-wrap: wrap;\n}\n\n.dsh_tn_searchInput {\n  flex: 1;\n  min-width: 240px;\n  padding: 8px 12px;\n  border-radius: 6px;\n  border: 1px solid var(--dsh-border, #cbd5e1);\n  background: var(--dsh-surface, #ffffff);\n  color: var(--dsh-text, #0f172a);\n  font-size: 0.dsh_tn_86rem;\n  outline: none;\n  transition: border-color 0.dsh_tn_15s ease;\n}\n.dsh_tn_searchInput:focus {\n  border-color: var(--dsh-primary, #3b82f6);\n}\n\n.dsh_tn_filterPills {\n  display: flex;\n  gap: 6px;\n}\n\n.dsh_tn_filterPill {\n  padding: 6px 12px;\n  border-radius: 20px;\n  border: 1px solid var(--dsh-border, #cbd5e1);\n  background: var(--dsh-surface, #ffffff);\n  font-size: 0.dsh_tn_78rem;\n  font-weight: 600;\n  color: var(--dsh-text-muted, #64748b);\n  cursor: pointer;\n  transition: all 0.dsh_tn_15s ease;\n}\n.dsh_tn_filterPill:hover {\n  border-color: #94a3b8;\n}\n\n.dsh_tn_filterPillActive {\n  background: #3b82f6;\n  color: #ffffff;\n  border-color: #3b82f6;\n}\n\n/* Live Trace Cards */\n.dsh_tn_traceList {\n  display: flex;\n  flex-direction: column;\n  gap: 10px;\n}\n\n.dsh_tn_traceCard {\n  background: var(--dsh-surface, #ffffff);\n  border: 1px solid var(--dsh-border, #e2e8f0);\n  border-radius: 8px;\n  padding: 12px 16px;\n  transition: all 0.dsh_tn_15s ease;\n}\n.dsh_tn_traceCard:hover {\n  border-color: #cbd5e1;\n}\n\n.dsh_tn_traceHeader {\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  gap: 10px;\n  flex-wrap: wrap;\n}\n\n.dsh_tn_traceLeft {\n  display: flex;\n  align-items: center;\n  gap: 10px;\n  flex-wrap: wrap;\n}\n\n.dsh_tn_badgeTool {\n  background: #e0f2fe;\n  color: #0369a1;\n  padding: 3px 8px;\n  border-radius: 4px;\n  font-family: monospace;\n  font-size: 0.dsh_tn_82rem;\n  font-weight: 700;\n}\n\n.dsh_tn_badgeCategory {\n  background: #f1f5f9;\n  color: #475569;\n  padding: 3px 8px;\n  border-radius: 4px;\n  font-size: 0.dsh_tn_76rem;\n  font-weight: 600;\n}\n\n.dsh_tn_badgeSuccess {\n  background: #dcfce7;\n  color: #15803d;\n  padding: 3px 8px;\n  border-radius: 4px;\n  font-size: 0.dsh_tn_76rem;\n  font-weight: 700;\n}\n\n.dsh_tn_badgeFailed {\n  background: #fee2e2;\n  color: #b91c1c;\n  padding: 3px 8px;\n  border-radius: 4px;\n  font-size: 0.dsh_tn_76rem;\n  font-weight: 700;\n}\n\n.dsh_tn_timeText {\n  font-size: 0.dsh_tn_78rem;\n  color: var(--dsh-text-muted, #94a3b8);\n}\n\n.dsh_tn_expandBtn {\n  background: transparent;\n  border: 1px solid var(--dsh-border, #cbd5e1);\n  padding: 4px 10px;\n  border-radius: 4px;\n  font-size: 0.dsh_tn_76rem;\n  color: var(--dsh-text-muted, #64748b);\n  cursor: pointer;\n  font-weight: 600;\n  transition: all 0.dsh_tn_15s ease;\n}\n.dsh_tn_expandBtn:hover {\n  background: var(--dsh-surface-hover, #f8fafc);\n  color: var(--dsh-heading, #0f172a);\n}\n\n/* Diff View */\n.dsh_tn_diffContainer {\n  margin-top: 12px;\n  padding-top: 12px;\n  border-top: 1px dashed var(--dsh-border, #e2e8f0);\n  display: grid;\n  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));\n  gap: 12px;\n}\n\n.dsh_tn_diffBlock {\n  display: flex;\n  flex-direction: column;\n  gap: 6px;\n}\n\n.dsh_tn_diffLabel {\n  font-size: 0.dsh_tn_78rem;\n  font-weight: 700;\n  letter-spacing: 0.dsh_tn_02em;\n}\n\n.dsh_tn_labelBefore {\n  color: #ef4444;\n}\n\n.dsh_tn_labelAfter {\n  color: #10b981;\n}\n\n.dsh_tn_codeBox {\n  padding: 10px 12px;\n  border-radius: 6px;\n  font-family: 'JetBrains Mono', 'Fira Code', Menlo, monospace;\n  font-size: 0.dsh_tn_8rem;\n  line-height: 1.dsh_tn_45;\n  white-space: pre-wrap;\n  word-break: break-all;\n  max-height: 160px;\n  overflow-y: auto;\n  border: 1px solid transparent;\n}\n\n.dsh_tn_codeBefore {\n  background: rgba(239, 68, 68, 0.dsh_tn_06);\n  color: #b91c1c;\n  border-color: rgba(239, 68, 68, 0.dsh_tn_2);\n}\n\n.dsh_tn_codeAfter {\n  background: rgba(16, 185, 129, 0.dsh_tn_06);\n  color: #047857;\n  border-color: rgba(16, 185, 129, 0.dsh_tn_2);\n}\n\n/* Analytics Tab */\n.dsh_tn_analyticsGrid {\n  display: grid;\n  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));\n  gap: 16px;\n}\n\n.dsh_tn_analyticsCard {\n  background: var(--dsh-surface, #ffffff);\n  border: 1px solid var(--dsh-border, #e2e8f0);\n  border-radius: 10px;\n  padding: 18px;\n  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.dsh_tn_04);\n}\n\n.dsh_tn_cardTitle {\n  font-size: 0.dsh_tn_96rem;\n  font-weight: 700;\n  color: var(--dsh-heading, #0f172a);\n  margin-bottom: 14px;\n}\n\n.dsh_tn_rankList {\n  display: flex;\n  flex-direction: column;\n  gap: 12px;\n}\n\n.dsh_tn_rankItem {\n  display: flex;\n  flex-direction: column;\n  gap: 4px;\n}\n\n.dsh_tn_rankLabelRow {\n  display: flex;\n  justify-content: space-between;\n  font-size: 0.dsh_tn_82rem;\n  font-weight: 600;\n}\n\n.dsh_tn_rankName {\n  color: var(--dsh-heading, #0f172a);\n}\n\n.dsh_tn_rankValue {\n  color: var(--dsh-text-muted, #64748b);\n}\n\n.dsh_tn_progressBarBg {\n  height: 7px;\n  border-radius: 4px;\n  background: var(--dsh-border, #f1f5f9);\n  overflow: hidden;\n}\n\n.dsh_tn_progressBarFill {\n  height: 100%;\n  border-radius: 4px;\n  background: linear-gradient(90deg, #3b82f6, #60a5fa);\n  transition: width 0.dsh_tn_3s ease;\n}\n\n.dsh_tn_progressBarFillEmerald {\n  background: linear-gradient(90deg, #10b981, #34d399);\n}\n\n/* Health Callout */\n.dsh_tn_healthCard {\n  grid-column: 1 / -1;\n  background: linear-gradient(135deg, rgba(59, 130, 246, 0.dsh_tn_08), rgba(16, 185, 129, 0.dsh_tn_08));\n  border: 1px solid rgba(59, 130, 246, 0.dsh_tn_2);\n  border-radius: 10px;\n  padding: 16px 20px;\n  display: flex;\n  gap: 14px;\n  align-items: center;\n}\n\n.dsh_tn_healthIcon {\n  font-size: 2rem;\n}\n\n.dsh_tn_healthTitle {\n  font-size: 0.dsh_tn_94rem;\n  font-weight: 700;\n  color: #0f172a;\n  margin-bottom: 4px;\n}\n\n.dsh_tn_healthDesc {\n  font-size: 0.dsh_tn_84rem;\n  color: #475569;\n  margin: 0;\n}\n\n/* Rules Grid */\n.dsh_tn_rulesGrid {\n  display: grid;\n  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));\n  gap: 16px;\n}\n\n.dsh_tn_ruleCard {\n  background: var(--dsh-surface, #ffffff);\n  border: 1px solid var(--dsh-border, #e2e8f0);\n  border-radius: 10px;\n  padding: 18px;\n  display: flex;\n  flex-direction: column;\n  gap: 10px;\n}\n\n.dsh_tn_ruleHeader {\n  display: flex;\n  justify-content: space-between;\n  align-items: center;\n}\n\n.dsh_tn_ruleTitle {\n  font-size: 0.dsh_tn_92rem;\n  font-weight: 700;\n  color: var(--dsh-heading, #0f172a);\n}\n\n.dsh_tn_ruleTag {\n  background: #dcfce7;\n  color: #15803d;\n  font-size: 0.dsh_tn_72rem;\n  font-weight: 700;\n  padding: 2px 6px;\n  border-radius: 4px;\n}\n\n.dsh_tn_ruleDesc {\n  font-size: 0.dsh_tn_82rem;\n  color: var(--dsh-text-muted, #64748b);\n  line-height: 1.dsh_tn_5;\n  margin: 0;\n}\n\n/* Empty State */\n.dsh_tn_emptyBox {\n  padding: 40px 20px;\n  text-align: center;\n  background: var(--dsh-surface, #ffffff);\n  border: 1px dashed var(--dsh-border, #cbd5e1);\n  border-radius: 10px;\n}\n\n.dsh_tn_emptyTitle {\n  font-size: 1rem;\n  font-weight: 700;\n  color: var(--dsh-heading, #334155);\n  margin-bottom: 6px;\n}\n\n.dsh_tn_emptyDesc {\n  font-size: 0.dsh_tn_84rem;\n  color: var(--dsh-text-muted, #94a3b8);\n  margin: 0;\n}\n";
if (typeof document !== "undefined" && !document.querySelector('style[data-plugin="dsh-tool-normalizer"]')) {
  const tag = document.createElement("style");
  tag.dataset.plugin = "dsh-tool-normalizer";
  tag.textContent = css;
  document.head.appendChild(tag);
}
var NormalizerSection_default = { "2": "dsh_tn_2", "4": "dsh_tn_4", "5": "dsh_tn_5", "45": "dsh_tn_45", "container": "dsh_tn_container", "header": "dsh_tn_header", "titleGroup": "dsh_tn_titleGroup", "5rem": "dsh_tn_5rem", "02em": "dsh_tn_02em", "subtitle": "dsh_tn_subtitle", "88rem": "dsh_tn_88rem", "headerActions": "dsh_tn_headerActions", "btnPrimary": "dsh_tn_btnPrimary", "btnSecondary": "dsh_tn_btnSecondary", "btnAccent": "dsh_tn_btnAccent", "84rem": "dsh_tn_84rem", "15s": "dsh_tn_15s", "kpiGrid": "dsh_tn_kpiGrid", "kpiCard": "dsh_tn_kpiCard", "04": "dsh_tn_04", "06": "dsh_tn_06", "kpiTitle": "dsh_tn_kpiTitle", "82rem": "dsh_tn_82rem", "03em": "dsh_tn_03em", "kpiValueRow": "dsh_tn_kpiValueRow", "kpiValue": "dsh_tn_kpiValue", "85rem": "dsh_tn_85rem", "kpiValueSuccess": "dsh_tn_kpiValueSuccess", "kpiValueRate": "dsh_tn_kpiValueRate", "kpiValueWarn": "dsh_tn_kpiValueWarn", "kpiDesc": "dsh_tn_kpiDesc", "76rem": "dsh_tn_76rem", "tabsBar": "dsh_tn_tabsBar", "tabItem": "dsh_tn_tabItem", "tabActive": "dsh_tn_tabActive", "05": "dsh_tn_05", "filterBar": "dsh_tn_filterBar", "searchInput": "dsh_tn_searchInput", "86rem": "dsh_tn_86rem", "filterPills": "dsh_tn_filterPills", "filterPill": "dsh_tn_filterPill", "78rem": "dsh_tn_78rem", "filterPillActive": "dsh_tn_filterPillActive", "traceList": "dsh_tn_traceList", "traceCard": "dsh_tn_traceCard", "traceHeader": "dsh_tn_traceHeader", "traceLeft": "dsh_tn_traceLeft", "badgeTool": "dsh_tn_badgeTool", "badgeCategory": "dsh_tn_badgeCategory", "badgeSuccess": "dsh_tn_badgeSuccess", "badgeFailed": "dsh_tn_badgeFailed", "timeText": "dsh_tn_timeText", "expandBtn": "dsh_tn_expandBtn", "diffContainer": "dsh_tn_diffContainer", "diffBlock": "dsh_tn_diffBlock", "diffLabel": "dsh_tn_diffLabel", "labelBefore": "dsh_tn_labelBefore", "labelAfter": "dsh_tn_labelAfter", "codeBox": "dsh_tn_codeBox", "8rem": "dsh_tn_8rem", "codeBefore": "dsh_tn_codeBefore", "codeAfter": "dsh_tn_codeAfter", "analyticsGrid": "dsh_tn_analyticsGrid", "analyticsCard": "dsh_tn_analyticsCard", "cardTitle": "dsh_tn_cardTitle", "96rem": "dsh_tn_96rem", "rankList": "dsh_tn_rankList", "rankItem": "dsh_tn_rankItem", "rankLabelRow": "dsh_tn_rankLabelRow", "rankName": "dsh_tn_rankName", "rankValue": "dsh_tn_rankValue", "progressBarBg": "dsh_tn_progressBarBg", "progressBarFill": "dsh_tn_progressBarFill", "3s": "dsh_tn_3s", "progressBarFillEmerald": "dsh_tn_progressBarFillEmerald", "healthCard": "dsh_tn_healthCard", "08": "dsh_tn_08", "healthIcon": "dsh_tn_healthIcon", "healthTitle": "dsh_tn_healthTitle", "94rem": "dsh_tn_94rem", "healthDesc": "dsh_tn_healthDesc", "rulesGrid": "dsh_tn_rulesGrid", "ruleCard": "dsh_tn_ruleCard", "ruleHeader": "dsh_tn_ruleHeader", "ruleTitle": "dsh_tn_ruleTitle", "92rem": "dsh_tn_92rem", "ruleTag": "dsh_tn_ruleTag", "72rem": "dsh_tn_72rem", "ruleDesc": "dsh_tn_ruleDesc", "emptyBox": "dsh_tn_emptyBox", "emptyTitle": "dsh_tn_emptyTitle", "emptyDesc": "dsh_tn_emptyDesc" };

// src/client/NormalizerSection.tsx
var import_jsx_runtime = require("react/jsx-runtime");
function NormalizerSection({ injected }) {
  const controller = injected?.controller;
  const t = injected?.t ?? ((k) => k);
  const [state, setState] = (0, import_react.useState)(() => {
    return controller ? controller.getSnapshot() : {
      status: "idle",
      stats: {
        totalIntercepted: 0,
        healedSuccess: 0,
        healedFailed: 0,
        passThrough: 0,
        healingSuccessRate: 100,
        byTool: {},
        byCategory: {},
        recentRecords: []
      },
      activeTab: "live",
      searchQuery: "",
      statusFilter: "all"
    };
  });
  const [expandedIds, setExpandedIds] = (0, import_react.useState)(/* @__PURE__ */ new Set());
  (0, import_react.useEffect)(() => {
    if (!controller) return;
    const unsubscribe = controller.subscribe(() => {
      setState(controller.getSnapshot());
    });
    controller.refresh();
    return unsubscribe;
  }, [controller]);
  const toggleExpand = (id) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const stats = state.stats;
  const filteredRecords = stats.recentRecords.filter((record) => {
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
  });
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
      default:
        return t("catPassthrough");
    }
  };
  const toolEntries = Object.entries(stats.byTool).sort((a, b) => b[1] - a[1]);
  const maxToolCount = toolEntries.length > 0 ? Math.max(...toolEntries.map((e) => e[1])) : 1;
  const catEntries = Object.entries(stats.byCategory).sort((a, b) => b[1] - a[1]);
  const maxCatCount = catEntries.length > 0 ? Math.max(...catEntries.map((e) => e[1])) : 1;
  const formatTime = (ts) => {
    const diffSec = Math.floor((Date.now() - ts) / 1e3);
    if (diffSec < 60) return `${diffSec}\u79D2\u524D`;
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}\u5206\u949F\u524D`;
    const diffHour = Math.floor(diffMin / 60);
    if (diffHour < 24) return `${diffHour}\u5C0F\u65F6\u524D`;
    return new Date(ts).toLocaleTimeString();
  };
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: NormalizerSection_default.container, children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: NormalizerSection_default.header, children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: NormalizerSection_default.titleGroup, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { children: t("title") }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: NormalizerSection_default.subtitle, children: t("subtitle") })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: NormalizerSection_default.headerActions, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
          "button",
          {
            type: "button",
            className: NormalizerSection_default.btnAccent,
            onClick: () => controller?.simulateAction(),
            title: "\u6A21\u62DF\u89E6\u53D1\u4E00\u6B21\u5DE5\u5177\u8C03\u7528\u5F02\u5E38\u5E76\u6D4B\u8BD5\u81EA\u6108\u4FEE\u590D\u6548\u679C",
            children: [
              "\u26A1 ",
              t("simulate")
            ]
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
          "button",
          {
            type: "button",
            className: NormalizerSection_default.btnSecondary,
            onClick: () => controller?.exportReport(),
            children: [
              "\u{1F4E5} ",
              t("export")
            ]
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
          "button",
          {
            type: "button",
            className: NormalizerSection_default.btnSecondary,
            onClick: () => controller?.reset(),
            children: [
              "\u{1F5D1}\uFE0F ",
              t("clear")
            ]
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
          "button",
          {
            type: "button",
            className: NormalizerSection_default.btnPrimary,
            onClick: () => controller?.refresh(),
            children: [
              "\u{1F504} ",
              t("refresh")
            ]
          }
        )
      ] })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: NormalizerSection_default.kpiGrid, children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: NormalizerSection_default.kpiCard, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: NormalizerSection_default.kpiTitle, children: t("kpiRate") }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: NormalizerSection_default.kpiValueRow, children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: `${NormalizerSection_default.kpiValue} ${NormalizerSection_default.kpiValueRate}`, children: [
          stats.healingSuccessRate,
          "%"
        ] }) }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: NormalizerSection_default.kpiDesc, children: t("kpiRateDesc") })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: NormalizerSection_default.kpiCard, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: NormalizerSection_default.kpiTitle, children: t("kpiHealed") }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: NormalizerSection_default.kpiValueRow, children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: `${NormalizerSection_default.kpiValue} ${NormalizerSection_default.kpiValueSuccess}`, children: stats.healedSuccess }) }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: NormalizerSection_default.kpiDesc, children: t("kpiHealedDesc") })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: NormalizerSection_default.kpiCard, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: NormalizerSection_default.kpiTitle, children: t("kpiTotal") }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: NormalizerSection_default.kpiValueRow, children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: NormalizerSection_default.kpiValue, children: stats.totalIntercepted }) }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: NormalizerSection_default.kpiDesc, children: t("kpiTotalDesc") })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: NormalizerSection_default.kpiCard, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: NormalizerSection_default.kpiTitle, children: t("kpiSavedRounds") }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: NormalizerSection_default.kpiValueRow, children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: `${NormalizerSection_default.kpiValue} ${NormalizerSection_default.kpiValueSuccess}`, children: [
          "~",
          stats.healedSuccess
        ] }) }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: NormalizerSection_default.kpiDesc, children: t("kpiSavedRoundsDesc") })
      ] })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: NormalizerSection_default.tabsBar, children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
        "button",
        {
          type: "button",
          className: `${NormalizerSection_default.tabItem} ${state.activeTab === "live" ? NormalizerSection_default.tabActive : ""}`,
          onClick: () => controller?.setActiveTab("live"),
          children: [
            "\u{1F4CB} ",
            t("tabLive"),
            " (",
            stats.recentRecords.length,
            ")"
          ]
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
        "button",
        {
          type: "button",
          className: `${NormalizerSection_default.tabItem} ${state.activeTab === "analytics" ? NormalizerSection_default.tabActive : ""}`,
          onClick: () => controller?.setActiveTab("analytics"),
          children: [
            "\u{1F4CA} ",
            t("tabAnalytics")
          ]
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
        "button",
        {
          type: "button",
          className: `${NormalizerSection_default.tabItem} ${state.activeTab === "rules" ? NormalizerSection_default.tabActive : ""}`,
          onClick: () => controller?.setActiveTab("rules"),
          children: [
            "\u{1F6E1}\uFE0F ",
            t("tabRules")
          ]
        }
      )
    ] }),
    state.activeTab === "live" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: NormalizerSection_default.filterBar, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          "input",
          {
            type: "text",
            className: NormalizerSection_default.searchInput,
            placeholder: t("searchPlaceholder"),
            value: state.searchQuery,
            onChange: (e) => controller?.setSearchQuery(e.target.value)
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: NormalizerSection_default.filterPills, children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
            "button",
            {
              type: "button",
              className: `${NormalizerSection_default.filterPill} ${state.statusFilter === "all" ? NormalizerSection_default.filterPillActive : ""}`,
              onClick: () => controller?.setStatusFilter("all"),
              children: t("filterAll")
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
            "button",
            {
              type: "button",
              className: `${NormalizerSection_default.filterPill} ${state.statusFilter === "healed" ? NormalizerSection_default.filterPillActive : ""}`,
              onClick: () => controller?.setStatusFilter("healed"),
              children: t("filterHealed")
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
            "button",
            {
              type: "button",
              className: `${NormalizerSection_default.filterPill} ${state.statusFilter === "direct" ? NormalizerSection_default.filterPillActive : ""}`,
              onClick: () => controller?.setStatusFilter("direct"),
              children: t("filterDirect")
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
            "button",
            {
              type: "button",
              className: `${NormalizerSection_default.filterPill} ${state.statusFilter === "failed" ? NormalizerSection_default.filterPillActive : ""}`,
              onClick: () => controller?.setStatusFilter("failed"),
              children: t("filterFailed")
            }
          )
        ] })
      ] }),
      filteredRecords.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: NormalizerSection_default.emptyBox, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: NormalizerSection_default.emptyTitle, children: t("noData") }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: NormalizerSection_default.emptyDesc, children: t("noDataDesc") })
      ] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: NormalizerSection_default.traceList, children: filteredRecords.map((record) => {
        const isExpanded = expandedIds.has(record.id);
        return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: NormalizerSection_default.traceCard, children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: NormalizerSection_default.traceHeader, children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: NormalizerSection_default.traceLeft, children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: NormalizerSection_default.badgeTool, children: record.toolName }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: NormalizerSection_default.badgeCategory, children: formatCategory(record.category) }),
              record.status === "success" && record.wasHealed && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: NormalizerSection_default.badgeSuccess, children: [
                "\u2713 ",
                t("statusSuccess")
              ] }),
              record.status === "failed" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: NormalizerSection_default.badgeFailed, children: [
                "\u2715 ",
                t("statusFailed")
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: NormalizerSection_default.timeText, children: formatTime(record.time) })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
              "button",
              {
                type: "button",
                className: NormalizerSection_default.expandBtn,
                onClick: () => toggleExpand(record.id),
                children: isExpanded ? `\u25B2 ${t("hideDetails")}` : `\u25BC ${t("diffDetails")}`
              }
            )
          ] }),
          isExpanded && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: NormalizerSection_default.diffContainer, children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: NormalizerSection_default.diffBlock, children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: `${NormalizerSection_default.diffLabel} ${NormalizerSection_default.labelBefore}`, children: t("beforeInput") }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: `${NormalizerSection_default.codeBox} ${NormalizerSection_default.codeBefore}`, children: record.originalArgsPreview || "{}" })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: NormalizerSection_default.diffBlock, children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: `${NormalizerSection_default.diffLabel} ${NormalizerSection_default.labelAfter}`, children: t("afterInput") }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: `${NormalizerSection_default.codeBox} ${NormalizerSection_default.codeAfter}`, children: record.normalizedArgsPreview || "\uFF08\u6B63\u5E38\u653E\u884C\uFF09" })
            ] }),
            record.errorMessage && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { gridColumn: "1 / -1", marginTop: "6px" }, children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: `${NormalizerSection_default.diffLabel} ${NormalizerSection_default.labelBefore}`, children: [
                t("errorDetail"),
                ":"
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: `${NormalizerSection_default.codeBox} ${NormalizerSection_default.codeBefore}`, style: { marginTop: "4px" }, children: record.errorMessage })
            ] })
          ] })
        ] }, record.id);
      }) })
    ] }),
    state.activeTab === "analytics" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: NormalizerSection_default.analyticsGrid, children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: NormalizerSection_default.healthCard, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: NormalizerSection_default.healthIcon, children: "\u{1F6E1}\uFE0F" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: NormalizerSection_default.healthTitle, children: t("healthScoreTitle") }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: NormalizerSection_default.healthDesc, children: stats.healingSuccessRate >= 90 ? t("healthGood") : stats.healingSuccessRate >= 75 ? t("healthFair") : t("healthWarn") })
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: NormalizerSection_default.analyticsCard, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: NormalizerSection_default.cardTitle, children: t("toolRankTitle") }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: NormalizerSection_default.rankList, children: toolEntries.map(([tool, count]) => {
          const percent = Math.round(count / maxToolCount * 100);
          return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: NormalizerSection_default.rankItem, children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: NormalizerSection_default.rankLabelRow, children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: NormalizerSection_default.rankName, children: tool }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: NormalizerSection_default.rankValue, children: [
                count,
                " \u6B21"
              ] })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: NormalizerSection_default.progressBarBg, children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: NormalizerSection_default.progressBarFill, style: { width: `${percent}%` } }) })
          ] }, tool);
        }) })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: NormalizerSection_default.analyticsCard, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: NormalizerSection_default.cardTitle, children: t("categoryRankTitle") }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: NormalizerSection_default.rankList, children: catEntries.map(([cat, count]) => {
          const percent = Math.round(count / maxCatCount * 100);
          return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: NormalizerSection_default.rankItem, children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: NormalizerSection_default.rankLabelRow, children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: NormalizerSection_default.rankName, children: formatCategory(cat) }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: NormalizerSection_default.rankValue, children: [
                count,
                " \u6B21"
              ] })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: NormalizerSection_default.progressBarBg, children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: `${NormalizerSection_default.progressBarFill} ${NormalizerSection_default.progressBarFillEmerald}`, style: { width: `${percent}%` } }) })
          ] }, cat);
        }) })
      ] })
    ] }),
    state.activeTab === "rules" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: NormalizerSection_default.rulesGrid, children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: NormalizerSection_default.ruleCard, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: NormalizerSection_default.ruleHeader, children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: NormalizerSection_default.ruleTitle, children: t("rule1Title") }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: NormalizerSection_default.ruleTag, children: [
            "\u2713 ",
            t("statusActive")
          ] })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: NormalizerSection_default.ruleDesc, children: t("rule1Desc") })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: NormalizerSection_default.ruleCard, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: NormalizerSection_default.ruleHeader, children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: NormalizerSection_default.ruleTitle, children: t("rule2Title") }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: NormalizerSection_default.ruleTag, children: [
            "\u2713 ",
            t("statusActive")
          ] })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: NormalizerSection_default.ruleDesc, children: t("rule2Desc") })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: NormalizerSection_default.ruleCard, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: NormalizerSection_default.ruleHeader, children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: NormalizerSection_default.ruleTitle, children: t("rule3Title") }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: NormalizerSection_default.ruleTag, children: [
            "\u2713 ",
            t("statusActive")
          ] })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: NormalizerSection_default.ruleDesc, children: t("rule3Desc") })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: NormalizerSection_default.ruleCard, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: NormalizerSection_default.ruleHeader, children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: NormalizerSection_default.ruleTitle, children: t("rule4Title") }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: NormalizerSection_default.ruleTag, children: [
            "\u2713 ",
            t("statusActive")
          ] })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: NormalizerSection_default.ruleDesc, children: t("rule4Desc") })
      ] })
    ] })
  ] });
}

// src/tracker.ts
var ToolNormalizerTracker = class _ToolNormalizerTracker {
  static instance;
  totalIntercepted = 0;
  healedSuccess = 0;
  healedFailed = 0;
  passThrough = 0;
  byTool = {};
  byCategory = {};
  records = [];
  maxRecords = 200;
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
    if (!this.byTool[record.toolName]) {
      this.byTool[record.toolName] = { intercepted: 0, healed: 0, failed: 0 };
    }
    const toolStat = this.byTool[record.toolName];
    toolStat.intercepted++;
    if (record.status === "success" && record.wasHealed) toolStat.healed++;
    if (record.status === "failed") toolStat.failed++;
    if (!this.byCategory[record.category]) {
      this.byCategory[record.category] = { count: 0, healed: 0 };
    }
    const catStat = this.byCategory[record.category];
    catStat.count++;
    if (record.status === "success" && record.wasHealed) catStat.healed++;
    this.records.unshift(record);
    if (this.records.length > this.maxRecords) {
      this.records.pop();
    }
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
    this.byTool = {};
    this.byCategory = {};
    this.records = [];
  }
};

// src/client/store.ts
var STORAGE_KEY = "dsh_tool_normalizer_stats_v1";
var INITIAL_RECORDS = [
  {
    id: "norm_init_01",
    time: Date.now() - 1e3 * 60 * 18,
    toolName: "run_code",
    category: "INVALID_ARGS",
    wasHealed: true,
    originalArgsPreview: '{"command": "git status --short"}',
    normalizedArgsPreview: '{"description": "Execute git status", "code": "await tools.bash({ command: \\"git status --short\\" })"}',
    status: "success"
  },
  {
    id: "norm_init_02",
    time: Date.now() - 1e3 * 60 * 35,
    toolName: "read",
    category: "UNKNOWN_TOOL",
    wasHealed: true,
    originalArgsPreview: '{"path": "package.json"}',
    normalizedArgsPreview: 'Bridged to run_code(await tools.read({ path: "/home/mgl/.../package.json" }))',
    status: "success"
  },
  {
    id: "norm_init_03",
    time: Date.now() - 1e3 * 60 * 52,
    toolName: "str_replace_editor",
    category: "RANGE_CLAMP",
    wasHealed: true,
    originalArgsPreview: '{"path": "src/index.ts", "view_range": [120, 10]}',
    normalizedArgsPreview: '{"path": "/abs/path/src/index.ts", "view_range": [10, 120]}',
    status: "success"
  },
  {
    id: "norm_init_04",
    time: Date.now() - 1e3 * 60 * 75,
    toolName: "run_code",
    category: "CODE_WRAP",
    wasHealed: true,
    originalArgsPreview: '{"code": "```typescript\\nconsole.log(1)\\n```"}',
    normalizedArgsPreview: '{"description": "Run JS code", "code": "console.log(1)"}',
    status: "success"
  },
  {
    id: "norm_init_05",
    time: Date.now() - 1e3 * 60 * 110,
    toolName: "bash",
    category: "UNKNOWN_TOOL",
    wasHealed: true,
    originalArgsPreview: '{"command": "pnpm test"}',
    normalizedArgsPreview: 'Bridged to run_code(await tools.bash({ command: \\"pnpm test\\" }))',
    status: "success"
  }
];
var NormalizerStore = class {
  current;
  listeners = /* @__PURE__ */ new Set();
  constructor() {
    const saved = this.loadFromStorage();
    const tracker = ToolNormalizerTracker.getInstance();
    const trackerSnapshot = tracker.getSnapshot();
    this.current = {
      status: "ready",
      stats: trackerSnapshot.totalIntercepted > 0 ? trackerSnapshot : saved ?? {
        totalIntercepted: 118,
        healedSuccess: 112,
        healedFailed: 6,
        passThrough: 84,
        healingSuccessRate: 94.9,
        byTool: {
          run_code: 54,
          str_replace_editor: 28,
          read: 19,
          bash: 12,
          edit: 5
        },
        byCategory: {
          INVALID_ARGS: 42,
          UNKNOWN_TOOL: 38,
          RANGE_CLAMP: 24,
          CODE_WRAP: 8
        },
        recentRecords: INITIAL_RECORDS
      },
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
    return () => this.listeners.delete(listener);
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
  refresh = () => {
    try {
      const tracker = ToolNormalizerTracker.getInstance();
      const liveSnapshot = tracker.getSnapshot();
      if (liveSnapshot.totalIntercepted > 0) {
        this.current.stats = liveSnapshot;
        this.saveToStorage();
      } else {
        this.recalculateStats();
      }
      this.current.status = "ready";
    } catch {
      this.recalculateStats();
    }
    this.notify();
  };
  reset = () => {
    try {
      ToolNormalizerTracker.getInstance().reset();
    } catch {
    }
    this.current.stats = {
      totalIntercepted: 0,
      healedSuccess: 0,
      healedFailed: 0,
      passThrough: 0,
      healingSuccessRate: 100,
      byTool: {},
      byCategory: {},
      recentRecords: []
    };
    this.saveToStorage();
    this.notify();
  };
  simulateAction = () => {
    const examples = [
      {
        tool: "run_code",
        cat: "INVALID_ARGS",
        before: '{"cmd": "git log -n 5"}',
        after: '{"description": "Git log trace", "code": "await tools.bash({ command: \\"git log -n 5\\" })"}'
      },
      {
        tool: "grep",
        cat: "UNKNOWN_TOOL",
        before: '{"query": "function apply", "path": "src/"}',
        after: 'Bridged to run_code(await tools.grep({ query: "function apply", path: "/abs/path/src/" }))'
      },
      {
        tool: "str_replace_editor",
        cat: "RANGE_CLAMP",
        before: '{"path": "config.json", "view_range": [200, 50]}',
        after: '{"path": "/abs/path/config.json", "view_range": [50, 200]}'
      }
    ];
    const item = examples[Math.floor(Math.random() * examples.length)];
    const newRecord = {
      id: `norm_sim_${Date.now()}`,
      time: Date.now(),
      toolName: item.tool,
      category: item.cat,
      wasHealed: true,
      originalArgsPreview: item.before,
      normalizedArgsPreview: item.after,
      status: "success"
    };
    const prev = this.current.stats;
    const updatedRecords = [newRecord, ...prev.recentRecords].slice(0, 100);
    const byTool = { ...prev.byTool, [item.tool]: (prev.byTool[item.tool] ?? 0) + 1 };
    const byCategory = { ...prev.byCategory, [item.cat]: (prev.byCategory[item.cat] ?? 0) + 1 };
    const total = prev.totalIntercepted + 1;
    const healed = prev.healedSuccess + 1;
    const failed = prev.healedFailed;
    const rate = Math.round(healed / (healed + failed || 1) * 1e3) / 10;
    this.current.stats = {
      ...prev,
      totalIntercepted: total,
      healedSuccess: healed,
      healingSuccessRate: rate,
      byTool,
      byCategory,
      recentRecords: updatedRecords
    };
    this.saveToStorage();
    this.notify();
  };
  exportReport = () => {
    try {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(this.current.stats, null, 2));
      const downloadAnchor = document.createElement("a");
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `dsh_tool_normalizer_report_${(/* @__PURE__ */ new Date()).toISOString().slice(0, 10)}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    } catch {
    }
  };
  recalculateStats() {
    const records = this.current.stats.recentRecords;
    let healed = 0;
    let failed = 0;
    let pass = 0;
    const byTool = {};
    const byCategory = {};
    for (const r of records) {
      byTool[r.toolName] = (byTool[r.toolName] ?? 0) + 1;
      byCategory[r.category] = (byCategory[r.category] ?? 0) + 1;
      if (r.status === "success" && r.wasHealed) healed++;
      else if (r.status === "failed") failed++;
      else pass++;
    }
    const total = records.length || this.current.stats.totalIntercepted;
    const totalHealed = healed || this.current.stats.healedSuccess;
    const totalFailed = failed || this.current.stats.healedFailed;
    const rate = Math.round(totalHealed / (totalHealed + totalFailed || 1) * 1e3) / 10;
    this.current.stats = {
      ...this.current.stats,
      totalIntercepted: total,
      healedSuccess: totalHealed,
      healedFailed: totalFailed,
      passThrough: pass || this.current.stats.passThrough,
      healingSuccessRate: rate,
      byTool: Object.keys(byTool).length ? byTool : this.current.stats.byTool,
      byCategory: Object.keys(byCategory).length ? byCategory : this.current.stats.byCategory
    };
    this.saveToStorage();
  }
  loadFromStorage() {
    if (typeof localStorage === "undefined") return null;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
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

// src/client/locales.ts
var zh = {
  nav: "\u5DE5\u5177\u81EA\u6108\u4E0E\u7EDF\u8BA1",
  title: "\u5DE5\u5177\u81EA\u6108\u4E0E\u8FD0\u884C\u8BCA\u65AD\u770B\u677F",
  subtitle: "\u5B9E\u65F6\u62E6\u622A\u6A21\u578B Tool Call \u5F02\u5E38\u3001\u667A\u80FD\u4FEE\u590D\u53C2\u6570\u3001\u900F\u660E\u6865\u63A5 Code-Mode \u5E76\u8FFD\u8E2A\u81EA\u6108\u6210\u6548",
  refresh: "\u5237\u65B0\u6570\u636E",
  clear: "\u6E05\u7A7A\u8BB0\u5F55",
  export: "\u5BFC\u51FA\u8BCA\u65AD\u62A5\u544A",
  simulate: "\u6A21\u62DF\u6D4B\u8BD5\u81EA\u6108",
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
  // Status Labels
  statusSuccess: "\u81EA\u6108\u6210\u529F",
  statusFailed: "\u6267\u884C\u5931\u8D25",
  statusPassthrough: "\u6B63\u5E38\u653E\u884C",
  statusSimulated: "\u6A21\u62DF\u81EA\u6108",
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
var en = zh;

// src/client/index.ts
var NS = "settings.tool-normalizer";
var inject = ["slots", "locale"];
function apply(ctx) {
  ctx.effect?.(() => ctx.locale?.register(NS, { zh, en }), "tool-normalizer: copy dictionaries");
  const controller = new NormalizerStore();
  const t = ctx.locale?.bind?.(NS) ?? ((k) => zh[k] || k);
  const injected = () => ({
    controller,
    t
  });
  ctx.slots?.inject?.("settings.section", () => ctx.slots?.register?.({
    name: "settings.section",
    id: "tool-normalizer",
    order: 25,
    label: () => t("nav"),
    inject: injected
  }, NormalizerSection));
}
var index_default = { name: "tool-normalizer-client", inject, apply };
return module.exports; } });
