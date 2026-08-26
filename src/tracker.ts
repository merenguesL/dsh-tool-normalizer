/**
 * In-memory statistics and audit tracker for tool normalization events.
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
  category: 'INVALID_ARGS' | 'UNKNOWN_TOOL' | 'RANGE_CLAMP' | 'CODE_WRAP' | 'FS_OBSERVED' | 'PASSTHROUGH'
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
  passThrough: number
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
 * Singleton / stateful tracker for tool normalizer events.
 */
export class ToolNormalizerTracker {
  private static instance: ToolNormalizerTracker | undefined

  private totalIntercepted = 0
  private healedSuccess = 0
  private healedFailed = 0
  private passThrough = 0
  private estimatedTokensSaved = 0
  private byTool: Record<string, number> = {}
  private byCategory: Record<string, number> = {}
  private records: NormalizerRecord[] = []
  private maxRecords = 200

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
    } else if (record.status === 'failed') {
      this.healedFailed++
    } else {
      this.passThrough++
    }

    // Tool breakdown
    this.byTool[record.toolName] = (this.byTool[record.toolName] ?? 0) + 1

    // Category breakdown
    this.byCategory[record.category] = (this.byCategory[record.category] ?? 0) + 1

    // Ring buffer for recent records
    this.records.unshift(record)
    if (this.records.length > this.maxRecords) {
      this.records.pop()
    }
  }

  /**
   * Accumulate the projected token savings for one successfully healed call.
   * Non-finite or non-positive costs are ignored.
   */
  public addEstimatedTokensSaved(cost: number): void {
    if (Number.isFinite(cost) && cost > 0) {
      this.estimatedTokensSaved += Math.round(cost)
    }
  }

  /**
   * Retrieve the current aggregate statistics snapshot.
   */
  public getSnapshot(): NormalizerStats {
    const totalHealAttempts = this.healedSuccess + this.healedFailed
    const healingSuccessRate = totalHealAttempts > 0
      ? Math.round((this.healedSuccess / totalHealAttempts) * 1000) / 10
      : 100.0

    return {
      totalIntercepted: this.totalIntercepted,
      healedSuccess: this.healedSuccess,
      healedFailed: this.healedFailed,
      passThrough: this.passThrough,
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
    this.estimatedTokensSaved = 0
    this.byTool = {}
    this.byCategory = {}
    this.records = []
  }
}
