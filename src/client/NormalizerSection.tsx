/**
 * Statistics and diagnostics UI section for tool-normalizer.
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
    }
  })

  const [filter, setFilter] = useState<'all' | 'healed' | 'failed'>('all')

  useEffect(() => {
    if (!controller) return
    const unsubscribe = controller.subscribe(() => {
      setState(controller.getSnapshot())
    })
    controller.refresh()
    return unsubscribe
  }, [controller])

  const stats = state.stats
  const filteredRecords = stats.recentRecords.filter((record) => {
    if (filter === 'healed') return record.wasHealed && record.status === 'success'
    if (filter === 'failed') return record.status === 'failed'
    return true
  })

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
            className={styles.btnSecondary}
            onClick={() => controller?.reset()}
          >
            {t('clear')}
          </button>
          <button
            type="button"
            className={styles.btnPrimary}
            onClick={() => controller?.refresh()}
          >
            {t('refresh')}
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className={styles.kpiGrid}>
        <div className={styles.kpiCard}>
          <span className={styles.kpiTitle}>{t('kpiTotal')}</span>
          <span className={styles.kpiValue}>{stats.totalIntercepted}</span>
        </div>
        <div className={styles.kpiCard}>
          <span className={styles.kpiTitle}>{t('kpiHealed')}</span>
          <span className={`${styles.kpiValue} ${styles.kpiValueSuccess}`}>{stats.healedSuccess}</span>
        </div>
        <div className={styles.kpiCard}>
          <span className={styles.kpiTitle}>{t('kpiRate')}</span>
          <span className={`${styles.kpiValue} ${styles.kpiValueRate}`}>{stats.healingSuccessRate}%</span>
        </div>
        <div className={styles.kpiCard}>
          <span className={styles.kpiTitle}>{t('kpiFailed')}</span>
          <span className={`${styles.kpiValue} ${styles.kpiValueFailed}`}>{stats.healedFailed}</span>
        </div>
      </div>

      {/* Breakdown Grid */}
      <div className={styles.gridTwoCol}>
        {/* By Tool */}
        <div className={styles.breakdownCard}>
          <h3 className={styles.cardTitle}>{t('toolBreakdown')}</h3>
          {Object.keys(stats.byTool).length === 0 ? (
            <div className={styles.emptyState}>{t('noData')}</div>
          ) : (
            Object.entries(stats.byTool).map(([toolName, stat]) => {
              const maxVal = Math.max(...Object.values(stats.byTool).map(s => s.intercepted), 1)
              const pct = Math.round((stat.intercepted / maxVal) * 100)
              return (
                <div key={toolName} className={styles.meterRow}>
                  <span className={styles.meterLabel} title={toolName}>{toolName}</span>
                  <div className={styles.meterTrack}>
                    <div className={styles.meterFill} style={{ width: `${pct}%` }} />
                  </div>
                  <span className={styles.meterValue}>
                    {stat.healed > 0 ? `+${stat.healed} 纠偏 / ` : ''}{stat.intercepted} 次
                  </span>
                </div>
              )
            })
          )}
        </div>

        {/* By Category */}
        <div className={styles.breakdownCard}>
          <h3 className={styles.cardTitle}>{t('categoryBreakdown')}</h3>
          {Object.keys(stats.byCategory).length === 0 ? (
            <div className={styles.emptyState}>{t('noData')}</div>
          ) : (
            Object.entries(stats.byCategory).map(([cat, stat]) => {
              const maxVal = Math.max(...Object.values(stats.byCategory).map(s => s.count), 1)
              const pct = Math.round((stat.count / maxVal) * 100)
              return (
                <div key={cat} className={styles.meterRow}>
                  <span className={styles.meterLabel} title={cat}>{cat}</span>
                  <div className={styles.meterTrack}>
                    <div className={styles.meterFill} style={{ width: `${pct}%` }} />
                  </div>
                  <span className={styles.meterValue}>
                    {stat.healed} / {stat.count}
                  </span>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* Records Table */}
      <div className={styles.section}>
        <div className={styles.header}>
          <h3 className={styles.cardTitle}>{t('recentLogs')}</h3>
          <div className={styles.filterBar}>
            <button
              type="button"
              className={`${styles.filterBtn} ${filter === 'all' ? styles.filterBtnActive : ''}`}
              onClick={() => setFilter('all')}
            >
              {t('filterAll')}
            </button>
            <button
              type="button"
              className={`${styles.filterBtn} ${filter === 'healed' ? styles.filterBtnActive : ''}`}
              onClick={() => setFilter('healed')}
            >
              {t('filterHealed')}
            </button>
            <button
              type="button"
              className={`${styles.filterBtn} ${filter === 'failed' ? styles.filterBtnActive : ''}`}
              onClick={() => setFilter('failed')}
            >
              {t('filterFailed')}
            </button>
          </div>
        </div>

        <div className={styles.tableContainer}>
          {filteredRecords.length === 0 ? (
            <div className={styles.emptyState}>{t('noData')}</div>
          ) : (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>{t('colTime')}</th>
                  <th>{t('colTool')}</th>
                  <th>{t('colCategory')}</th>
                  <th>{t('colStatus')}</th>
                  <th>{t('colOriginal')}</th>
                  <th>{t('colNormalized')}</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecords.map((r) => (
                  <tr key={r.id}>
                    <td>{new Date(r.time).toLocaleTimeString()}</td>
                    <td><strong>{r.toolName}</strong></td>
                    <td>{r.category}</td>
                    <td>
                      {r.status === 'success' && (
                        <span className={styles.badgeSuccess}>{t('statusSuccess')}</span>
                      )}
                      {r.status === 'failed' && (
                        <span className={styles.badgeFailed}>{t('statusFailed')}</span>
                      )}
                      {r.status === 'passthrough' && (
                        <span className={styles.badgePassthrough}>{t('statusPassthrough')}</span>
                      )}
                    </td>
                    <td>
                      <div className={styles.codePreview} title={r.originalArgsPreview}>
                        {r.originalArgsPreview || '-'}
                      </div>
                    </td>
                    <td>
                      <div className={styles.codePreview} title={r.normalizedArgsPreview ?? '-'}>
                        {r.normalizedArgsPreview ?? '-'}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
