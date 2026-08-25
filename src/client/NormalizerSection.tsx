/**
 * Modern, rich diagnostics and auto-healing UI dashboard for tool-normalizer.
 *
 * @module dsh-tool-normalizer/client/NormalizerSection
 */

import React, { useState, useEffect } from 'react'
import type { NormalizerKey } from './locales.ts'
import type { NormalizerStore, NormalizerState } from './store.ts'
import styles from './NormalizerSection.module.css'

export interface NormalizerSectionInjected {
  controller: NormalizerStore
  t: (key: NormalizerKey) => string
}

export interface NormalizerSectionProps {
  injected?: NormalizerSectionInjected
}

export function NormalizerSection({ injected }: NormalizerSectionProps): React.ReactElement {
  const controller = injected?.controller
  const t = injected?.t ?? ((k: NormalizerKey) => k)

  const [state, setState] = useState<NormalizerState>(() => {
    return controller ? controller.getSnapshot() : {
      status: 'idle',
      stats: {
        totalIntercepted: 0,
        healedSuccess: 0,
        healedFailed: 0,
        passThrough: 0,
        healingSuccessRate: 100,
        byTool: {},
        byCategory: {},
        recentRecords: [],
      },
      activeTab: 'live',
      searchQuery: '',
      statusFilter: 'all',
    }
  })

  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!controller) return
    const unsubscribe = controller.subscribe(() => {
      setState(controller.getSnapshot())
    })
    controller.refresh()
    return unsubscribe
  }, [controller])

  const toggleExpand = (id: string): void => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const stats = state.stats
  const filteredRecords = stats.recentRecords.filter((record) => {
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
  })

  // Format category badge text
  const formatCategory = (cat: string): string => {
    switch (cat) {
      case 'INVALID_ARGS': return t('catInvalidArgs')
      case 'UNKNOWN_TOOL': return t('catUnknownTool')
      case 'RANGE_CLAMP': return t('catRangeClamp')
      case 'CODE_WRAP': return t('catCodeWrap')
      default: return t('catPassthrough')
    }
  }

  // Calculate tool rank max for progress bars
  const toolEntries = Object.entries(stats.byTool).sort((a, b) => b[1] - a[1])
  const maxToolCount = toolEntries.length > 0 ? Math.max(...toolEntries.map((e) => e[1])) : 1

  const catEntries = Object.entries(stats.byCategory).sort((a, b) => b[1] - a[1])
  const maxCatCount = catEntries.length > 0 ? Math.max(...catEntries.map((e) => e[1])) : 1

  // Format time difference
  const formatTime = (ts: number): string => {
    const diffSec = Math.floor((Date.now() - ts) / 1000)
    if (diffSec < 60) return `${diffSec}秒前`
    const diffMin = Math.floor(diffSec / 60)
    if (diffMin < 60) return `${diffMin}分钟前`
    const diffHour = Math.floor(diffMin / 60)
    if (diffHour < 24) return `${diffHour}小时前`
    return new Date(ts).toLocaleTimeString()
  }

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.titleGroup}>
          <h2>{t('title')}</h2>
          <p className={styles.subtitle}>{t('subtitle')}</p>
        </div>
        <div className={styles.headerActions}>
          <button
            type="button"
            className={styles.btnAccent}
            onClick={() => controller?.simulateAction()}
            title="模拟触发一次工具调用异常并测试自愈修复效果"
          >
            ⚡ {t('simulate')}
          </button>
          <button
            type="button"
            className={styles.btnSecondary}
            onClick={() => controller?.exportReport()}
          >
            📥 {t('export')}
          </button>
          <button
            type="button"
            className={styles.btnSecondary}
            onClick={() => controller?.reset()}
          >
            🗑️ {t('clear')}
          </button>
          <button
            type="button"
            className={styles.btnPrimary}
            onClick={() => controller?.refresh()}
          >
            🔄 {t('refresh')}
          </button>
        </div>
      </div>

      {/* Hero KPI Cards */}
      <div className={styles.kpiGrid}>
        <div className={styles.kpiCard}>
          <span className={styles.kpiTitle}>{t('kpiRate')}</span>
          <div className={styles.kpiValueRow}>
            <span className={`${styles.kpiValue} ${styles.kpiValueRate}`}>{stats.healingSuccessRate}%</span>
          </div>
          <span className={styles.kpiDesc}>{t('kpiRateDesc')}</span>
        </div>
        <div className={styles.kpiCard}>
          <span className={styles.kpiTitle}>{t('kpiHealed')}</span>
          <div className={styles.kpiValueRow}>
            <span className={`${styles.kpiValue} ${styles.kpiValueSuccess}`}>{stats.healedSuccess}</span>
          </div>
          <span className={styles.kpiDesc}>{t('kpiHealedDesc')}</span>
        </div>
        <div className={styles.kpiCard}>
          <span className={styles.kpiTitle}>{t('kpiTotal')}</span>
          <div className={styles.kpiValueRow}>
            <span className={styles.kpiValue}>{stats.totalIntercepted}</span>
          </div>
          <span className={styles.kpiDesc}>{t('kpiTotalDesc')}</span>
        </div>
        <div className={styles.kpiCard}>
          <span className={styles.kpiTitle}>{t('kpiSavedRounds')}</span>
          <div className={styles.kpiValueRow}>
            <span className={`${styles.kpiValue} ${styles.kpiValueSuccess}`}>~{stats.healedSuccess}</span>
          </div>
          <span className={styles.kpiDesc}>{t('kpiSavedRoundsDesc')}</span>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className={styles.tabsBar}>
        <button
          type="button"
          className={`${styles.tabItem} ${state.activeTab === 'live' ? styles.tabActive : ''}`}
          onClick={() => controller?.setActiveTab('live')}
        >
          📋 {t('tabLive')} ({stats.recentRecords.length})
        </button>
        <button
          type="button"
          className={`${styles.tabItem} ${state.activeTab === 'analytics' ? styles.tabActive : ''}`}
          onClick={() => controller?.setActiveTab('analytics')}
        >
          📊 {t('tabAnalytics')}
        </button>
        <button
          type="button"
          className={`${styles.tabItem} ${state.activeTab === 'rules' ? styles.tabActive : ''}`}
          onClick={() => controller?.setActiveTab('rules')}
        >
          🛡️ {t('tabRules')}
        </button>
      </div>

      {/* TAB 1: Live Trace */}
      {state.activeTab === 'live' && (
        <>
          <div className={styles.filterBar}>
            <input
              type="text"
              className={styles.searchInput}
              placeholder={t('searchPlaceholder')}
              value={state.searchQuery}
              onChange={(e) => controller?.setSearchQuery(e.target.value)}
            />
            <div className={styles.filterPills}>
              <button
                type="button"
                className={`${styles.filterPill} ${state.statusFilter === 'all' ? styles.filterPillActive : ''}`}
                onClick={() => controller?.setStatusFilter('all')}
              >
                {t('filterAll')}
              </button>
              <button
                type="button"
                className={`${styles.filterPill} ${state.statusFilter === 'healed' ? styles.filterPillActive : ''}`}
                onClick={() => controller?.setStatusFilter('healed')}
              >
                {t('filterHealed')}
              </button>
              <button
                type="button"
                className={`${styles.filterPill} ${state.statusFilter === 'direct' ? styles.filterPillActive : ''}`}
                onClick={() => controller?.setStatusFilter('direct')}
              >
                {t('filterDirect')}
              </button>
              <button
                type="button"
                className={`${styles.filterPill} ${state.statusFilter === 'failed' ? styles.filterPillActive : ''}`}
                onClick={() => controller?.setStatusFilter('failed')}
              >
                {t('filterFailed')}
              </button>
            </div>
          </div>

          {filteredRecords.length === 0 ? (
            <div className={styles.emptyBox}>
              <div className={styles.emptyTitle}>{t('noData')}</div>
              <p className={styles.emptyDesc}>{t('noDataDesc')}</p>
            </div>
          ) : (
            <div className={styles.traceList}>
              {filteredRecords.map((record) => {
                const isExpanded = expandedIds.has(record.id)
                return (
                  <div key={record.id} className={styles.traceCard}>
                    <div className={styles.traceHeader}>
                      <div className={styles.traceLeft}>
                        <span className={styles.badgeTool}>{record.toolName}</span>
                        <span className={styles.badgeCategory}>{formatCategory(record.category)}</span>
                        {record.status === 'success' && record.wasHealed && (
                          <span className={styles.badgeSuccess}>✓ {t('statusSuccess')}</span>
                        )}
                        {record.status === 'failed' && (
                          <span className={styles.badgeFailed}>✕ {t('statusFailed')}</span>
                        )}
                        <span className={styles.timeText}>{formatTime(record.time)}</span>
                      </div>
                      <button
                        type="button"
                        className={styles.expandBtn}
                        onClick={() => toggleExpand(record.id)}
                      >
                        {isExpanded ? `▲ ${t('hideDetails')}` : `▼ ${t('diffDetails')}`}
                      </button>
                    </div>

                    {isExpanded && (
                      <div className={styles.diffContainer}>
                        <div className={styles.diffBlock}>
                          <span className={`${styles.diffLabel} ${styles.labelBefore}`}>
                            {t('beforeInput')}
                          </span>
                          <div className={`${styles.codeBox} ${styles.codeBefore}`}>
                            {record.originalArgsPreview || '{}'}
                          </div>
                        </div>
                        <div className={styles.diffBlock}>
                          <span className={`${styles.diffLabel} ${styles.labelAfter}`}>
                            {t('afterInput')}
                          </span>
                          <div className={`${styles.codeBox} ${styles.codeAfter}`}>
                            {record.normalizedArgsPreview || '（正常放行）'}
                          </div>
                        </div>
                        {record.errorMessage && (
                          <div style={{ gridColumn: '1 / -1', marginTop: '6px' }}>
                            <span className={`${styles.diffLabel} ${styles.labelBefore}`}>
                              {t('errorDetail')}:
                            </span>
                            <div className={`${styles.codeBox} ${styles.codeBefore}`} style={{ marginTop: '4px' }}>
                              {record.errorMessage}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {/* TAB 2: Analytics & Ranking */}
      {state.activeTab === 'analytics' && (
        <div className={styles.analyticsGrid}>
          {/* Health Callout */}
          <div className={styles.healthCard}>
            <span className={styles.healthIcon}>🛡️</span>
            <div>
              <div className={styles.healthTitle}>{t('healthScoreTitle')}</div>
              <p className={styles.healthDesc}>
                {stats.healingSuccessRate >= 90 ? t('healthGood') : (stats.healingSuccessRate >= 75 ? t('healthFair') : t('healthWarn'))}
              </p>
            </div>
          </div>

          {/* Tool Ranking */}
          <div className={styles.analyticsCard}>
            <div className={styles.cardTitle}>{t('toolRankTitle')}</div>
            <div className={styles.rankList}>
              {toolEntries.map(([tool, count]) => {
                const percent = Math.round((count / maxToolCount) * 100)
                return (
                  <div key={tool} className={styles.rankItem}>
                    <div className={styles.rankLabelRow}>
                      <span className={styles.rankName}>{tool}</span>
                      <span className={styles.rankValue}>{count} 次</span>
                    </div>
                    <div className={styles.progressBarBg}>
                      <div className={styles.progressBarFill} style={{ width: `${percent}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Category Ranking */}
          <div className={styles.analyticsCard}>
            <div className={styles.cardTitle}>{t('categoryRankTitle')}</div>
            <div className={styles.rankList}>
              {catEntries.map(([cat, count]) => {
                const percent = Math.round((count / maxCatCount) * 100)
                return (
                  <div key={cat} className={styles.rankItem}>
                    <div className={styles.rankLabelRow}>
                      <span className={styles.rankName}>{formatCategory(cat)}</span>
                      <span className={styles.rankValue}>{count} 次</span>
                    </div>
                    <div className={styles.progressBarBg}>
                      <div className={`${styles.progressBarFill} ${styles.progressBarFillEmerald}`} style={{ width: `${percent}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: Rules & Health */}
      {state.activeTab === 'rules' && (
        <div className={styles.rulesGrid}>
          <div className={styles.ruleCard}>
            <div className={styles.ruleHeader}>
              <span className={styles.ruleTitle}>{t('rule1Title')}</span>
              <span className={styles.ruleTag}>✓ {t('statusActive')}</span>
            </div>
            <p className={styles.ruleDesc}>{t('rule1Desc')}</p>
          </div>

          <div className={styles.ruleCard}>
            <div className={styles.ruleHeader}>
              <span className={styles.ruleTitle}>{t('rule2Title')}</span>
              <span className={styles.ruleTag}>✓ {t('statusActive')}</span>
            </div>
            <p className={styles.ruleDesc}>{t('rule2Desc')}</p>
          </div>

          <div className={styles.ruleCard}>
            <div className={styles.ruleHeader}>
              <span className={styles.ruleTitle}>{t('rule3Title')}</span>
              <span className={styles.ruleTag}>✓ {t('statusActive')}</span>
            </div>
            <p className={styles.ruleDesc}>{t('rule3Desc')}</p>
          </div>

          <div className={styles.ruleCard}>
            <div className={styles.ruleHeader}>
              <span className={styles.ruleTitle}>{t('rule4Title')}</span>
              <span className={styles.ruleTag}>✓ {t('statusActive')}</span>
            </div>
            <p className={styles.ruleDesc}>{t('rule4Desc')}</p>
          </div>
        </div>
      )}
    </div>
  )
}
