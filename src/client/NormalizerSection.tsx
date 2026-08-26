/**
 * Tool-normalizer diagnostics dashboard rendered into the Settings panel.
 *
 * Every displayed number comes from the store's adopted snapshots; there is
 * no seeded demo data, so an unpopulated deployment renders the designed
 * empty state until real events arrive through the host.
 *
 * @module dsh-tool-normalizer/client/NormalizerSection
 */

import React, { useEffect, useMemo, useState } from 'react'
import { zh, type NormalizerKey } from './locales.ts'
import type { NormalizerStore, NormalizerState } from './store.ts'
import styles from './NormalizerSection.module.css'

/** Inject face supplied by the plugin registration; all members optional for bare renders. */
export interface NormalizerSectionInjected {
  controller: NormalizerStore
  t: (key: NormalizerKey) => string
}

/**
 * Full component props: the slot renderer spreads the registrant's inject
 * face as TOP-LEVEL props — there is no nested `injected` prop.
 */
export interface NormalizerSectionProps extends Partial<NormalizerSectionInjected> {}

function idleState(): NormalizerState {
  return {
    status: 'idle',
    stats: {
      totalIntercepted: 0,
      healedSuccess: 0,
      healedFailed: 0,
      passThrough: 0,
      passThroughFailed: 0,
      estimatedTokensSaved: 0,
      healingSuccessRate: 0,
      byTool: {},
      byCategory: {},
      recentRecords: [],
    },
    activeTab: 'live',
    searchQuery: '',
    statusFilter: 'all',
  }
}

export function NormalizerSection(props: NormalizerSectionProps): React.ReactElement {
  const controller = props.controller
  const t = (k: NormalizerKey): string => {
    const v = props.t?.(k)
    if (v && v !== k) return v
    return zh[k] || k
  }

  const [state, setState] = useState<NormalizerState>(() => controller?.getSnapshot() ?? idleState())
  const [expandedIds, setExpandedIds] = useState<ReadonlySet<string>>(new Set())
  const [copiedKey, setCopiedKey] = useState<string | null>(null)

  useEffect(() => {
    if (!controller) return
    const unsubscribe = controller.subscribe(() => { setState(controller.getSnapshot()) })
    controller.refresh()
    // Keep relative timestamps and any adopted feed fresh while visible.
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') controller.refresh()
    }, 15_000)
    return () => {
      unsubscribe()
      window.clearInterval(timer)
    }
  }, [controller])

  const toggleExpand = (id: string): void => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const copyText = (key: string, text: string): void => {
    void navigator.clipboard?.writeText(text).then(() => {
      setCopiedKey(key)
      window.setTimeout(() => {
        setCopiedKey((current) => (current === key ? null : current))
      }, 1500)
    }).catch(() => { /* clipboard unavailable — the button simply stays inert */ })
  }

  const stats = state.stats

  const filteredRecords = useMemo(() => stats.recentRecords.filter((record) => {
    if (state.statusFilter === 'healed' && (!record.wasHealed || record.status !== 'success')) return false
    if (state.statusFilter === 'failed' && record.status !== 'failed') return false
    if (state.statusFilter === 'direct' && record.category !== 'UNKNOWN_TOOL') return false

    if (state.searchQuery) {
      const q = state.searchQuery.toLowerCase()
      const matchTool = record.toolName.toLowerCase().includes(q)
      const matchCat = record.category.toLowerCase().includes(q)
      const matchRaw = (record.originalArgsPreview || '').toLowerCase().includes(q)
      const matchNorm = (record.normalizedArgsPreview || '').toLowerCase().includes(q)
      if (!matchTool && !matchCat && !matchRaw && !matchNorm) return false
    }
    return true
  }), [stats.recentRecords, state.statusFilter, state.searchQuery])

  const formatCategory = (cat: string): string => {
    switch (cat) {
      case 'INVALID_ARGS': return t('catInvalidArgs')
      case 'UNKNOWN_TOOL': return t('catUnknownTool')
      case 'RANGE_CLAMP': return t('catRangeClamp')
      case 'CODE_WRAP': return t('catCodeWrap')
      case 'INNER_DESC': return t('catInnerDesc')
      case 'FS_OBSERVED': return t('catFsObserved')
      case 'PASSTHROUGH': return t('statusPassthrough')
      default: return cat
    }
  }

  const formatTime = (ts: number): string => {
    const diffSec = Math.floor((Date.now() - ts) / 1000)
    if (diffSec < 60) return `${diffSec}秒前`
    const diffMin = Math.floor(diffSec / 60)
    if (diffMin < 60) return `${diffMin}分钟前`
    const diffHour = Math.floor(diffMin / 60)
    if (diffHour < 24) return `${diffHour}小时前`
    return new Date(ts).toLocaleString()
  }

  const rankEntries = (source: Record<string, number>): Array<[string, number]> =>
    Object.entries(source).sort((a, b) => b[1] - a[1])
  const maxOf = (entries: Array<[string, number]>): number =>
    entries.length > 0 ? Math.max(...entries.map(e => e[1])) : 1

  const hasData = stats.totalIntercepted > 0

  const formatTokens = (n: number): string =>
    n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M`
      : n >= 1_000 ? `${(n / 1_000).toFixed(1)}k`
        : String(n)

  const renderRanking = (title: string, entries: Array<[string, number]>, tone: 'accent' | 'success'): React.ReactElement => {
    const max = maxOf(entries)
    return (
      <div className={styles.rankCard}>
        <div className={styles.cardTitle}>{title}</div>
        {entries.length === 0 ? (
          <p className={styles.rankEmpty}>{t('noData')}</p>
        ) : (
          <div className={styles.rankList}>
            {entries.map(([name, count]) => (
              <div key={name} className={styles.rankItem}>
                <div className={styles.rankLabelRow}>
                  <span className={styles.rankName} title={formatCategory(name)}>{formatCategory(name)}</span>
                  <span className={styles.rankValue}>{count} {t('times')}</span>
                </div>
                <div className={styles.barBg}>
                  <div
                    className={tone === 'accent' ? styles.barFillAccent : styles.barFillSuccess}
                    style={{ width: `${Math.max(6, Math.round((count / max) * 100))}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className={styles.container}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.titleGroup}>
          <div className={styles.titleRow}>
            <h2 className={styles.title}>{t('title')}</h2>
            <span className={styles.versionBadge} title="plugin version">v{__DSH_TOOL_NORMALIZER_VERSION__}</span>
          </div>
          <p className={styles.subtitle}>{t('subtitle')}</p>
        </div>
        <div className={styles.headerActions}>
          <button type="button" className={styles.btnGhost} onClick={() => controller?.refresh()}>
            <span className={styles.btnIcon}>⟳</span>{t('refresh')}
          </button>
          <button type="button" className={styles.btnGhost} onClick={() => controller?.exportReport()} disabled={!hasData}>
            <span className={styles.btnIcon}>⤓</span>{t('export')}
          </button>
          <button type="button" className={styles.btnDanger} onClick={() => controller?.reset()} disabled={!hasData}>
            <span className={styles.btnIcon}>⌫</span>{t('clear')}
          </button>
        </div>
      </header>

      {/* KPI row */}
      <section className={styles.kpiGrid}>
        <div className={styles.kpiCard}>
          <span className={styles.kpiTitle}>{t('kpiRate')}</span>
          <span className={`${styles.kpiValue} ${styles.kpiValueAccent}`}>{stats.healingSuccessRate}%</span>
          <span className={styles.kpiDesc}>{t('kpiRateDesc')}</span>
        </div>
        <div className={styles.kpiCard}>
          <span className={styles.kpiTitle}>{t('kpiHealed')}</span>
          <span className={`${styles.kpiValue} ${styles.kpiValueSuccess}`}>{stats.healedSuccess}</span>
          <span className={styles.kpiDesc}>{t('kpiHealedDesc')}</span>
        </div>
        <div className={styles.kpiCard}>
          <span className={styles.kpiTitle}>{t('kpiTotal')}</span>
          <span className={styles.kpiValue}>{stats.totalIntercepted}</span>
          <span className={styles.kpiDesc}>{t('kpiTotalDesc')}</span>
        </div>
        <div className={styles.kpiCard}>
          <span className={styles.kpiTitle}>{t('kpiFailed')}</span>
          <span className={`${styles.kpiValue} ${stats.healedFailed + stats.passThroughFailed > 0 ? styles.kpiValueDanger : ''}`}>{stats.healedFailed + stats.passThroughFailed}</span>
          <span className={styles.kpiDesc}>{t('kpiFailedDesc')}</span>
        </div>
        <div className={styles.kpiCard}>
          <span className={styles.kpiTitle}>
            {t('kpiSavedTokens')}
            <span className={styles.estimateBadge}>{t('estimateBadge')}</span>
          </span>
          <span className={`${styles.kpiValue} ${styles.kpiValueSuccess}`}>{formatTokens(stats.estimatedTokensSaved)}</span>
          <span className={styles.kpiDesc}>{t('kpiSavedTokensDesc')}</span>
        </div>
      </section>

      {/* Tabs */}
      <nav className={styles.tabsBar} role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={state.activeTab === 'live'}
          className={`${styles.tabItem} ${state.activeTab === 'live' ? styles.tabActive : ''}`}
          onClick={() => controller?.setActiveTab('live')}
        >
          {t('tabLive')}
          <span className={styles.tabCount}>{stats.recentRecords.length}</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={state.activeTab === 'analytics'}
          className={`${styles.tabItem} ${state.activeTab === 'analytics' ? styles.tabActive : ''}`}
          onClick={() => controller?.setActiveTab('analytics')}
        >
          {t('tabAnalytics')}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={state.activeTab === 'rules'}
          className={`${styles.tabItem} ${state.activeTab === 'rules' ? styles.tabActive : ''}`}
          onClick={() => controller?.setActiveTab('rules')}
        >
          {t('tabRules')}
        </button>
      </nav>

      {/* TAB: live trace */}
      {state.activeTab === 'live' && (
        <section className={styles.livePane}>
          {!hasData ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>🛡️</div>
              <div className={styles.emptyTitle}>{t('noData')}</div>
              <p className={styles.emptyDesc}>{t('noDataDesc')}</p>
            </div>
          ) : (
            <>
              <div className={styles.toolbar}>
                <input
                  type="search"
                  className={styles.searchInput}
                  placeholder={t('searchPlaceholder')}
                  value={state.searchQuery}
                  onChange={(e) => controller?.setSearchQuery(e.target.value)}
                />
                <div className={styles.pills}>
                  {([
                    ['all', t('filterAll'), stats.recentRecords.length],
                    ['healed', t('filterHealed'), stats.recentRecords.filter(r => r.wasHealed && r.status === 'success').length],
                    ['failed', t('filterFailed'), stats.recentRecords.filter(r => r.status === 'failed').length],
                    ['direct', t('filterDirect'), stats.recentRecords.filter(r => r.category === 'UNKNOWN_TOOL').length],
                  ] as const).map(([key, label, count]) => (
                    <button
                      key={key}
                      type="button"
                      className={`${styles.pill} ${state.statusFilter === key ? styles.pillActive : ''}`}
                      onClick={() => controller?.setStatusFilter(key)}
                    >
                      {label}
                      <span className={styles.countBadge}>{count}</span>
                    </button>
                  ))}
                </div>
              </div>

              {filteredRecords.length === 0 ? (
                <div className={styles.emptyState}>
                  <div className={styles.emptyTitle}>{t('noData')}</div>
                </div>
              ) : (
                <ul className={styles.traceList}>
                  {filteredRecords.map((record) => {
                    const isExpanded = expandedIds.has(record.id)
                    return (
                      <li key={record.id} className={styles.traceCard}>
                        <div className={styles.traceHeader}>
                          <div className={styles.traceMeta}>
                            <span className={styles.badgeTool}>{record.toolName}</span>
                            <span className={styles.badgeCategory}>{formatCategory(record.category)}</span>
                            <span
                              className={`${styles.statusDot} ${record.status === 'failed'
                                ? styles.statusDotFail
                                : (record.wasHealed && record.status === 'success' ? styles.statusDotOk : styles.statusDotPass)}`}
                            />
                            <span className={`${styles.statusText} ${record.status === 'failed' ? styles.statusTextFail : ''}`}>
                              {record.status === 'failed' ? t('statusFailed')
                                : (record.wasHealed ? t('statusSuccess') : t('statusPassthrough'))}
                            </span>
                          </div>
                          <div className={styles.traceSide}>
                            <span className={styles.timeText}>{formatTime(record.time)}</span>
                            <button
                              type="button"
                              className={styles.expandBtn}
                              aria-expanded={isExpanded}
                              onClick={() => toggleExpand(record.id)}
                            >
                              {isExpanded ? `▲ ${t('hideDetails')}` : `▼ ${t('diffDetails')}`}
                            </button>
                          </div>
                        </div>

                        {isExpanded && (
                          <div className={styles.diffGrid}>
                            <div className={styles.diffBlock}>
                              <div className={styles.diffLabelRow}>
                                <span className={`${styles.diffLabel} ${styles.diffLabelBefore}`}>{t('beforeInput')}</span>
                                <button
                                  type="button"
                                  className={styles.copyBtn}
                                  onClick={() => copyText(`${record.id}:before`, record.originalArgsPreview || '{}')}
                                >
                                  {copiedKey === `${record.id}:before` ? '✓' : '⧉'}
                                </button>
                              </div>
                              <pre className={`${styles.codeBox} ${styles.codeBefore}`}>{record.originalArgsPreview || '{}'}</pre>
                            </div>
                            <div className={styles.diffBlock}>
                              <div className={styles.diffLabelRow}>
                                <span className={`${styles.diffLabel} ${styles.diffLabelAfter}`}>{t('afterInput')}</span>
                                <button
                                  type="button"
                                  className={styles.copyBtn}
                                  onClick={() => copyText(`${record.id}:after`, record.normalizedArgsPreview || '')}
                                >
                                  {copiedKey === `${record.id}:after` ? '✓' : '⧉'}
                                </button>
                              </div>
                              <pre className={`${styles.codeBox} ${styles.codeAfter}`}>{record.normalizedArgsPreview || '（正常放行）'}</pre>
                            </div>
                            {record.errorMessage && (
                              <div className={styles.errorBlock}>
                                <span className={`${styles.diffLabel} ${styles.diffLabelBefore}`}>{t('errorDetail')}</span>
                                <pre className={`${styles.codeBox} ${styles.codeError}`}>{record.errorMessage}</pre>
                              </div>
                            )}
                          </div>
                        )}
                      </li>
                    )
                  })}
                </ul>
              )}
            </>
          )}
        </section>
      )}

      {/* TAB: analytics */}
      {state.activeTab === 'analytics' && (
        <section className={styles.analyticsPane}>
          <div className={`${styles.healthCard} ${!hasData ? styles.healthCardMuted : ''}`}>
            <span className={styles.healthIcon}>🛡️</span>
            <div>
              <div className={styles.healthTitle}>{t('healthScoreTitle')}</div>
              <p className={styles.healthDesc}>
                {hasData
                  ? (stats.healingSuccessRate >= 90 ? t('healthGood') : (stats.healingSuccessRate >= 75 ? t('healthFair') : t('healthWarn')))
                  : t('noDataDesc')}
              </p>
            </div>
          </div>
          <div className={styles.rankGrid}>
            {renderRanking(t('toolRankTitle'), rankEntries(stats.byTool), 'accent')}
            {renderRanking(t('categoryRankTitle'), rankEntries(stats.byCategory), 'success')}
          </div>
        </section>
      )}

      {/* TAB: rules */}
      {state.activeTab === 'rules' && (
        <section className={styles.rulesGrid}>
          {([1, 2, 3, 4, 5] as const).map((n) => (
            <article key={n} className={styles.ruleCard}>
              <div className={styles.ruleHead}>
                <h3 className={styles.ruleTitle}>{t(`rule${n}Title` as NormalizerKey)}</h3>
                <span className={styles.ruleTag}>✓ {t('statusActive')}</span>
              </div>
              <p className={styles.ruleDesc}>{t(`rule${n}Desc` as NormalizerKey)}</p>
            </article>
          ))}
        </section>
      )}
    </div>
  )
}
