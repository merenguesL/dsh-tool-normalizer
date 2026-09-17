/**
 * Durable JSONL diagnostics and compact aggregate statistics for the
 * normalizer.
 *
 * Successful untouched calls are not detailed events by default. They still
 * contribute to the aggregate snapshot, while failures and normalization
 * attempts retain their before/after/error evidence in JSONL.
 *
 * @module dsh-tool-normalizer/stats-log
 */

import {
  appendFile,
  mkdir,
  readFile,
  rename,
  stat,
  unlink,
  writeFile,
} from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import {
  isDiagnosticRecord,
  NORMALIZER_CATEGORIES,
  ToolNormalizerTracker,
  type NormalizerAggregate,
  type NormalizerRecord,
  type NormalizerStats,
} from "./tracker.ts";

const SUMMARY_VERSION = 1;
const SUMMARY_FLUSH_DELAY_MS = 1000;
/** Detail log rotates above this size; the newest slice below is retained. */
const LOG_SIZE_CAP_BYTES = 2 * 1024 * 1024;
const LOG_COMPACT_KEEP_BYTES = 1024 * 1024;
/** Runtime size checks run this often (detail appends); boot always checks. */
const LOG_SIZE_CHECK_EVERY_APPENDS = 128;

/** Event log lives under the DSH home directory (default ~/.dsh). */
export function statsLogPath(): string {
  const home = process.env["DSH_HOME"] ?? join(homedir(), ".dsh");
  return join(home, "tool-normalizer-events.jsonl");
}

/** Compact aggregate file paired with {@link statsLogPath}. */
export function statsSummaryPath(): string {
  return join(dirname(statsLogPath()), "tool-normalizer-summary.json");
}

/** Persisted counters; detailed recent records remain in the JSONL file. */
interface PersistedAggregate {
  version: number;
  updatedAt: number;
  totalIntercepted: number;
  healedSuccess: number;
  healedFailed: number;
  passThrough: number;
  passThroughFailed: number;
  estimatedTokensSaved: number;
  byTool: Record<string, number>;
  byCategory: Record<string, number>;
  /**
   * Failure-only breakdowns. Optional so a summary written before they
   * existed still loads: its counters stay valid and these start empty.
   */
  failuresByTool?: Record<string, number>;
  failuresByCategory?: Record<string, number>;
}

const CATEGORIES = new Set<NormalizerRecord["category"]>(
  NORMALIZER_CATEGORIES,
);

const STATUSES = new Set<NormalizerRecord["status"]>([
  "success",
  "failed",
  "passthrough",
]);

/** Serialized file operations prevent reset, append, and summary writes from overtaking each other. */
let writeQueue: Promise<void> = Promise.resolve();
let pendingSummary: PersistedAggregate | undefined;
let summaryTimer: ReturnType<typeof setTimeout> | undefined;
let writeGeneration = 0;

/**
 * True inside the plugin's own unit-test runs. Tests must not read or mutate
 * the developer's durable normalizer history.
 */
function isTestRun(): boolean {
  return (
    process.env["VITEST"] !== undefined || process.env["NODE_ENV"] === "test"
  );
}

function isRecordObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function finiteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function nonNegativeCount(value: unknown): value is number {
  return finiteNumber(value) && Number.isSafeInteger(value) && value >= 0;
}

function validRecord(value: unknown): value is NormalizerRecord {
  if (!isRecordObject(value)) return false;
  if (typeof value.id !== "string" || value.id.length === 0) return false;
  if (!finiteNumber(value.time)) return false;
  if (typeof value.toolName !== "string" || value.toolName.length === 0)
    return false;
  if (!CATEGORIES.has(value.category as NormalizerRecord["category"]))
    return false;
  if (typeof value.wasHealed !== "boolean") return false;
  if (typeof value.originalArgsPreview !== "string") return false;
  if (!STATUSES.has(value.status as NormalizerRecord["status"])) return false;
  if (
    value.normalizedArgsPreview !== undefined &&
    typeof value.normalizedArgsPreview !== "string"
  )
    return false;
  if (
    value.normalizationSummary !== undefined &&
    typeof value.normalizationSummary !== "string"
  )
    return false;
  if (
    value.errorMessage !== undefined &&
    typeof value.errorMessage !== "string"
  )
    return false;
  if (value.tokensSaved !== undefined && !nonNegativeCount(value.tokensSaved))
    return false;
  return true;
}

function safeCountMap(value: unknown): Record<string, number> {
  if (!isRecordObject(value)) return {};
  const result: Record<string, number> = Object.create(null) as Record<
    string,
    number
  >;
  for (const [key, count] of Object.entries(value)) {
    if (nonNegativeCount(count)) result[key] = count;
  }
  return result;
}

function validAggregate(value: unknown): value is PersistedAggregate {
  if (!isRecordObject(value) || value.version !== SUMMARY_VERSION) return false;
  return (
    finiteNumber(value.updatedAt) &&
    nonNegativeCount(value.totalIntercepted) &&
    nonNegativeCount(value.healedSuccess) &&
    nonNegativeCount(value.healedFailed) &&
    nonNegativeCount(value.passThrough) &&
    nonNegativeCount(value.passThroughFailed) &&
    nonNegativeCount(value.estimatedTokensSaved) &&
    isRecordObject(value.byTool) &&
    isRecordObject(value.byCategory)
  );
}

function accumulateRecord(
  totals: Pick<
    PersistedAggregate,
    | "totalIntercepted"
    | "healedSuccess"
    | "healedFailed"
    | "passThrough"
    | "passThroughFailed"
  >,
  byTool: Record<string, number>,
  byCategory: Record<string, number>,
  failuresByTool: Record<string, number>,
  failuresByCategory: Record<string, number>,
  record: NormalizerRecord,
): void {
  totals.totalIntercepted++;
  if (record.status === "success" && record.wasHealed) totals.healedSuccess++;
  else if (record.status === "failed" && record.wasHealed)
    totals.healedFailed++;
  else if (record.status === "failed") totals.passThroughFailed++;
  else totals.passThrough++;

  byTool[record.toolName] = (byTool[record.toolName] ?? 0) + 1;
  byCategory[record.category] = (byCategory[record.category] ?? 0) + 1;
  if (record.status === "failed") {
    failuresByTool[record.toolName] = (failuresByTool[record.toolName] ?? 0) + 1;
    failuresByCategory[record.category] =
      (failuresByCategory[record.category] ?? 0) + 1;
  }
}

function parseEventLog(raw: string): NormalizerRecord[] {
  const records: NormalizerRecord[] = [];
  for (const line of raw.split("\n")) {
    if (!line.trim()) continue;
    try {
      const parsed: unknown = JSON.parse(line);
      if (validRecord(parsed)) records.push(parsed);
    } catch {
      // A torn JSONL tail is ignored; complete neighboring events remain usable.
    }
  }
  return records;
}

async function readOptional(path: string): Promise<string | undefined> {
  try {
    return await readFile(path, "utf-8");
  } catch {
    // Missing or temporarily unreadable history degrades to an empty snapshot.
    return undefined;
  }
}

function aggregateFromRecords(
  records: readonly NormalizerRecord[],
): PersistedAggregate {
  const totals = {
    totalIntercepted: 0,
    healedSuccess: 0,
    healedFailed: 0,
    passThrough: 0,
    passThroughFailed: 0,
  };
  const byTool: Record<string, number> = Object.create(null) as Record<
    string,
    number
  >;
  const byCategory: Record<string, number> = Object.create(null) as Record<
    string,
    number
  >;
  const failuresByTool: Record<string, number> = Object.create(
    null,
  ) as Record<string, number>;
  const failuresByCategory: Record<string, number> = Object.create(
    null,
  ) as Record<string, number>;
  let estimatedTokensSaved = 0;
  for (const record of records) {
    accumulateRecord(
      totals,
      byTool,
      byCategory,
      failuresByTool,
      failuresByCategory,
      record,
    );
    estimatedTokensSaved += record.tokensSaved ?? 0;
  }
  return {
    version: SUMMARY_VERSION,
    updatedAt: Date.now(),
    ...totals,
    estimatedTokensSaved,
    byTool,
    byCategory,
    failuresByTool,
    failuresByCategory,
  };
}

function snapshotAggregate(stats: NormalizerAggregate): PersistedAggregate {
  return {
    version: SUMMARY_VERSION,
    updatedAt: Date.now(),
    totalIntercepted: stats.totalIntercepted,
    healedSuccess: stats.healedSuccess,
    healedFailed: stats.healedFailed,
    passThrough: stats.passThrough,
    passThroughFailed: stats.passThroughFailed,
    estimatedTokensSaved: stats.estimatedTokensSaved,
    byTool: { ...stats.byTool },
    byCategory: { ...stats.byCategory },
    failuresByTool: { ...stats.failuresByTool },
    failuresByCategory: { ...stats.failuresByCategory },
  };
}

function healingRate(
  stats: Pick<NormalizerStats, "healedSuccess" | "healedFailed">,
): number {
  const attempts = stats.healedSuccess + stats.healedFailed;
  return attempts > 0
    ? Math.round((stats.healedSuccess / attempts) * 1000) / 10
    : 0;
}

/**
 * Replay the compact aggregate and detailed diagnostic history into the
 * tracker. Old all-event JSONL files remain readable; their successful
 * untouched records are retained for counters but filtered from the detail
 * window after the new default takes effect.
 */
export async function restoreFromLog(
  tracker: ToolNormalizerTracker,
): Promise<void> {
  if (isTestRun()) return;

  try {
    await compactLogIfOversized();
  } catch {
    // Rotation is diagnostic housekeeping; replay proceeds regardless.
  }
  const [rawEvents, rawSummary] = await Promise.all([
    readOptional(statsLogPath()),
    readOptional(statsSummaryPath()),
  ]);
  const records = rawEvents === undefined ? [] : parseEventLog(rawEvents);

  let aggregate: PersistedAggregate | undefined;
  if (rawSummary !== undefined) {
    try {
      const parsed: unknown = JSON.parse(rawSummary);
      if (validAggregate(parsed)) aggregate = parsed;
    } catch {
      // A torn summary is replaced by the event-log fallback below.
    }
  }
  aggregate ??= aggregateFromRecords(records);

  const recentRecords = records
    .filter(isDiagnosticRecord)
    .sort((a, b) => b.time - a.time);
  const stats: NormalizerStats = {
    totalIntercepted: aggregate.totalIntercepted,
    healedSuccess: aggregate.healedSuccess,
    healedFailed: aggregate.healedFailed,
    passThrough: aggregate.passThrough,
    passThroughFailed: aggregate.passThroughFailed,
    estimatedTokensSaved: aggregate.estimatedTokensSaved,
    healingSuccessRate: healingRate(aggregate),
    byTool: safeCountMap(aggregate.byTool),
    byCategory: safeCountMap(aggregate.byCategory),
    failuresByTool: safeCountMap(aggregate.failuresByTool),
    failuresByCategory: safeCountMap(aggregate.failuresByCategory),
    recentRecords,
  };
  tracker.restore(stats);
}

function enqueue(task: () => Promise<void>): void {
  writeQueue = writeQueue.then(task).catch(() => {
    // Persistence is diagnostic only; an unwritable DSH home must not break a tool call.
  });
}

async function writeSummary(summary: PersistedAggregate): Promise<void> {
  await mkdir(dirname(statsSummaryPath()), { recursive: true });
  const path = statsSummaryPath();
  const temporaryPath = `${path}.tmp`;
  await writeFile(temporaryPath, JSON.stringify(summary), "utf-8");
  await rename(temporaryPath, path);
}

function flushPendingSummary(): void {
  if (summaryTimer !== undefined) {
    clearTimeout(summaryTimer);
    summaryTimer = undefined;
  }
  const summary = pendingSummary;
  pendingSummary = undefined;
  if (summary !== undefined) enqueue(() => writeSummary(summary));
}

function scheduleSummary(stats: NormalizerAggregate): void {
  pendingSummary = snapshotAggregate(stats);
  if (summaryTimer !== undefined) return;
  const generation = writeGeneration;
  summaryTimer = setTimeout(() => {
    summaryTimer = undefined;
    if (generation === writeGeneration) flushPendingSummary();
  }, SUMMARY_FLUSH_DELAY_MS);
  summaryTimer.unref?.();
}

/**
 * Compact the detail log to its newest slice when it outgrows the cap.
 * Rotation keeps valid newest-first records within budget and drops the
 * torn tail, so an unbounded failure storm cannot grow the file forever.
 * Boot and periodic runtime checks share this; no-op under the cap.
 */
export async function compactLogIfOversized(): Promise<void> {
  if (isTestRun()) return;
  let size: number;
  try {
    size = (await stat(statsLogPath())).size;
  } catch {
    // Missing history compacts to nothing to do.
    return;
  }
  if (size <= LOG_SIZE_CAP_BYTES) return;
  const raw = await readOptional(statsLogPath());
  if (raw === undefined) return;
  const kept: string[] = [];
  let budget = LOG_COMPACT_KEEP_BYTES;
  const lines = raw.split("\n");
  for (let i = lines.length - 1; i >= 0 && budget > 0; i--) {
    const line = lines[i]!;
    if (!line.trim()) continue;
    try {
      const parsed: unknown = JSON.parse(line);
      if (!validRecord(parsed)) continue;
    } catch {
      // A torn or invalid line never survives rotation.
      continue;
    }
    budget -= line.length + 1;
    kept.push(line);
  }
  kept.reverse();
  const path = statsLogPath();
  const temporaryPath = `${path}.tmp`;
  await mkdir(dirname(path), { recursive: true });
  await writeFile(
    temporaryPath,
    kept.length > 0 ? `${kept.join("\n")}\n` : "",
    "utf-8",
  );
  await rename(temporaryPath, path);
}

let detailedAppends = 0;

/**
 * Serialize one diagnostic event into a JSONL line body.
 *
 * The record is checked by serialization rather than trusted, because a live
 * reference that reached a record must not discard the event or abort the
 * caller's summary write. The fallback pass drops cycles and functions, so a
 * diagnostic field that cannot be represented costs only that field.
 * @param record - Event emitted by the interceptor.
 * @returns One JSON line body, or undefined when nothing can be represented.
 */
function serializeRecordLine(record: NormalizerRecord): string | undefined {
  try {
    return JSON.stringify(record);
  } catch {
    // Not representable as-is; retry with the lossy replacer below.
  }
  const seen = new WeakSet<object>();
  try {
    return JSON.stringify(record, (_key: string, value: unknown) => {
      if (typeof value === "function") return undefined;
      if (typeof value === "bigint") return String(value);
      if (typeof value === "object" && value !== null) {
        if (seen.has(value)) return undefined;
        seen.add(value);
      }
      return value;
    });
  } catch {
    // Nothing about this event is representable; the caller still writes counters.
    return undefined;
  }
}

/**
 * Append one event and publish a compact aggregate snapshot. Successful
 * untouched calls are skipped from JSONL unless explicitly enabled.
 * @param record - Event emitted by the interceptor.
 * @param stats - Post-record aggregate counters.
 * @param options - Persistence policy for successful untouched calls.
 */
export function appendEvent(
  record: NormalizerRecord,
  stats: NormalizerAggregate,
  options: { persistPassthrough?: boolean } = {},
): void {
  if (isTestRun()) return;
  const detailed =
    options.persistPassthrough === true || isDiagnosticRecord(record);
  if (detailed) {
    const line = serializeRecordLine(record);
    if (line !== undefined) {
      enqueue(async () => {
        await mkdir(dirname(statsLogPath()), { recursive: true });
        await appendFile(statsLogPath(), `${line}\n`, "utf-8");
      });
      if (++detailedAppends % LOG_SIZE_CHECK_EVERY_APPENDS === 0) {
        enqueue(() => compactLogIfOversized());
      }
    }
  }
  // Every outcome coalesces into one debounced summary write per second: the
  // JSONL holds the durable per-event detail, while the summary is only
  // counters a crash window may legitimately lag by. Orderly teardown flushes.
  scheduleSummary(stats);
}

/**
 * Persist the current compact snapshot, normally after asynchronous replay.
 * Debounced like every other summary write; teardown flushes the tail.
 * @param stats - Post-record aggregate counters.
 */
export function persistSnapshot(stats: NormalizerAggregate): void {
  if (!isTestRun()) scheduleSummary(stats);
}

/** Wait for queued diagnostic writes; useful during orderly plugin teardown. */
export function flushStatsLog(): Promise<void> {
  if (!isTestRun()) flushPendingSummary();
  return writeQueue;
}

/** Clear detailed history and its aggregate snapshot in the same write queue. */
export function clearLog(): Promise<void> {
  if (isTestRun()) return Promise.resolve();
  writeGeneration++;
  if (summaryTimer !== undefined) {
    clearTimeout(summaryTimer);
    summaryTimer = undefined;
  }
  pendingSummary = undefined;
  enqueue(async () => {
    await mkdir(dirname(statsLogPath()), { recursive: true });
    await writeFile(statsLogPath(), "", "utf-8");
    try {
      await unlink(statsSummaryPath());
    } catch (error: unknown) {
      if (
        !(error instanceof Error && "code" in error && error.code === "ENOENT")
      )
        throw error;
    }
  });
  return writeQueue;
}
