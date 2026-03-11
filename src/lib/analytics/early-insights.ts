
import { createSupabaseServerClient } from "../supabase/server-client";

type InsightStatus = "ok" | "insufficient_data" | "error";
type InsightKey =
  | "optimal_sleep_window"
  | "real_sleep_need"
  | "hrv_baseline"
  | "recovery_insight"
  | "recovery_killers"
  | "body_battery_leak"
  | "hrv_boosters"
  | "strain_tolerance"
  | "recovery_speed";

export type InsightConfidence = "Strong signal" | "Medium confidence" | "Early estimate" | "Not enough data yet";

type InsightCardBase = {
  key: InsightKey;
  status: InsightStatus;
  title: string;
  summary: string;
  confidence: InsightConfidence;
  sampleSize: number;
  lastComputedAt: string;
};

export type OptimalSleepWindowMetrics = {
  bedtimeBefore: string;
  recoveryAbove: number;
  avgRecoveryBeforeCutoff: number;
  avgRecoveryAfterCutoff: number;
  uplift: number;
  sampleSize: number;
  confidenceLabel: InsightConfidence;
};

export type RealSleepNeedMetrics = {
  estimatedOptimalSleepMinutes: number;
  estimatedOptimalSleepRangeMin: number;
  estimatedOptimalSleepRangeMax: number;
  currentAvgSleepMinutes: number;
  deltaMinutes: number;
  sampleSize: number;
  confidenceLabel: InsightConfidence;
};

export type HrvBaselineMetrics = {
  hrvBaseline: number;
  hrvUsualLow: number;
  hrvUsualHigh: number;
  hrvOnBestRecoveryDays: number;
  sampleSize: number;
};

export type RecoveryInsightMetrics = {
  correlationHrvRecovery: number;
  correlationSleepRecovery: number;
  winner: "hrv" | "sleep" | "similar";
};

export type FactorInsightItem = {
  key: string;
  label: string;
  effectSize: number;
  sampleSize: number;
  explanation: string;
};

export type RecoveryKillersMetrics = {
  factors: FactorInsightItem[];
  confidenceLabel: InsightConfidence;
};

export type BodyBatteryLeakMetrics = {
  sleepThresholdHours: number;
  avgRecoveryShortSleep: number;
  avgRecoveryNormalSleep: number;
  recoveryPenalty: number;
};

export type HrvBoostersMetrics = {
  factors: FactorInsightItem[];
  confidenceLabel: InsightConfidence;
};

export type StrainToleranceMetrics = {
  strainToleranceThreshold: number;
  thresholdMethod: string;
  sampleSize: number;
  confidenceLabel: InsightConfidence;
};

export type RecoverySpeedMetrics = {
  avgDaysToRecover: number;
  highStrainThresholdUsed: number;
  recoveryThresholdUsed: number;
  sampleSize: number;
  confidenceLabel: InsightConfidence;
};

export type EarlyInsightCard =
  | (InsightCardBase & { key: "optimal_sleep_window"; metrics: OptimalSleepWindowMetrics | null })
  | (InsightCardBase & { key: "real_sleep_need"; metrics: RealSleepNeedMetrics | null })
  | (InsightCardBase & { key: "hrv_baseline"; metrics: HrvBaselineMetrics | null })
  | (InsightCardBase & { key: "recovery_insight"; metrics: RecoveryInsightMetrics | null })
  | (InsightCardBase & { key: "recovery_killers"; metrics: RecoveryKillersMetrics | null })
  | (InsightCardBase & { key: "body_battery_leak"; metrics: BodyBatteryLeakMetrics | null })
  | (InsightCardBase & { key: "hrv_boosters"; metrics: HrvBoostersMetrics | null })
  | (InsightCardBase & { key: "strain_tolerance"; metrics: StrainToleranceMetrics | null })
  | (InsightCardBase & { key: "recovery_speed"; metrics: RecoverySpeedMetrics | null });

type DailyMetricRow = {
  metric_date: string;
  recovery_score_pct: number | null;
  hrv_ms: number | null;
  day_strain: number | null;
  workouts_count: number | null;
};

type SleepFactRow = {
  sleep_onset_at: string;
  wake_onset_at: string;
  asleep_duration_min: number | null;
  sleep_consistency_percent: number | null;
  nap: boolean;
};

type SleepJoinedPoint = {
  wakeDate: string;
  sleepStartMinute: number;
  sleepDurationMin: number | null;
  sleepConsistencyPct: number | null;
  recovery: number | null;
  hrv: number | null;
  strain: number | null;
  workoutsCount: number;
};

type CardFactory<TMetrics> = {
  title: string;
  fallbackSummary: string;
  build: () => { summary: string; metrics: TMetrics; sampleSize: number; confidence: InsightConfidence };
};

const MINUTES_IN_DAY = 24 * 60;
const RECOVERY_GOOD_THRESHOLD = 67;
const RECOVERY_MATCH_MIN = 14;
const OPTIMAL_SLEEP_BUCKET_MINUTES = 30;
const OPTIMAL_SLEEP_MIN_GROUP = 4;
const OPTIMAL_SLEEP_LATEST_REASONABLE_CUTOFF = 25 * 60;
const BODY_BATTERY_MIN_GROUP = 5;
const BODY_BATTERY_MIN_PENALTY = 3;

const clampRound = (value: number, decimals = 0) => Number(value.toFixed(decimals));

const minutesToClock = (minuteOfDay: number): string => {
  const safeMinute = ((minuteOfDay % MINUTES_IN_DAY) + MINUTES_IN_DAY) % MINUTES_IN_DAY;
  const hours = Math.floor(safeMinute / 60);
  const minutes = safeMinute % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
};

const minutesToDurationText = (minutes: number): string => {
  const rounded = Math.round(minutes / 15) * 15;
  const h = Math.floor(rounded / 60);
  const m = rounded % 60;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
};

const formatHoursCompact = (hours: number): string => {
  if (Math.abs(hours - Math.round(hours)) < 0.01) {
    return `${Math.round(hours)}h`;
  }

  return `${hours.toFixed(1)}h`;
};

const isoToUtcDate = (iso: string): string => new Date(iso).toISOString().slice(0, 10);

const isoToUtcMinuteOfDay = (iso: string): number => {
  const d = new Date(iso);
  return d.getUTCHours() * 60 + d.getUTCMinutes();
};

const percentile = (values: number[], p: number): number => {
  if (values.length === 0) return Number.NaN;
  const sorted = [...values].sort((a, b) => a - b);
  const index = (sorted.length - 1) * p;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return sorted[lower];
  const weight = index - lower;
  return sorted[lower] + (sorted[upper] - sorted[lower]) * weight;
};

const median = (values: number[]): number => percentile(values, 0.5);

const average = (values: number[]): number => {
  if (values.length === 0) return Number.NaN;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
};

const pearsonCorrelation = (xs: number[], ys: number[]): number => {
  if (xs.length !== ys.length || xs.length < 2) return Number.NaN;

  const meanX = average(xs);
  const meanY = average(ys);
  let numerator = 0;
  let sumSquareX = 0;
  let sumSquareY = 0;

  for (let index = 0; index < xs.length; index += 1) {
    const xDiff = xs[index] - meanX;
    const yDiff = ys[index] - meanY;
    numerator += xDiff * yDiff;
    sumSquareX += xDiff * xDiff;
    sumSquareY += yDiff * yDiff;
  }

  const denominator = Math.sqrt(sumSquareX * sumSquareY);
  if (!Number.isFinite(denominator) || denominator === 0) return Number.NaN;

  return numerator / denominator;
};
const adjustedSleepMinute = (minuteOfDay: number): number => {
  return minuteOfDay < 12 * 60 ? minuteOfDay + MINUTES_IN_DAY : minuteOfDay;
};

const sleepMinuteDistance = (a: number, b: number): number => {
  const diff = Math.abs(adjustedSleepMinute(a) - adjustedSleepMinute(b));
  return Math.min(diff, MINUTES_IN_DAY - (diff % MINUTES_IN_DAY));
};

const confidenceFromN = (sampleSize: number, mediumAt: number, strongAt: number): InsightConfidence => {
  if (sampleSize >= strongAt) return "Strong signal";
  if (sampleSize >= mediumAt) return "Medium confidence";
  return "Early estimate";
};

const safeErrorMessage = (error: unknown): string => {
  if (error instanceof Error && error.message) return error.message;
  return "Unexpected analytics error";
};

const factorExplanation = (label: string, effectSize: number, outcomeLabel: string): string => {
  const direction = effectSize < 0 ? "lower" : "higher";
  return `${label} is associated with ${Math.abs(effectSize).toFixed(1)} ${outcomeLabel} ${direction} on average.`;
};

const buildInsightCard = <TMetrics>(
  key: InsightKey,
  nowIso: string,
  factory: CardFactory<TMetrics>,
): EarlyInsightCard => {
  try {
    const result = factory.build();
    return {
      key,
      status: "ok",
      title: factory.title,
      summary: result.summary,
      confidence: result.confidence,
      sampleSize: result.sampleSize,
      lastComputedAt: nowIso,
      metrics: result.metrics,
    } as EarlyInsightCard;
  } catch (error) {
    const message = safeErrorMessage(error);
    if (message === "insufficient_data") {
      return {
        key,
        status: "insufficient_data",
        title: factory.title,
        summary: factory.fallbackSummary,
        confidence: "Not enough data yet",
        sampleSize: 0,
        lastComputedAt: nowIso,
        metrics: null,
      } as EarlyInsightCard;
    }

    return {
      key,
      status: "error",
      title: factory.title,
      summary: "We hit an error while calculating this insight. Please try again after your next upload.",
      confidence: "Not enough data yet",
      sampleSize: 0,
      lastComputedAt: nowIso,
      metrics: null,
    } as EarlyInsightCard;
  }
};

const getPrimarySleepPerDate = (rows: SleepFactRow[]): Map<string, SleepFactRow> => {
  const map = new Map<string, SleepFactRow>();

  for (const row of rows) {
    if (row.nap) continue;

    const date = isoToUtcDate(row.wake_onset_at);
    const existing = map.get(date);
    if (!existing) {
      map.set(date, row);
      continue;
    }

    const currentDuration = row.asleep_duration_min ?? -1;
    const existingDuration = existing.asleep_duration_min ?? -1;
    if (currentDuration > existingDuration) {
      map.set(date, row);
    }
  }

  return map;
};

const topN = <T>(items: T[], n: number): T[] => items.slice(0, n);

export const getUserEarlyInsights = async (userId: string): Promise<EarlyInsightCard[]> => {
  const supabase = await createSupabaseServerClient();
  const nowIso = new Date().toISOString();

  const [dailyRes, sleepsRes] = await Promise.all([
    supabase
      .from("user_daily_metrics")
      .select("metric_date, recovery_score_pct, hrv_ms, day_strain, workouts_count")
      .eq("user_id", userId)
      .order("metric_date", { ascending: true }),
    supabase
      .from("whoop_sleep_facts")
      .select("sleep_onset_at, wake_onset_at, asleep_duration_min, sleep_consistency_percent, nap")
      .eq("user_id", userId)
      .order("wake_onset_at", { ascending: true }),
  ]);

  if (dailyRes.error) {
    throw new Error(`Failed to load daily metrics: ${dailyRes.error.message}`);
  }

  if (sleepsRes.error) {
    throw new Error(`Failed to load sleep facts: ${sleepsRes.error.message}`);
  }

  const dailyRows = ((dailyRes.data ?? []) as DailyMetricRow[]).map((row) => ({
    ...row,
    recovery_score_pct: row.recovery_score_pct == null ? null : Number(row.recovery_score_pct),
    hrv_ms: row.hrv_ms == null ? null : Number(row.hrv_ms),
    day_strain: row.day_strain == null ? null : Number(row.day_strain),
    workouts_count: row.workouts_count == null ? 0 : Number(row.workouts_count),
  }));

  const sleepRows = (sleepsRes.data ?? []) as SleepFactRow[];
  const dailyByDate = new Map<string, DailyMetricRow>();
  for (const row of dailyRows) {
    dailyByDate.set(row.metric_date, row);
  }

  const primarySleepByDate = getPrimarySleepPerDate(sleepRows);
  const sleepJoined: SleepJoinedPoint[] = [];

  for (const [wakeDate, sleep] of primarySleepByDate.entries()) {
    const day = dailyByDate.get(wakeDate);
    sleepJoined.push({
      wakeDate,
      sleepStartMinute: isoToUtcMinuteOfDay(sleep.sleep_onset_at),
      sleepDurationMin: sleep.asleep_duration_min == null ? null : Number(sleep.asleep_duration_min),
      sleepConsistencyPct: sleep.sleep_consistency_percent == null ? null : Number(sleep.sleep_consistency_percent),
      recovery: day?.recovery_score_pct ?? null,
      hrv: day?.hrv_ms ?? null,
      strain: day?.day_strain ?? null,
      workoutsCount: day?.workouts_count ?? 0,
    });
  }

  const cards: EarlyInsightCard[] = [];

  cards.push(
    buildInsightCard("optimal_sleep_window", nowIso, {
      title: "Optimal sleep cutoff",
      fallbackSummary: "We need more sleep history to estimate your best bedtime cutoff.",
      build: () => {
        const rows = sleepJoined.filter((row) => row.recovery != null);
        if (rows.length < 12) throw new Error("insufficient_data");

        const candidateCutoffs = [...new Set([
          ...rows
            .map((row) =>
              Math.floor(adjustedSleepMinute(row.sleepStartMinute) / OPTIMAL_SLEEP_BUCKET_MINUTES) * OPTIMAL_SLEEP_BUCKET_MINUTES + OPTIMAL_SLEEP_BUCKET_MINUTES,
            )
            .filter((cutoffMinute) => cutoffMinute <= OPTIMAL_SLEEP_LATEST_REASONABLE_CUTOFF),
          OPTIMAL_SLEEP_LATEST_REASONABLE_CUTOFF,
        ])].sort((a, b) => a - b);

        const ranked = candidateCutoffs
          .map((cutoffMinute) => {
            const beforeRows = rows.filter(
              (row) => adjustedSleepMinute(row.sleepStartMinute) < cutoffMinute,
            );
            const afterRows = rows.filter(
              (row) => adjustedSleepMinute(row.sleepStartMinute) >= cutoffMinute,
            );

            if (beforeRows.length < OPTIMAL_SLEEP_MIN_GROUP || afterRows.length < OPTIMAL_SLEEP_MIN_GROUP) {
              return null;
            }

            const avgRecoveryBeforeCutoff = average(beforeRows.map((row) => row.recovery as number));
            const avgRecoveryAfterCutoff = average(afterRows.map((row) => row.recovery as number));
            const uplift = avgRecoveryBeforeCutoff - avgRecoveryAfterCutoff;

            return {
              cutoffMinute,
              beforeSampleSize: beforeRows.length,
              avgRecoveryBeforeCutoff,
              avgRecoveryAfterCutoff,
              uplift,
            };
          })
          .filter((item): item is NonNullable<typeof item> => item !== null)
          .sort(
            (a, b) =>
              b.uplift - a.uplift ||
              b.avgRecoveryBeforeCutoff - a.avgRecoveryBeforeCutoff ||
              b.beforeSampleSize - a.beforeSampleSize ||
              a.cutoffMinute - b.cutoffMinute,
          );

        const winner = ranked[0];
        if (!winner) throw new Error("insufficient_data");

        const bedtimeBefore = minutesToClock(Math.min(winner.cutoffMinute, OPTIMAL_SLEEP_LATEST_REASONABLE_CUTOFF) % MINUTES_IN_DAY);
        const avgRecoveryBeforeCutoff = clampRound(winner.avgRecoveryBeforeCutoff, 1);
        const avgRecoveryAfterCutoff = clampRound(winner.avgRecoveryAfterCutoff, 1);
        const avgRecoveryAfterCutoffRounded = Math.round(winner.avgRecoveryAfterCutoff);
        const recoveryAbove = Math.floor(winner.avgRecoveryBeforeCutoff);
        const uplift = clampRound(winner.uplift, 1);
        const confidence = confidenceFromN(rows.length, 18, 30);

        return {
          summary: `Your recovery is usually ${recoveryAbove}+ when you're asleep before ${bedtimeBefore}.\nWhen you go later, it drops to ${avgRecoveryAfterCutoffRounded} on average.`,
          confidence,
          sampleSize: rows.length,
          metrics: {
            bedtimeBefore,
            recoveryAbove,
            avgRecoveryBeforeCutoff,
            avgRecoveryAfterCutoff,
            uplift,
            sampleSize: winner.beforeSampleSize,
            confidenceLabel: confidence,
          },
        };
      },
    }),
  );
  cards.push(
    buildInsightCard("real_sleep_need", nowIso, {
      title: "Real sleep need",
      fallbackSummary: "We need a bit more sleep data to estimate your ideal sleep duration.",
      build: () => {
        const rows = sleepJoined.filter((row) => row.sleepDurationMin != null && (row.recovery != null || row.hrv != null));
        if (rows.length < 10) throw new Error("insufficient_data");

        const durations = rows.map((row) => row.sleepDurationMin as number);
        const currentAvgSleep = average(durations);
        const recoverySamples = rows.filter((row) => row.recovery != null).length;
        const hrvSamples = rows.filter((row) => row.hrv != null).length;
        const useRecovery = recoverySamples >= 10 || recoverySamples >= hrvSamples;
        const hrvBaseline = median(rows.map((row) => row.hrv).filter((value): value is number => value != null));

        const bucketSize = 30;
        const byBucket = new Map<number, { durations: number[]; recovery: number[]; hrv: number[] }>();
        for (const row of rows) {
          const duration = row.sleepDurationMin as number;
          const bucket = Math.floor(duration / bucketSize) * bucketSize;
          const item = byBucket.get(bucket) ?? { durations: [], recovery: [], hrv: [] };
          item.durations.push(duration);
          if (row.recovery != null) item.recovery.push(row.recovery);
          if (row.hrv != null) item.hrv.push(row.hrv);
          byBucket.set(bucket, item);
        }

        const bins = [...byBucket.entries()].map(([bucketMin, value]) => {
          const recoveryAvg = value.recovery.length ? average(value.recovery) : Number.NaN;
          const hrvAvg = value.hrv.length ? average(value.hrv) : Number.NaN;
          const normalizedHrv = Number.isNaN(hrvAvg) || Number.isNaN(hrvBaseline) || hrvBaseline <= 0 ? Number.NaN : hrvAvg / hrvBaseline;
          const score = useRecovery ? recoveryAvg : Number.isNaN(normalizedHrv) ? Number.NaN : normalizedHrv;

          return {
            bucketMin,
            sampleSize: value.durations.length,
            score,
            avgDuration: average(value.durations),
          };
        });

        const eligibleBins = bins
          .filter((bin) => bin.sampleSize >= 3 && Number.isFinite(bin.score))
          .sort((a, b) => b.score - a.score || b.sampleSize - a.sampleSize);

        if (eligibleBins.length < 1 || bins.filter((bin) => bin.sampleSize >= 2).length < 3) {
          throw new Error("insufficient_data");
        }

        const winner = eligibleBins[0];
        const optimalMin = Math.round(winner.avgDuration / 15) * 15;
        const delta = Math.round(optimalMin - currentAvgSleep);
        const confidence = confidenceFromN(rows.length, 18, 32);

        let summary = `Your body wants about ${minutesToDurationText(optimalMin)} of sleep.`;
        if (delta > 0) {
          summary += `\nYou're giving it ${minutesToDurationText(delta)} less.`;
        } else if (delta < -15) {
          summary += `\nYou're giving it ${minutesToDurationText(Math.abs(delta))} more.`;
        } else {
          summary += "\nYou're already pretty close.";
        }

        return {
          summary,
          confidence,
          sampleSize: rows.length,
          metrics: {
            estimatedOptimalSleepMinutes: optimalMin,
            estimatedOptimalSleepRangeMin: winner.bucketMin,
            estimatedOptimalSleepRangeMax: winner.bucketMin + bucketSize,
            currentAvgSleepMinutes: Math.round(currentAvgSleep),
            deltaMinutes: delta,
            sampleSize: rows.length,
            confidenceLabel: confidence,
          },
        };
      },
    }),
  );

  cards.push(
    buildInsightCard("hrv_baseline", nowIso, {
      title: "Your HRV baseline",
      fallbackSummary: "We need more HRV history to estimate your personal baseline.",
      build: () => {
        const validHrvRows = dailyRows.filter((row) => row.hrv_ms != null);
        if (validHrvRows.length < 7) throw new Error("insufficient_data");

        const hrvValues = validHrvRows.map((row) => row.hrv_ms as number);
        const baseline = median(hrvValues);
        const low = percentile(hrvValues, 0.25);
        const high = percentile(hrvValues, 0.75);
        const recoveryValues = dailyRows.map((row) => row.recovery_score_pct).filter((value): value is number => value != null);
        const bestRecoveryCutoff = recoveryValues.length ? percentile(recoveryValues, 0.75) : RECOVERY_GOOD_THRESHOLD;
        const bestRecoveryHrv = dailyRows
          .filter((row) => row.hrv_ms != null && row.recovery_score_pct != null && row.recovery_score_pct >= bestRecoveryCutoff)
          .map((row) => row.hrv_ms as number);
        const bestRecoveryHrvAvg = bestRecoveryHrv.length ? average(bestRecoveryHrv) : baseline;
        const confidence = confidenceFromN(validHrvRows.length, 14, 30);

        return {
          summary: `Your usual HRV: ${Math.round(baseline)} ms\nBest days: ${Math.round(bestRecoveryHrvAvg)} ms`,
          confidence,
          sampleSize: validHrvRows.length,
          metrics: {
            hrvBaseline: Math.round(baseline),
            hrvUsualLow: Math.round(low),
            hrvUsualHigh: Math.round(high),
            hrvOnBestRecoveryDays: Math.round(bestRecoveryHrvAvg),
            sampleSize: validHrvRows.length,
          },
        };
      },
    }),
  );

  cards.push(
    buildInsightCard("recovery_insight", nowIso, {
      title: "Recovery insight",
      fallbackSummary: "We need more matched recovery, HRV, and sleep data to compare your strongest signal.",
      build: () => {
        const rows = sleepJoined.filter((row) => row.recovery != null && row.hrv != null && row.sleepDurationMin != null);
        if (rows.length < RECOVERY_MATCH_MIN) throw new Error("insufficient_data");

        const recoveryValues = rows.map((row) => row.recovery as number);
        const correlationHrvRecovery = pearsonCorrelation(rows.map((row) => row.hrv as number), recoveryValues);
        const correlationSleepRecovery = pearsonCorrelation(rows.map((row) => row.sleepDurationMin as number), recoveryValues);
        if (!Number.isFinite(correlationHrvRecovery) || !Number.isFinite(correlationSleepRecovery)) throw new Error("insufficient_data");

        const absHrv = Math.abs(correlationHrvRecovery);
        const absSleep = Math.abs(correlationSleepRecovery);
        const winner = absHrv >= absSleep + 0.1 ? "hrv" : absSleep >= absHrv + 0.1 ? "sleep" : "similar";
        const summary =
          winner === "hrv"
            ? "In your data, HRV affects recovery more than sleep length."
            : winner === "sleep"
              ? "In your data, sleep length affects recovery more than HRV."
              : "In your data, HRV and sleep length have a similar impact on recovery.";
        const confidence = confidenceFromN(rows.length, 20, 35);

        return {
          summary,
          confidence,
          sampleSize: rows.length,
          metrics: {
            correlationHrvRecovery: clampRound(correlationHrvRecovery, 2),
            correlationSleepRecovery: clampRound(correlationSleepRecovery, 2),
            winner,
          },
        };
      },
    }),
  );

  cards.push(
    buildInsightCard("recovery_killers", nowIso, {
      title: "TOP Recovery killers",
      fallbackSummary: "We need more history before we can spot your strongest recovery patterns.",
      build: () => {
        const rows = sleepJoined.filter((row) => row.recovery != null && row.sleepDurationMin != null);
        if (rows.length < 12) throw new Error("insufficient_data");

        const sleepDurations = rows.map((row) => row.sleepDurationMin as number);
        const starts = rows.map((row) => row.sleepStartMinute);
        const strains = rows.map((row) => row.strain).filter((value): value is number => value != null);
        const medianDuration = median(sleepDurations);
        const medianStart = median(starts.map(adjustedSleepMinute)) % MINUTES_IN_DAY;
        const strainP75 = strains.length >= 6 ? percentile(strains, 0.75) : Number.NaN;

        const factorDefs = [
          { key: "late_sleep", label: "Late sleep", test: (row: SleepJoinedPoint) => adjustedSleepMinute(row.sleepStartMinute) > adjustedSleepMinute(medianStart) + 60 },
          { key: "irregular_bedtime", label: "Irregular bedtime", test: (row: SleepJoinedPoint) => sleepMinuteDistance(row.sleepStartMinute, medianStart) > 90 },
          { key: "short_sleep", label: "Short sleep", test: (row: SleepJoinedPoint) => (row.sleepDurationMin as number) < medianDuration - 30 },
          { key: "high_strain", label: "High strain", test: (row: SleepJoinedPoint) => row.strain != null && Number.isFinite(strainP75) && row.strain >= strainP75 },
        ] as const;

        const factors: FactorInsightItem[] = [];
        for (const factor of factorDefs) {
          const yes = rows.filter((row) => factor.test(row)).map((row) => row.recovery as number);
          const no = rows.filter((row) => !factor.test(row)).map((row) => row.recovery as number);
          if (yes.length < 3 || no.length < 3) continue;

          const effect = average(yes) - average(no);
          if (effect >= -2) continue;

          factors.push({
            key: factor.key,
            label: factor.label,
            effectSize: clampRound(effect, 1),
            sampleSize: yes.length,
            explanation: factorExplanation(factor.label, effect, "recovery points"),
          });
        }

        factors.sort((a, b) => a.effectSize - b.effectSize);
        const topFactors = topN(factors, 3);
        if (topFactors.length < 2) throw new Error("insufficient_data");

        const confidence = confidenceFromN(rows.length, 18, 32);
        return {
          summary: "The patterns that usually drag down your recovery:",
          confidence,
          sampleSize: rows.length,
          metrics: { factors: topFactors, confidenceLabel: confidence },
        };
      },
    }),
  );
  cards.push(
    buildInsightCard("body_battery_leak", nowIso, {
      title: "Your body battery leak",
      fallbackSummary: "We need more short-sleep nights to estimate your next-day recovery penalty.",
      build: () => {
        const rows = sleepJoined.filter((row) => row.sleepDurationMin != null && row.recovery != null);
        if (rows.length < 12) throw new Error("insufficient_data");

        const thresholdOptions = [6, 6.5, 7];
        let bestSplit: { thresholdHours: number; shortRecoveries: number[]; normalRecoveries: number[]; penalty: number } | null = null;

        for (const thresholdHours of thresholdOptions) {
          const thresholdMinutes = thresholdHours * 60;
          const shortRecoveries = rows.filter((row) => (row.sleepDurationMin as number) < thresholdMinutes).map((row) => row.recovery as number);
          const normalRecoveries = rows.filter((row) => (row.sleepDurationMin as number) >= thresholdMinutes).map((row) => row.recovery as number);
          if (shortRecoveries.length < BODY_BATTERY_MIN_GROUP || normalRecoveries.length < BODY_BATTERY_MIN_GROUP) continue;

          const penalty = average(normalRecoveries) - average(shortRecoveries);
          if (!bestSplit || penalty > bestSplit.penalty) {
            bestSplit = { thresholdHours, shortRecoveries, normalRecoveries, penalty };
          }
        }

        if (!bestSplit) throw new Error("insufficient_data");

        const avgRecoveryShortSleep = average(bestSplit.shortRecoveries);
        const avgRecoveryNormalSleep = average(bestSplit.normalRecoveries);
        const recoveryPenalty = Math.round(avgRecoveryNormalSleep - avgRecoveryShortSleep);
        const confidence = confidenceFromN(bestSplit.shortRecoveries.length + bestSplit.normalRecoveries.length, 18, 30);
        const summary = recoveryPenalty > BODY_BATTERY_MIN_PENALTY
          ? `Your body loses ~${recoveryPenalty} recovery points after nights with less than ${formatHoursCompact(bestSplit.thresholdHours)} of sleep.`
          : "Short sleep has only a small visible effect on your next-day recovery.";

        return {
          summary,
          confidence,
          sampleSize: bestSplit.shortRecoveries.length + bestSplit.normalRecoveries.length,
          metrics: {
            sleepThresholdHours: bestSplit.thresholdHours,
            avgRecoveryShortSleep: clampRound(avgRecoveryShortSleep, 1),
            avgRecoveryNormalSleep: clampRound(avgRecoveryNormalSleep, 1),
            recoveryPenalty,
          },
        };
      },
    }),
  );

  cards.push(
    buildInsightCard("hrv_boosters", nowIso, {
      title: "What boosts your HRV",
      fallbackSummary: "We need more history before we can spot your strongest HRV patterns.",
      build: () => {
        const rows = sleepJoined.filter((row) => row.hrv != null && row.sleepDurationMin != null);
        if (rows.length < 12) throw new Error("insufficient_data");

        const sleepDurations = rows.map((row) => row.sleepDurationMin as number);
        const starts = rows.map((row) => row.sleepStartMinute);
        const strains = rows.map((row) => row.strain).filter((value): value is number => value != null);
        const medianDuration = median(sleepDurations);
        const medianStart = median(starts.map(adjustedSleepMinute)) % MINUTES_IN_DAY;
        const strainP40 = strains.length >= 6 ? percentile(strains, 0.4) : Number.NaN;
        const strainP70 = strains.length >= 6 ? percentile(strains, 0.7) : Number.NaN;

        const factorDefs = [
          { key: "consistent_sleep_timing", label: "Consistent sleep timing", test: (row: SleepJoinedPoint) => sleepMinuteDistance(row.sleepStartMinute, medianStart) <= 45 },
          { key: "longer_sleep", label: "Longer sleep", test: (row: SleepJoinedPoint) => (row.sleepDurationMin as number) >= medianDuration + 30 },
          { key: "earlier_sleep", label: "Earlier sleep", test: (row: SleepJoinedPoint) => adjustedSleepMinute(row.sleepStartMinute) <= adjustedSleepMinute(medianStart) - 60 },
          {
            key: "moderate_strain",
            label: "Moderate strain",
            test: (row: SleepJoinedPoint) => row.strain != null && Number.isFinite(strainP40) && Number.isFinite(strainP70) && row.strain >= strainP40 && row.strain <= strainP70,
          },
        ] as const;

        const factors: FactorInsightItem[] = [];
        for (const factor of factorDefs) {
          const yes = rows.filter((row) => factor.test(row)).map((row) => row.hrv as number);
          const no = rows.filter((row) => !factor.test(row)).map((row) => row.hrv as number);
          if (yes.length < 3 || no.length < 3) continue;

          const effect = average(yes) - average(no);
          if (effect <= 1) continue;

          factors.push({
            key: factor.key,
            label: factor.label,
            effectSize: clampRound(effect, 1),
            sampleSize: yes.length,
            explanation: factorExplanation(factor.label, effect, "HRV points"),
          });
        }

        factors.sort((a, b) => b.effectSize - a.effectSize);
        const topFactors = topN(factors, 3);
        if (topFactors.length < 2) throw new Error("insufficient_data");

        const confidence = confidenceFromN(rows.length, 18, 32);
        return {
          summary: "Your HRV usually looks better when:",
          confidence,
          sampleSize: rows.length,
          metrics: { factors: topFactors, confidenceLabel: confidence },
        };
      },
    }),
  );

  cards.push(
    buildInsightCard("strain_tolerance", nowIso, {
      title: "Your strain limit",
      fallbackSummary: "We need more varied strain data to estimate your tolerance.",
      build: () => {
        const rows = dailyRows.filter((row) => row.day_strain != null && row.recovery_score_pct != null);
        if (rows.length < 10) throw new Error("insufficient_data");

        const strains = rows.map((row) => row.day_strain as number);
        const spread = percentile(strains, 0.75) - percentile(strains, 0.25);
        const sortedThresholds = [...new Set(strains.map((v) => clampRound(v, 1)))].sort((a, b) => a - b);
        let best: { threshold: number; drop: number } | null = null;

        for (const threshold of sortedThresholds) {
          const low = rows.filter((row) => (row.day_strain as number) <= threshold).map((row) => row.recovery_score_pct as number);
          const high = rows.filter((row) => (row.day_strain as number) > threshold).map((row) => row.recovery_score_pct as number);
          if (low.length < 4 || high.length < 4) continue;

          const drop = average(high) - average(low);
          if (!best || drop < best.drop) best = { threshold, drop };
        }

        const fallbackThreshold = clampRound(percentile(strains, 0.75), 1);
        const threshold = best ? best.threshold : fallbackThreshold;
        const thresholdMethod = best ? "best split by recovery drop across observed strain values" : "upper quartile of your observed strain";
        const confidence = !best || spread < 2.5 ? "Early estimate" : rows.length >= 24 && best.drop <= -8 ? "Strong signal" : rows.length >= 14 && best.drop <= -6 ? "Medium confidence" : "Early estimate";

        return {
          summary: `Your recovery starts dropping when strain goes above ~${threshold % 1 === 0 ? threshold.toFixed(0) : threshold.toFixed(1)}.`,
          confidence,
          sampleSize: rows.length,
          metrics: {
            strainToleranceThreshold: threshold,
            thresholdMethod,
            sampleSize: rows.length,
            confidenceLabel: confidence,
          },
        };
      },
    }),
  );

  cards.push(
    buildInsightCard("recovery_speed", nowIso, {
      title: "Your recovery speed",
      fallbackSummary: "We need more high-strain history to estimate your recovery speed.",
      build: () => {
        const rows = dailyRows.filter((row) => row.day_strain != null && row.recovery_score_pct != null).sort((a, b) => a.metric_date.localeCompare(b.metric_date));
        if (rows.length < 10) throw new Error("insufficient_data");

        const strains = rows.map((row) => row.day_strain as number);
        const recoveries = rows.map((row) => row.recovery_score_pct as number);
        const highStrainThreshold = Math.max(14, percentile(strains, 0.75));
        const recoveryThreshold = Math.max(RECOVERY_GOOD_THRESHOLD, percentile(recoveries, 0.5));
        const eventIndexes = rows.map((row, index) => ({ row, index })).filter(({ row }) => (row.day_strain as number) >= highStrainThreshold).map(({ index }) => index);
        if (eventIndexes.length < 5) throw new Error("insufficient_data");

        const daysToRecover: number[] = [];
        for (const startIndex of eventIndexes) {
          const startDate = new Date(rows[startIndex].metric_date);
          for (let nextIndex = startIndex + 1; nextIndex < rows.length; nextIndex += 1) {
            if ((rows[nextIndex].recovery_score_pct as number) >= recoveryThreshold) {
              const nextDate = new Date(rows[nextIndex].metric_date);
              daysToRecover.push(Math.round((nextDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
              break;
            }
          }
        }

        if (daysToRecover.length < 3) throw new Error("insufficient_data");

        const avgDays = average(daysToRecover);
        const confidence = eventIndexes.length >= 10 && daysToRecover.length >= 6 ? "Strong signal" : eventIndexes.length >= 7 && daysToRecover.length >= 4 ? "Medium confidence" : "Early estimate";

        return {
          summary: `After intense days, your body recovers in ~${avgDays.toFixed(1)} days.`,
          confidence,
          sampleSize: eventIndexes.length,
          metrics: {
            avgDaysToRecover: clampRound(avgDays, 1),
            highStrainThresholdUsed: clampRound(highStrainThreshold, 1),
            recoveryThresholdUsed: clampRound(recoveryThreshold, 1),
            sampleSize: eventIndexes.length,
            confidenceLabel: confidence,
          },
        };
      },
    }),
  );

  return cards;
};
