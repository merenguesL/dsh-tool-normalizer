window.__ModuleLoader__.load({ id: "dsh-tool-normalizer", factory: (require) => {
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
var css = ".dsh_tn_container {\n  display: flex;\n  flex-direction: column;\n  gap: 24px;\n  padding: 8px 4px 32px;\n  color: var(--dsh-text-primary, #1e293b);\n  font-family: inherit;\n}\n\n.dsh_tn_header {\n  display: flex;\n  justify-content: space-between;\n  align-items: flex-start;\n  gap: 16px;\n}\n\n.dsh_tn_titleGroup h2 {\n  margin: 0 0 4px 0;\n  font-size: 20px;\n  font-weight: 600;\n}\n\n.dsh_tn_subtitle {\n  margin: 0;\n  font-size: 13px;\n  color: var(--dsh-text-secondary, #64748b);\n}\n\n.dsh_tn_headerActions {\n  display: flex;\n  gap: 8px;\n}\n\n.dsh_tn_btnPrimary, .dsh_tn_btnSecondary {\n  display: inline-flex;\n  align-items: center;\n  gap: 6px;\n  padding: 6px 14px;\n  font-size: 13px;\n  font-weight: 500;\n  border-radius: 6px;\n  cursor: pointer;\n  transition: all 0.dsh_tn_15s ease;\n  border: 1px solid transparent;\n}\n\n.dsh_tn_btnPrimary {\n  background: var(--dsh-color-primary, #2563eb);\n  color: #ffffff;\n}\n\n.dsh_tn_btnPrimary:hover {\n  background: var(--dsh-color-primary-hover, #1d4ed8);\n}\n\n.dsh_tn_btnSecondary {\n  background: var(--dsh-bg-muted, #f1f5f9);\n  color: var(--dsh-text-primary, #334155);\n  border-color: var(--dsh-border-color, #e2e8f0);\n}\n\n.dsh_tn_btnSecondary:hover {\n  background: var(--dsh-bg-hover, #e2e8f0);\n}\n\n.dsh_tn_kpiGrid {\n  display: grid;\n  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));\n  gap: 16px;\n}\n\n.dsh_tn_kpiCard {\n  background: var(--dsh-bg-card, #ffffff);\n  border: 1px solid var(--dsh-border-color, #e2e8f0);\n  border-radius: 8px;\n  padding: 16px;\n  display: flex;\n  flex-direction: column;\n  gap: 6px;\n  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.dsh_tn_04);\n}\n\n.dsh_tn_kpiTitle {\n  font-size: 12px;\n  font-weight: 500;\n  color: var(--dsh-text-secondary, #64748b);\n  text-transform: uppercase;\n  letter-spacing: 0.dsh_tn_03em;\n}\n\n.dsh_tn_kpiValue {\n  font-size: 24px;\n  font-weight: 700;\n  color: var(--dsh-text-primary, #0f172a);\n}\n\n.dsh_tn_kpiValueSuccess {\n  color: #10b981;\n}\n\n.dsh_tn_kpiValueRate {\n  color: #3b82f6;\n}\n\n.dsh_tn_kpiValueFailed {\n  color: #ef4444;\n}\n\n.dsh_tn_gridTwoCol {\n  display: grid;\n  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));\n  gap: 16px;\n}\n\n.dsh_tn_breakdownCard {\n  background: var(--dsh-bg-card, #ffffff);\n  border: 1px solid var(--dsh-border-color, #e2e8f0);\n  border-radius: 8px;\n  padding: 16px;\n  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.dsh_tn_04);\n}\n\n.dsh_tn_cardTitle {\n  margin: 0 0 16px 0;\n  font-size: 14px;\n  font-weight: 600;\n  color: var(--dsh-text-primary, #0f172a);\n}\n\n.dsh_tn_meterRow {\n  display: flex;\n  align-items: center;\n  gap: 12px;\n  margin-bottom: 10px;\n  font-size: 13px;\n}\n\n.dsh_tn_meterLabel {\n  width: 100px;\n  font-weight: 500;\n  white-space: nowrap;\n  overflow: hidden;\n  text-overflow: ellipsis;\n}\n\n.dsh_tn_meterTrack {\n  flex: 1;\n  height: 8px;\n  background: var(--dsh-bg-muted, #f1f5f9);\n  border-radius: 999px;\n  overflow: hidden;\n}\n\n.dsh_tn_meterFill {\n  height: 100%;\n  border-radius: 999px;\n  background: linear-gradient(90deg, #3b82f6, #10b981);\n}\n\n.dsh_tn_meterValue {\n  width: 90px;\n  text-align: right;\n  font-size: 12px;\n  color: var(--dsh-text-secondary, #64748b);\n}\n\n.dsh_tn_section {\n  display: flex;\n  flex-direction: column;\n  gap: 12px;\n}\n\n.dsh_tn_filterBar {\n  display: flex;\n  gap: 8px;\n}\n\n.dsh_tn_filterBtn {\n  padding: 4px 12px;\n  font-size: 12px;\n  border-radius: 999px;\n  border: 1px solid var(--dsh-border-color, #e2e8f0);\n  background: var(--dsh-bg-card, #ffffff);\n  color: var(--dsh-text-secondary, #64748b);\n  cursor: pointer;\n}\n\n.dsh_tn_filterBtnActive {\n  background: var(--dsh-color-primary, #2563eb);\n  color: #ffffff;\n  border-color: var(--dsh-color-primary, #2563eb);\n}\n\n.dsh_tn_tableContainer {\n  background: var(--dsh-bg-card, #ffffff);\n  border: 1px solid var(--dsh-border-color, #e2e8f0);\n  border-radius: 8px;\n  overflow: hidden;\n  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.dsh_tn_04);\n}\n\n.dsh_tn_table {\n  width: 100%;\n  border-collapse: collapse;\n  text-align: left;\n  font-size: 13px;\n}\n\n.dsh_tn_table th {\n  background: var(--dsh-bg-muted, #f8fafc);\n  padding: 10px 14px;\n  font-weight: 600;\n  color: var(--dsh-text-secondary, #64748b);\n  border-bottom: 1px solid var(--dsh-border-color, #e2e8f0);\n}\n\n.dsh_tn_table td {\n  padding: 10px 14px;\n  border-bottom: 1px solid var(--dsh-border-color, #f1f5f9);\n  vertical-align: middle;\n}\n\n.dsh_tn_table tr:last-child td {\n  border-bottom: none;\n}\n\n.dsh_tn_badgeSuccess {\n  display: inline-block;\n  padding: 2px 8px;\n  border-radius: 999px;\n  font-size: 11px;\n  font-weight: 600;\n  background: #dcfce7;\n  color: #15803d;\n}\n\n.dsh_tn_badgeFailed {\n  display: inline-block;\n  padding: 2px 8px;\n  border-radius: 999px;\n  font-size: 11px;\n  font-weight: 600;\n  background: #fee2e2;\n  color: #b91c1c;\n}\n\n.dsh_tn_badgePassthrough {\n  display: inline-block;\n  padding: 2px 8px;\n  border-radius: 999px;\n  font-size: 11px;\n  font-weight: 600;\n  background: #f1f5f9;\n  color: #475569;\n}\n\n.dsh_tn_codePreview {\n  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;\n  font-size: 11px;\n  background: var(--dsh-bg-muted, #f8fafc);\n  padding: 4px 8px;\n  border-radius: 4px;\n  max-width: 260px;\n  overflow: hidden;\n  text-overflow: ellipsis;\n  white-space: nowrap;\n  border: 1px solid var(--dsh-border-color, #e2e8f0);\n}\n\n.dsh_tn_emptyState {\n  padding: 40px;\n  text-align: center;\n  color: var(--dsh-text-secondary, #94a3b8);\n  font-size: 13px;\n}\n";
if (typeof document !== "undefined" && !document.querySelector('style[data-plugin="dsh-tool-normalizer"]')) {
  const tag = document.createElement("style");
  tag.dataset.plugin = "dsh-tool-normalizer";
  tag.textContent = css;
  document.head.appendChild(tag);
}
var NormalizerSection_default = { "container": "dsh_tn_container", "header": "dsh_tn_header", "titleGroup": "dsh_tn_titleGroup", "subtitle": "dsh_tn_subtitle", "headerActions": "dsh_tn_headerActions", "btnPrimary": "dsh_tn_btnPrimary", "btnSecondary": "dsh_tn_btnSecondary", "15s": "dsh_tn_15s", "kpiGrid": "dsh_tn_kpiGrid", "kpiCard": "dsh_tn_kpiCard", "04": "dsh_tn_04", "kpiTitle": "dsh_tn_kpiTitle", "03em": "dsh_tn_03em", "kpiValue": "dsh_tn_kpiValue", "kpiValueSuccess": "dsh_tn_kpiValueSuccess", "kpiValueRate": "dsh_tn_kpiValueRate", "kpiValueFailed": "dsh_tn_kpiValueFailed", "gridTwoCol": "dsh_tn_gridTwoCol", "breakdownCard": "dsh_tn_breakdownCard", "cardTitle": "dsh_tn_cardTitle", "meterRow": "dsh_tn_meterRow", "meterLabel": "dsh_tn_meterLabel", "meterTrack": "dsh_tn_meterTrack", "meterFill": "dsh_tn_meterFill", "meterValue": "dsh_tn_meterValue", "section": "dsh_tn_section", "filterBar": "dsh_tn_filterBar", "filterBtn": "dsh_tn_filterBtn", "filterBtnActive": "dsh_tn_filterBtnActive", "tableContainer": "dsh_tn_tableContainer", "table": "dsh_tn_table", "badgeSuccess": "dsh_tn_badgeSuccess", "badgeFailed": "dsh_tn_badgeFailed", "badgePassthrough": "dsh_tn_badgePassthrough", "codePreview": "dsh_tn_codePreview", "emptyState": "dsh_tn_emptyState" };

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
      }
    };
  });
  const [filter, setFilter] = (0, import_react.useState)("all");
  (0, import_react.useEffect)(() => {
    if (!controller) return;
    const unsubscribe = controller.subscribe(() => {
      setState(controller.getSnapshot());
    });
    controller.refresh();
    return unsubscribe;
  }, [controller]);
  const stats = state.stats;
  const filteredRecords = stats.recentRecords.filter((record) => {
    if (filter === "healed") return record.wasHealed && record.status === "success";
    if (filter === "failed") return record.status === "failed";
    return true;
  });
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: NormalizerSection_default.container, children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: NormalizerSection_default.header, children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: NormalizerSection_default.titleGroup, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { children: t("title") }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: NormalizerSection_default.subtitle, children: t("subtitle") })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: NormalizerSection_default.headerActions, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          "button",
          {
            type: "button",
            className: NormalizerSection_default.btnSecondary,
            onClick: () => controller?.reset(),
            children: t("clear")
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          "button",
          {
            type: "button",
            className: NormalizerSection_default.btnPrimary,
            onClick: () => controller?.refresh(),
            children: t("refresh")
          }
        )
      ] })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: NormalizerSection_default.kpiGrid, children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: NormalizerSection_default.kpiCard, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: NormalizerSection_default.kpiTitle, children: t("kpiTotal") }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: NormalizerSection_default.kpiValue, children: stats.totalIntercepted })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: NormalizerSection_default.kpiCard, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: NormalizerSection_default.kpiTitle, children: t("kpiHealed") }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: `${NormalizerSection_default.kpiValue} ${NormalizerSection_default.kpiValueSuccess}`, children: stats.healedSuccess })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: NormalizerSection_default.kpiCard, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: NormalizerSection_default.kpiTitle, children: t("kpiRate") }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: `${NormalizerSection_default.kpiValue} ${NormalizerSection_default.kpiValueRate}`, children: [
          stats.healingSuccessRate,
          "%"
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: NormalizerSection_default.kpiCard, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: NormalizerSection_default.kpiTitle, children: t("kpiFailed") }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: `${NormalizerSection_default.kpiValue} ${NormalizerSection_default.kpiValueFailed}`, children: stats.healedFailed })
      ] })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: NormalizerSection_default.gridTwoCol, children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: NormalizerSection_default.breakdownCard, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { className: NormalizerSection_default.cardTitle, children: t("toolBreakdown") }),
        Object.keys(stats.byTool).length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: NormalizerSection_default.emptyState, children: t("noData") }) : Object.entries(stats.byTool).map(([toolName, stat]) => {
          const maxVal = Math.max(...Object.values(stats.byTool).map((s) => s.intercepted), 1);
          const pct = Math.round(stat.intercepted / maxVal * 100);
          return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: NormalizerSection_default.meterRow, children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: NormalizerSection_default.meterLabel, title: toolName, children: toolName }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: NormalizerSection_default.meterTrack, children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: NormalizerSection_default.meterFill, style: { width: `${pct}%` } }) }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: NormalizerSection_default.meterValue, children: [
              stat.healed > 0 ? `+${stat.healed} \u7EA0\u504F / ` : "",
              stat.intercepted,
              " \u6B21"
            ] })
          ] }, toolName);
        })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: NormalizerSection_default.breakdownCard, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { className: NormalizerSection_default.cardTitle, children: t("categoryBreakdown") }),
        Object.keys(stats.byCategory).length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: NormalizerSection_default.emptyState, children: t("noData") }) : Object.entries(stats.byCategory).map(([cat, stat]) => {
          const maxVal = Math.max(...Object.values(stats.byCategory).map((s) => s.count), 1);
          const pct = Math.round(stat.count / maxVal * 100);
          return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: NormalizerSection_default.meterRow, children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: NormalizerSection_default.meterLabel, title: cat, children: cat }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: NormalizerSection_default.meterTrack, children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: NormalizerSection_default.meterFill, style: { width: `${pct}%` } }) }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: NormalizerSection_default.meterValue, children: [
              stat.healed,
              " / ",
              stat.count
            ] })
          ] }, cat);
        })
      ] })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: NormalizerSection_default.section, children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: NormalizerSection_default.header, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { className: NormalizerSection_default.cardTitle, children: t("recentLogs") }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: NormalizerSection_default.filterBar, children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
            "button",
            {
              type: "button",
              className: `${NormalizerSection_default.filterBtn} ${filter === "all" ? NormalizerSection_default.filterBtnActive : ""}`,
              onClick: () => setFilter("all"),
              children: t("filterAll")
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
            "button",
            {
              type: "button",
              className: `${NormalizerSection_default.filterBtn} ${filter === "healed" ? NormalizerSection_default.filterBtnActive : ""}`,
              onClick: () => setFilter("healed"),
              children: t("filterHealed")
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
            "button",
            {
              type: "button",
              className: `${NormalizerSection_default.filterBtn} ${filter === "failed" ? NormalizerSection_default.filterBtnActive : ""}`,
              onClick: () => setFilter("failed"),
              children: t("filterFailed")
            }
          )
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: NormalizerSection_default.tableContainer, children: filteredRecords.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: NormalizerSection_default.emptyState, children: t("noData") }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", { className: NormalizerSection_default.table, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: t("colTime") }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: t("colTool") }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: t("colCategory") }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: t("colStatus") }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: t("colOriginal") }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: t("colNormalized") })
        ] }) }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", { children: filteredRecords.map((r) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: new Date(r.time).toLocaleTimeString() }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: r.toolName }) }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: r.category }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("td", { children: [
            r.status === "success" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: NormalizerSection_default.badgeSuccess, children: t("statusSuccess") }),
            r.status === "failed" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: NormalizerSection_default.badgeFailed, children: t("statusFailed") }),
            r.status === "passthrough" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: NormalizerSection_default.badgePassthrough, children: t("statusPassthrough") })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: NormalizerSection_default.codePreview, title: r.originalArgsPreview, children: r.originalArgsPreview || "-" }) }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: NormalizerSection_default.codePreview, title: r.normalizedArgsPreview ?? "-", children: r.normalizedArgsPreview ?? "-" }) })
        ] }, r.id)) })
      ] }) })
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
var NormalizerStore = class {
  current = {
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
    }
  };
  listeners = /* @__PURE__ */ new Set();
  constructor() {
    this.refresh();
  }
  getSnapshot = () => {
    return this.current;
  };
  subscribe = (listener) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };
  refresh = () => {
    try {
      const tracker = ToolNormalizerTracker.getInstance();
      const stats = tracker.getSnapshot();
      this.current = {
        status: "ready",
        stats
      };
    } catch {
      this.current = {
        ...this.current,
        status: "error"
      };
    }
    this.notify();
  };
  reset = () => {
    try {
      const tracker = ToolNormalizerTracker.getInstance();
      tracker.reset();
      this.refresh();
    } catch {
    }
  };
  notify() {
    for (const listener of this.listeners) {
      listener();
    }
  }
};

// src/client/locales.ts
var zh = {
  nav: "\u5DE5\u5177\u81EA\u6108\u4E0E\u7EDF\u8BA1",
  title: "\u5DE5\u5177\u81EA\u6108\u4E0E\u8FD0\u884C\u8BCA\u65AD",
  subtitle: "\u5B9E\u65F6\u76D1\u63A7\u6A21\u578B Tool Call \u62E6\u622A\u3001\u53C2\u6570\u667A\u80FD\u7EA0\u504F\u3001Code-Mode \u900F\u660E\u6865\u63A5\u4E0E\u9519\u8BEF\u81EA\u6108\u7EDF\u8BA1",
  refresh: "\u5237\u65B0",
  clear: "\u6E05\u7A7A\u7EDF\u8BA1",
  kpiTotal: "\u62E6\u622A\u8C03\u7528\u603B\u6570",
  kpiHealed: "\u6210\u529F\u7EA0\u504F\u6B21\u6570",
  kpiRate: "\u7EA0\u504F\u6210\u529F\u7387",
  kpiFailed: "\u672A\u6062\u590D\u5F02\u5E38",
  kpiPass: "\u6B63\u5E38\u653E\u884C",
  toolBreakdown: "\u6309\u5DE5\u5177\u7EF4\u5EA6\u7EDF\u8BA1",
  categoryBreakdown: "\u6309\u95EE\u9898\u7C7B\u522B\u7EDF\u8BA1",
  recentLogs: "\u5B9E\u65F6\u8FD0\u884C\u4E0E\u7EA0\u6B63\u8BB0\u5F55",
  colTime: "\u65F6\u95F4",
  colTool: "\u5DE5\u5177\u540D\u79F0",
  colCategory: "\u7EA0\u504F\u7C7B\u522B",
  colStatus: "\u72B6\u6001",
  colOriginal: "\u539F\u59CB\u8F93\u5165\u53C2\u6570",
  colNormalized: "\u7EA0\u504F\u540E\u53C2\u6570/\u64CD\u4F5C",
  statusSuccess: "\u7EA0\u6B63\u6210\u529F",
  statusFailed: "\u6267\u884C\u5931\u8D25",
  statusPassthrough: "\u6B63\u5E38\u653E\u884C",
  filterAll: "\u5168\u90E8\u8BB0\u5F55",
  filterHealed: "\u4EC5\u770B\u7EA0\u6B63",
  filterFailed: "\u4EC5\u770B\u5931\u8D25",
  noData: "\u6682\u65E0\u8FD0\u884C\u8BB0\u5F55",
  tool: "\u5DE5\u5177",
  calls: "\u8C03\u7528",
  heals: "\u7EA0\u6B63",
  fails: "\u5931\u8D25"
};
var en = {
  nav: "Tool Normalizer",
  title: "Tool Normalizer & Diagnostics",
  subtitle: "Real-time monitoring of tool call interceptions, auto-healing, and Code-Mode direct bridging",
  refresh: "Refresh",
  clear: "Clear Stats",
  kpiTotal: "Total Invocations",
  kpiHealed: "Auto-Healed",
  kpiRate: "Healing Rate",
  kpiFailed: "Unrecovered Errors",
  kpiPass: "Passthrough",
  toolBreakdown: "Statistics by Tool",
  categoryBreakdown: "Statistics by Category",
  recentLogs: "Execution & Healing Records",
  colTime: "Time",
  colTool: "Tool",
  colCategory: "Category",
  colStatus: "Status",
  colOriginal: "Original Arguments",
  colNormalized: "Normalized Arguments / Action",
  statusSuccess: "Healed",
  statusFailed: "Failed",
  statusPassthrough: "Passthrough",
  filterAll: "All Records",
  filterHealed: "Healed Only",
  filterFailed: "Failed Only",
  noData: "No records available",
  tool: "Tool",
  calls: "Calls",
  heals: "Healed",
  fails: "Failed"
};

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
