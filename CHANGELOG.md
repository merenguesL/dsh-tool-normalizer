# Changelog

All notable changes to this project are documented in this file.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
