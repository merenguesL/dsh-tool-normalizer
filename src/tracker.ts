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
export type NormalizerCategory =
  | "INVALID_ARGS"
  | "UNKNOWN_TOOL"
  | "RANGE_CLAMP"
  | "CODE_WRAP"
  | "RUN_CODE_DESC"
  | "RUN_CODE_SYNTAX"
  | "INNER_DESC"
  | "FS_OBSERVED"
  | "READ_ARGS"
  | "PASSTHROUGH";

/**
 * Canonical category list. Persistence validation derives from this array so
 * a new category cannot be recorded yet dropped on log replay.
 */
export const NORMALIZER_CATEGORIES: readonly NormalizerCategory[] = [
  "INVALID_ARGS",
  "UNKNOWN_TOOL",
  "RANGE_CLAMP",
  "CODE_WRAP",
  "RUN_CODE_DESC",
  "RUN_CODE_SYNTAX",
  "INNER_DESC",
  "FS_OBSERVED",
  "READ_ARGS",
  "PASSTHROUGH",
] as const;

export interface NormalizerRecord {
  id: string;
  time: number;
  toolName: string;
  category: NormalizerCategory;
  wasHealed: boolean;
  originalArgsPreview: string;
  normalizedArgsPreview?: string;
  /** Short bounded description of the fields or dispatch path that changed. */
  normalizationSummary?: string;
  status: "success" | "failed" | "passthrough";
  errorMessage?: string;
  /**
   * Measured input tokens this healed call avoided, already multiplied by the
   * skipped model round-trips. Absent for unhealed or unmetered events.
   */
  tokensSaved?: number;
}

/**
 * Aggregated statistics across all recorded tool executions.
 */
export interface NormalizerStats {
  totalIntercepted: number;
  healedSuccess: number;
  healedFailed: number;
  /** Successful calls that were not modified by the normalizer. */
  passThrough: number;
  /** Failed calls that reached the host without a normalization attempt. */
  passThroughFailed: number;
  /** Sum of measured input tokens avoided across successful healing events. */
  estimatedTokensSaved: number;
  healingSuccessRate: number; // 0 - 100
  /** Per-tool intercepted-call totals; the UI ranks and renders these directly. */
  byTool: Record<string, number>;
  /** Per-category event totals; the UI ranks and renders these directly. */
  byCategory: Record<string, number>;
  /**
   * Per-tool failed-call totals. Distinct from {@link byTool}, which counts
   * every intercepted call: diagnostic text that claims "N failed calls" must
   * read these, never raw call volume.
   */
  failuresByTool: Record<string, number>;
  /** Per-category failed-call totals, from settled failures only. */
  failuresByCategory: Record<string, number>;
  recentRecords: NormalizerRecord[];
}

/**
 * Counter-only view used by the persistence path. It omits the bounded
 * record ring so the per-dispatch hot path avoids copying up to 1000 entries.
 */
export type NormalizerAggregate = Pick<
  NormalizerStats,
  | "totalIntercepted"
  | "healedSuccess"
  | "healedFailed"
  | "passThrough"
  | "passThroughFailed"
  | "estimatedTokensSaved"
  | "byTool"
  | "byCategory"
  | "failuresByTool"
  | "failuresByCategory"
>;

/**
 * Whether an event is worth keeping in the detailed diagnostic trace.
 * Successful untouched calls are represented by aggregate counters instead;
 * every failure and every normalization attempt remains inspectable.
 * @param record - Event emitted by the interceptor.
 * @returns True when the event should be retained in the detailed trace.
 */
export function isDiagnosticRecord(record: NormalizerRecord): boolean {
  return record.status !== "passthrough" || record.wasHealed;
}

/**
 * Singleton / stateful tracker for tool normalizer events.
 */
export class ToolNormalizerTracker {
  private static instance: ToolNormalizerTracker | undefined;

  private totalIntercepted = 0;
  private healedSuccess = 0;
  private healedFailed = 0;
  private passThrough = 0;
  private passThroughFailed = 0;
  private estimatedTokensSaved = 0;
  private byTool: Record<string, number> = Object.create(null) as Record<
    string,
    number
  >;
  private byCategory: Record<string, number> = Object.create(null) as Record<
    string,
    number
  >;
  private failuresByTool: Record<string, number> = Object.create(null) as Record<
    string,
    number
  >;
  private failuresByCategory: Record<string, number> = Object.create(
    null,
  ) as Record<string, number>;
  private records: NormalizerRecord[] = [];
  /** Dashboard transport window; the JSONL log holds the unbounded history. */
  private maxRecords = 1000;
  private persistPassthrough = false;

  public static getInstance(): ToolNormalizerTracker {
    if (!ToolNormalizerTracker.instance) {
      ToolNormalizerTracker.instance = new ToolNormalizerTracker();
    }
    return ToolNormalizerTracker.instance;
  }

  /**
   * Record one tool normalizer event.
   */
  public record(record: NormalizerRecord): void {
    this.totalIntercepted++;
    if (record.status === "success" && record.wasHealed) {
      this.healedSuccess++;
    } else if (record.status === "failed" && record.wasHealed) {
      this.healedFailed++;
    } else if (record.status === "failed") {
      this.passThroughFailed++;
    } else {
      this.passThrough++;
    }

    // Tool breakdown
    this.byTool[record.toolName] = (this.byTool[record.toolName] ?? 0) + 1;

    // Category breakdown
    this.byCategory[record.category] =
      (this.byCategory[record.category] ?? 0) + 1;

    // Real failures only: the injected diagnostics and dashboard rank these,
    // so a normalization attempt that succeeded must not inflate them.
    if (record.status === "failed") {
      this.failuresByTool[record.toolName] =
        (this.failuresByTool[record.toolName] ?? 0) + 1;
      this.failuresByCategory[record.category] =
        (this.failuresByCategory[record.category] ?? 0) + 1;
    }

    // Token-savings accrues with the healed, successful event itself; the
    // per-record figure is measured at dispatch time by the token-meter.
    if (record.status === "success" && record.wasHealed) {
      this.estimatedTokensSaved += record.tokensSaved ?? 0;
    }

    // Ring buffer for recent records
    if (this.persistPassthrough || isDiagnosticRecord(record)) {
      this.records.unshift(record);
      if (this.records.length > this.maxRecords) {
        this.records.pop();
      }
    }
  }

  /**
   * Select whether successful untouched calls appear in the detailed ring.
   * Aggregate counters are unaffected by this presentation setting.
   * @param enabled - Include successful pass-through calls when true.
   */
  public setPersistPassthrough(enabled: boolean): void {
    this.persistPassthrough = enabled;
    if (!enabled) this.records = this.records.filter(isDiagnosticRecord);
  }

  /**
   * Rebuild aggregates from a replayed history (JSONL log restore). Counters
   * and maps are replaced wholesale; the record ring keeps the newest window
   * of the supplied events.
   */
  public restore(stats: NormalizerStats): void {
    this.totalIntercepted = stats.totalIntercepted;
    this.healedSuccess = stats.healedSuccess;
    this.healedFailed = stats.healedFailed;
    this.passThrough = stats.passThrough;
    this.passThroughFailed = stats.passThroughFailed;
    this.estimatedTokensSaved = stats.estimatedTokensSaved;
    this.byTool = Object.assign(Object.create(null), stats.byTool) as Record<
      string,
      number
    >;
    this.byCategory = Object.assign(
      Object.create(null),
      stats.byCategory,
    ) as Record<string, number>;
    this.failuresByTool = Object.assign(
      Object.create(null),
      stats.failuresByTool,
    ) as Record<string, number>;
    this.failuresByCategory = Object.assign(
      Object.create(null),
      stats.failuresByCategory,
    ) as Record<string, number>;
    this.records = [...stats.recentRecords]
      .filter((record) => this.persistPassthrough || isDiagnosticRecord(record))
      .sort((a, b) => b.time - a.time)
      .slice(0, this.maxRecords);
  }

  /**
   * Retrieve the current aggregate statistics snapshot.
   * @returns Full snapshot including the bounded record ring for dashboard transport.
   */
  public getSnapshot(): NormalizerStats {
    return {
      ...this.getAggregate(),
      healingSuccessRate: this.healingRate(),
      recentRecords: [...this.records],
    };
  }

  /**
   * Retrieve counter-only aggregates without copying the record ring.
   * The persistence hot path uses this; dashboard transport uses getSnapshot.
   * @returns Counter snapshot with fresh per-tool and per-category maps.
   */
  public getAggregate(): NormalizerAggregate {
    return {
      totalIntercepted: this.totalIntercepted,
      healedSuccess: this.healedSuccess,
      healedFailed: this.healedFailed,
      passThrough: this.passThrough,
      passThroughFailed: this.passThroughFailed,
      estimatedTokensSaved: this.estimatedTokensSaved,
      byTool: { ...this.byTool },
      byCategory: { ...this.byCategory },
      failuresByTool: { ...this.failuresByTool },
      failuresByCategory: { ...this.failuresByCategory },
    };
  }

  private healingRate(): number {
    const totalHealAttempts = this.healedSuccess + this.healedFailed;
    return totalHealAttempts > 0
      ? Math.round((this.healedSuccess / totalHealAttempts) * 1000) / 10
      : 0;
  }

  /**
   * Reset tracking metrics.
   */
  public reset(): void {
    this.totalIntercepted = 0;
    this.healedSuccess = 0;
    this.healedFailed = 0;
    this.passThrough = 0;
    this.passThroughFailed = 0;
    this.estimatedTokensSaved = 0;
    this.byTool = Object.create(null) as Record<string, number>;
    this.byCategory = Object.create(null) as Record<string, number>;
    this.failuresByTool = Object.create(null) as Record<string, number>;
    this.failuresByCategory = Object.create(null) as Record<string, number>;
    this.records = [];
  }
}