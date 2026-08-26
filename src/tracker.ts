/**
 * In-memory statistics and audit tracker for tool normalization events.
 *
 * Counters are cumulative for the process lifetime; the durable event history
 * lives in the JSONL log (see `stats-log.ts`) whose replay rebuilds these
 * aggregates across restarts. The in-memory record ring is a bounded window
 * for dashboard transport only — it is NOT the history boundary.
 *
 * @module dsh-tool-normalizer/tracker
 */

/**
 * A single recorded tool normalization event.
 */
export interface NormalizerRecord {
  id: string
  time: number
  toolName: string
  category: 'INVALID_ARGS' | 'UNKNOWN_TOOL' | 'RANGE_CLAMP' | 'CODE_WRAP' | 'INNER_DESC' | 'FS_OBSERVED' | 'PASSTHROUGH'
  wasHealed: boolean
  originalArgsPreview: string
  normalizedArgsPreview?: string
  status: 'success' | 'failed' | 'passthrough'
  errorMessage?: string
}

/**
 * Aggregated statistics across all recorded tool executions.
 */
export interface NormalizerStats {
  totalIntercepted: number
  healedSuccess: number
  healedFailed: number
  /** Successful calls that were not modified by the normalizer. */
  passThrough: number
  /** Failed calls that reached the host without a normalization attempt. */
  passThroughFailed: number
  /** Projected input tokens avoided: healedSuccess × configured retry cost. */
  estimatedTokensSaved: number
  healingSuccessRate: number // 0 - 100
  /** Per-tool intercepted-call totals; the UI ranks and renders these directly. */
  byTool: Record<string, number>
  /** Per-category event totals; the UI ranks and renders these directly. */
  byCategory: Record<string, number>
  recentRecords: NormalizerRecord[]
}

/**
 * Whether an event is worth keeping in the detailed diagnostic trace.
 * Successful untouched calls are represented by aggregate counters instead;
 * every failure and every normalization attempt remains inspectable.
 * @param record - Event emitted by the interceptor.
 * @returns True when the event should be retained in the detailed trace.
 */
export function isDiagnosticRecord(record: NormalizerRecord): boolean {
  return record.status !== 'passthrough' || record.wasHealed
}

/**
 * Singleton / stateful tracker for tool normalizer events.
 */
export class ToolNormalizerTracker {
  private static instance: ToolNormalizerTracker | undefined

  private totalIntercepted = 0
  private healedSuccess = 0
  private healedFailed = 0
  private passThrough = 0
  private passThroughFailed = 0
  private estimatedTokensSaved = 0
  private byTool: Record<string, number> = Object.create(null) as Record<string, number>
  private byCategory: Record<string, number> = Object.create(null) as Record<string, number>
  private records: NormalizerRecord[] = []
  /** Dashboard transport window; the JSONL log holds the unbounded history. */
  private maxRecords = 1000
  private retryTokenCost = 0
  private persistPassthrough = false

  public static getInstance(): ToolNormalizerTracker {
    if (!ToolNormalizerTracker.instance) {
      ToolNormalizerTracker.instance = new ToolNormalizerTracker()
    }
    return ToolNormalizerTracker.instance
  }

  /**
   * Record one tool normalizer event.
   */
  public record(record: NormalizerRecord): void {
    this.totalIntercepted++
    if (record.status === 'success' && record.wasHealed) {
      this.healedSuccess++
    } else if (record.status === 'failed' && record.wasHealed) {
      this.healedFailed++
    } else if (record.status === 'failed') {
      this.passThroughFailed++
    } else {
      this.passThrough++
    }

    // Tool breakdown
    this.byTool[record.toolName] = (this.byTool[record.toolName] ?? 0) + 1

    // Category breakdown
    this.byCategory[record.category] = (this.byCategory[record.category] ?? 0) + 1

    // Token-savings projection accrues with the healed event itself
    if (record.status === 'success' && record.wasHealed && this.retryTokenCost > 0) {
      this.estimatedTokensSaved += Math.round(this.retryTokenCost)
    }

    // Ring buffer for recent records
    if (this.persistPassthrough || isDiagnosticRecord(record)) {
      this.records.unshift(record)
      if (this.records.length > this.maxRecords) {
        this.records.pop()
      }
    }
  }

  /**
   * Select whether successful untouched calls appear in the detailed ring.
   * Aggregate counters are unaffected by this presentation setting.
   * @param enabled - Include successful pass-through calls when true.
   */
  public setPersistPassthrough(enabled: boolean): void {
    this.persistPassthrough = enabled
    if (!enabled) this.records = this.records.filter(isDiagnosticRecord)
  }

  /**
   * Set the per-healed-call token-cost estimate used by the projection.
   * Non-finite or non-positive values disable the projection.
   */
  public setRetryTokenCost(cost: number): void {
    this.retryTokenCost = Number.isFinite(cost) && cost > 0 ? cost : 0
  }

  /**
   * Rebuild aggregates from a replayed history (JSONL log restore). Counters
   * and maps are replaced wholesale; the record ring keeps the newest window
   * of the supplied events.
   */
  public restore(stats: NormalizerStats): void {
    this.totalIntercepted = stats.totalIntercepted
    this.healedSuccess = stats.healedSuccess
    this.healedFailed = stats.healedFailed
    this.passThrough = stats.passThrough
    this.passThroughFailed = stats.passThroughFailed
    this.estimatedTokensSaved = stats.estimatedTokensSaved
    this.byTool = Object.assign(Object.create(null), stats.byTool) as Record<string, number>
    this.byCategory = Object.assign(Object.create(null), stats.byCategory) as Record<string, number>
    this.records = [...stats.recentRecords]
      .filter(record => this.persistPassthrough || isDiagnosticRecord(record))
      .sort((a, b) => b.time - a.time)
      .slice(0, this.maxRecords)
  }

  /**
   * Retrieve the current aggregate statistics snapshot.
   */
  public getSnapshot(): NormalizerStats {
    const totalHealAttempts = this.healedSuccess + this.healedFailed
    const healingSuccessRate = totalHealAttempts > 0
      ? Math.round((this.healedSuccess / totalHealAttempts) * 1000) / 10
      : 0

    return {
      totalIntercepted: this.totalIntercepted,
      healedSuccess: this.healedSuccess,
      healedFailed: this.healedFailed,
      passThrough: this.passThrough,
      passThroughFailed: this.passThroughFailed,
      estimatedTokensSaved: this.estimatedTokensSaved,
      healingSuccessRate,
      byTool: { ...this.byTool },
      byCategory: { ...this.byCategory },
      recentRecords: [...this.records],
    }
  }

  /**
   * Reset tracking metrics.
   */
  public reset(): void {
    this.totalIntercepted = 0
    this.healedSuccess = 0
    this.healedFailed = 0
    this.passThrough = 0
    this.passThroughFailed = 0
    this.estimatedTokensSaved = 0
    this.byTool = Object.create(null) as Record<string, number>
    this.byCategory = Object.create(null) as Record<string, number>
    this.records = []
  }
}
