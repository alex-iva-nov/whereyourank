import { revalidateTag, unstable_cache } from "next/cache";

import { createSupabaseServerClient } from "../supabase/server-client";

export type EarlyInsightStatus = "ok" | "insufficient_data" | "error";
export type EarlyInsightTone = "green" | "red" | "neutral";
export type EarlyInsightKey =
  | "sober_streak_effect"
  | "optimal_sleep_cutoff"
  | "body_battery_leak"
  | "strain_limit"
  | "recovery_speed"
  | "best_worst_day"
  | "hrv_threshold"
  | "sleep_gap_days"
  | "recovery_streak";

export type EarlyInsightCard = {
  key: EarlyInsightKey;
  title: string;
  accent: string;
  detail: string;
  accentTone: EarlyInsightTone;
  status: EarlyInsightStatus;
  sampleSize: number;
  lastComputedAt: string;
};

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

type JournalFactRow = {
  cycle_start_at: string;
  question_text: string;
  answered_yes: boolean | null;
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

type InsightBuilderResult = {
  accent: string;
  detail: string;
  accentTone: EarlyInsightTone;
  sampleSize: number;
};

type InsightBuilder = {
  key: EarlyInsightKey;
  title: string;
  fallbackAccent: string;
  fallbackDetail: string;
  fallbackTone?: EarlyInsightTone;
  build: () => InsightBuilderResult;
};

const MINUTES_IN_DAY = 24 * 60;
const RECOVERY_GREEN_MIN = 67;
const RECOVERY_YELLOW_MIN = 34;
const OPTIMAL_SLEEP_BUCKET_MINUTES = 30;
const OPTIMAL_SLEEP_MIN_GROUP = 4;
const OPTIMAL_SLEEP_LATEST_REASONABLE_CUTOFF = 25 * 60;
const BODY_BATTERY_MIN_GROUP = 5;
const BODY_BATTERY_MIN_PENALTY = 3;
const DAY_NAMES_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
const DAY_NAMES_LONG = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const;
const EARLY_INSIGHTS_LOOKBACK_DAYS = 180;
const EARLY_INSIGHTS_TAG_PREFIX = "user-early-insights";

const clampRound = (value: number, decimals = 0) => Number(value.toFixed(decimals));

const average = (values: number[]): number => {
  if (values.length === 0) return Number.NaN;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
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

const isoToUtcDate = (iso: string): string => new Date(iso).toISOString().slice(0, 10);

const isoToUtcMinuteOfDay = (iso: string): number => {
  const d = new Date(iso);
  return d.getUTCHours() * 60 + d.getUTCMinutes();
};

const adjustedSleepMinute = (minuteOfDay: number): number => {
  return minuteOfDay < 12 * 60 ? minuteOfDay + MINUTES_IN_DAY : minuteOfDay;
};

const minutesToClock = (minuteOfDay: number): string => {
  const safeMinute = ((minuteOfDay % MINUTES_IN_DAY) + MINUTES_IN_DAY) % MINUTES_IN_DAY;
  const hours = Math.floor(safeMinute / 60);
  const minutes = safeMinute % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
};

const formatSignedPoints = (value: number): string => `${value >= 0 ? "+" : "-"}${Math.abs(Math.round(value))} pts`;
const formatSignedMinutes = (value: number): string => `${value >= 0 ? "+" : "-"}${Math.abs(Math.round(value))} min`;
const formatSignedMs = (value: number): string => `${value >= 0 ? "+" : "-"}${Math.abs(Math.round(value))} ms`;

const formatThreshold = (value: number): string => {
  return value % 1 === 0 ? value.toFixed(0) : value.toFixed(1);
};

const averageOr = (values: number[], fallback: number): number =>
  values.length > 0 ? average(values) : fallback;

const formatWeekdayShort = (dayIndex: number): string => DAY_NAMES_SHORT[dayIndex];
const formatWeekdayLong = (dayIndex: number): string => DAY_NAMES_LONG[dayIndex];

const addDaysToDateString = (date: string, days: number): string => {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};

const dayDiff = (a: string, b: string): number => {
  const dateA = new Date(`${a}T00:00:00Z`).getTime();
  const dateB = new Date(`${b}T00:00:00Z`).getTime();
  return Math.round((dateA - dateB) / (1000 * 60 * 60 * 24));
};

const getWeekdayIndex = (date: string): number => new Date(`${date}T00:00:00Z`).getUTCDay();

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

const buildInsightCard = (nowIso: string, builder: InsightBuilder): EarlyInsightCard => {
  try {
    const built = builder.build();
    return {
      key: builder.key,
      title: builder.title,
      accent: built.accent,
      detail: built.detail,
      accentTone: built.accentTone,
      status: "ok",
      sampleSize: built.sampleSize,
      lastComputedAt: nowIso,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected analytics error";
    return {
      key: builder.key,
      title: builder.title,
      accent: builder.fallbackAccent,
      detail: message === "insufficient_data" ? builder.fallbackDetail : "We need a bit more clean data before this insight can show up",
      accentTone: builder.fallbackTone ?? "neutral",
      status: message === "insufficient_data" ? "insufficient_data" : "error",
      sampleSize: 0,
      lastComputedAt: nowIso,
    };
  }
};

const getFallbackInsightCards = (nowIso: string): EarlyInsightCard[] => [
  {
    key: "sober_streak_effect",
    title: "Sober streak effect",
    accent: "SOON",
    detail: "We need a bit more clean data before this insight can show up",
    accentTone: "green",
    status: "error",
    sampleSize: 0,
    lastComputedAt: nowIso,
  },
  {
    key: "optimal_sleep_cutoff",
    title: "Optimal sleep cutoff",
    accent: "SOON",
    detail: "We need a bit more clean data before this insight can show up",
    accentTone: "neutral",
    status: "error",
    sampleSize: 0,
    lastComputedAt: nowIso,
  },
  {
    key: "body_battery_leak",
    title: "Body battery leak",
    accent: "SOON",
    detail: "We need a bit more clean data before this insight can show up",
    accentTone: "red",
    status: "error",
    sampleSize: 0,
    lastComputedAt: nowIso,
  },
  {
    key: "strain_limit",
    title: "Your strain limit",
    accent: "SOON",
    detail: "We need a bit more clean data before this insight can show up",
    accentTone: "neutral",
    status: "error",
    sampleSize: 0,
    lastComputedAt: nowIso,
  },
  {
    key: "recovery_speed",
    title: "Recovery speed",
    accent: "SOON",
    detail: "We need a bit more clean data before this insight can show up",
    accentTone: "neutral",
    status: "error",
    sampleSize: 0,
    lastComputedAt: nowIso,
  },
  {
    key: "best_worst_day",
    title: "Best & worst day",
    accent: "SOON",
    detail: "We need a bit more clean data before this insight can show up",
    accentTone: "neutral",
    status: "error",
    sampleSize: 0,
    lastComputedAt: nowIso,
  },
  {
    key: "hrv_threshold",
    title: "HRV threshold",
    accent: "SOON",
    detail: "We need a bit more clean data before this insight can show up",
    accentTone: "red",
    status: "error",
    sampleSize: 0,
    lastComputedAt: nowIso,
  },
  {
    key: "sleep_gap_days",
    title: "Sleep gap days",
    accent: "SOON",
    detail: "We need a bit more clean data before this insight can show up",
    accentTone: "red",
    status: "error",
    sampleSize: 0,
    lastComputedAt: nowIso,
  },
  {
    key: "recovery_streak",
    title: "Recovery streak",
    accent: "SOON",
    detail: "We need a bit more clean data before this insight can show up",
    accentTone: "green",
    status: "error",
    sampleSize: 0,
    lastComputedAt: nowIso,
  },
];

export const getUserEarlyInsights = async (userId: string): Promise<EarlyInsightCard[]> => {
  const loadUserEarlyInsights = async (): Promise<EarlyInsightCard[]> => {
    try {
      const supabase = await createSupabaseServerClient();
      const nowIso = new Date().toISOString();
      const lookbackStart = addDaysToDateString(nowIso.slice(0, 10), -(EARLY_INSIGHTS_LOOKBACK_DAYS - 1));

      const [dailyRes, sleepsRes, journalRes] = await Promise.all([
        supabase
          .from("user_daily_metrics")
          .select("metric_date, recovery_score_pct, hrv_ms, day_strain, workouts_count")
          .eq("user_id", userId)
          .gte("metric_date", lookbackStart)
          .order("metric_date", { ascending: true }),
        supabase
          .from("whoop_sleep_facts")
          .select("sleep_onset_at, wake_onset_at, asleep_duration_min, sleep_consistency_percent, nap")
          .eq("user_id", userId)
          .gte("wake_onset_at", `${lookbackStart}T00:00:00.000Z`)
          .order("wake_onset_at", { ascending: true }),
        supabase
          .from("whoop_journal_facts")
          .select("cycle_start_at, question_text, answered_yes")
          .eq("user_id", userId)
          .gte("cycle_start_at", `${lookbackStart}T00:00:00.000Z`)
          .order("cycle_start_at", { ascending: true }),
      ]);

      if (dailyRes.error) throw new Error(`Failed to load daily metrics: ${dailyRes.error.message}`);
      if (sleepsRes.error) throw new Error(`Failed to load sleep facts: ${sleepsRes.error.message}`);
      if (journalRes.error) throw new Error(`Failed to load journal facts: ${journalRes.error.message}`);

      const dailyRows = ((dailyRes.data ?? []) as DailyMetricRow[]).map((row) => ({
        ...row,
        recovery_score_pct: row.recovery_score_pct == null ? null : Number(row.recovery_score_pct),
        hrv_ms: row.hrv_ms == null ? null : Number(row.hrv_ms),
        day_strain: row.day_strain == null ? null : Number(row.day_strain),
        workouts_count: row.workouts_count == null ? 0 : Number(row.workouts_count),
      }));

      const sleepRows = (sleepsRes.data ?? []) as SleepFactRow[];
      const journalRows = (journalRes.data ?? []) as JournalFactRow[];

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

      const builders: InsightBuilder[] = [
    {
      key: "sober_streak_effect",
      title: "Sober streak effect",
      fallbackAccent: "SOON",
      fallbackDetail: "We need more alcohol journal history to estimate this effect",
      fallbackTone: "green",
      build: () => {
        const alcoholRows = journalRows
          .filter((row) => row.answered_yes != null && row.question_text.toLowerCase().includes("alcohol"))
          .map((row) => ({
            date: isoToUtcDate(row.cycle_start_at),
            drankAlcohol: row.answered_yes === true,
          }))
          .sort((a, b) => a.date.localeCompare(b.date));

        const recoveryWithStreak: number[] = [];
        const recoveryAfterAlcohol: number[] = [];
        let soberStreak = 0;
        let previousDate: string | null = null;

        for (const row of alcoholRows) {
          if (previousDate && dayDiff(row.date, previousDate) !== 1) {
            soberStreak = 0;
          }

          soberStreak = row.drankAlcohol ? 0 : soberStreak + 1;
          const recovery = dailyByDate.get(row.date)?.recovery_score_pct ?? null;

          if (recovery != null) {
            if (soberStreak >= 2) recoveryWithStreak.push(recovery);
            if (row.drankAlcohol) recoveryAfterAlcohol.push(recovery);
          }

          previousDate = row.date;
        }

        const soberBaseline = averageOr(recoveryWithStreak, averageOr(dailyRows.map((row) => row.recovery_score_pct ?? 0).filter((value) => value > 0), 0));
        const alcoholBaseline = averageOr(recoveryAfterAlcohol, soberBaseline);
        const uplift = Math.round(soberBaseline - alcoholBaseline);

        return {
          accent: formatSignedPoints(uplift),
          detail:
            alcoholRows.length > 0
              ? `When you skip alcohol for 2+ days, your recovery is ~${Math.abs(uplift)} points ${uplift >= 0 ? "higher" : "lower"}`
              : "No strong alcohol signal yet, so this estimate is based on your current recovery baseline",
          accentTone: uplift >= 0 ? "green" : "red",
          sampleSize: Math.max(alcoholRows.length, recoveryWithStreak.length + recoveryAfterAlcohol.length, 1),
        };
      },
    },
    {
      key: "optimal_sleep_cutoff",
      title: "Optimal sleep cutoff",
      fallbackAccent: "SOON",
      fallbackDetail: "We need more sleep history to estimate your best bedtime cutoff",
      build: () => {
        const rows = sleepJoined.filter((row) => row.recovery != null);
        if (rows.length === 0) {
          const sleepOnlyRows = sleepJoined.filter((row) => row.sleepStartMinute != null);
          if (sleepOnlyRows.length === 0) throw new Error("insufficient_data");
          const fallbackCutoff = sleepOnlyRows
            .map((row) => Math.floor(adjustedSleepMinute(row.sleepStartMinute) / OPTIMAL_SLEEP_BUCKET_MINUTES) * OPTIMAL_SLEEP_BUCKET_MINUTES + OPTIMAL_SLEEP_BUCKET_MINUTES)
            .sort((a, b) => a - b)[Math.floor(sleepOnlyRows.length / 2)];

          return {
            accent: minutesToClock(fallbackCutoff % MINUTES_IN_DAY),
            detail: `Your current sleep history suggests aiming to be asleep before ${minutesToClock(fallbackCutoff % MINUTES_IN_DAY)}`,
            accentTone: "neutral",
            sampleSize: sleepOnlyRows.length,
          };
        }

        const candidateCutoffs = [...new Set(
          rows
            .map((row) => Math.floor(adjustedSleepMinute(row.sleepStartMinute) / OPTIMAL_SLEEP_BUCKET_MINUTES) * OPTIMAL_SLEEP_BUCKET_MINUTES + OPTIMAL_SLEEP_BUCKET_MINUTES)
            .filter((cutoffMinute) => cutoffMinute <= OPTIMAL_SLEEP_LATEST_REASONABLE_CUTOFF),
        )].sort((a, b) => a - b);

        let winner:
          | {
              cutoffMinute: number;
              avgRecoveryBeforeCutoff: number;
              avgRecoveryAfterCutoff: number;
              uplift: number;
            }
          | null = null;

        for (const cutoffMinute of candidateCutoffs) {
          const beforeRows = rows.filter((row) => adjustedSleepMinute(row.sleepStartMinute) < cutoffMinute);
          const afterRows = rows.filter((row) => adjustedSleepMinute(row.sleepStartMinute) >= cutoffMinute);

          if (beforeRows.length === 0 || afterRows.length === 0) continue;

          const avgRecoveryBeforeCutoff = average(beforeRows.map((row) => row.recovery as number));
          const avgRecoveryAfterCutoff = average(afterRows.map((row) => row.recovery as number));
          const uplift = avgRecoveryBeforeCutoff - avgRecoveryAfterCutoff;

          if (!winner || uplift > winner.uplift) {
            winner = { cutoffMinute, avgRecoveryBeforeCutoff, avgRecoveryAfterCutoff, uplift };
          }
        }

        if (!winner) {
          const medianCutoff = candidateCutoffs[Math.floor(candidateCutoffs.length / 2)] ?? adjustedSleepMinute(rows[0].sleepStartMinute);
          winner = {
            cutoffMinute: medianCutoff,
            avgRecoveryBeforeCutoff: averageOr(rows.map((row) => row.recovery as number), 0),
            avgRecoveryAfterCutoff: averageOr(rows.map((row) => row.recovery as number), 0),
            uplift: 0,
          };
        }

        const bedtimeBefore = minutesToClock(winner.cutoffMinute % MINUTES_IN_DAY);
        const recoveryAbove = Math.floor(winner.avgRecoveryBeforeCutoff);
        const recoveryAfter = Math.round(winner.avgRecoveryAfterCutoff);

        return {
          accent: bedtimeBefore,
          detail: `Your recovery is usually ${recoveryAbove}+ when you're asleep before ${bedtimeBefore}. When you go later, it drops to ${recoveryAfter} on average`,
          accentTone: "neutral",
          sampleSize: rows.length,
        };
      },
    },
    {
      key: "body_battery_leak",
      title: "Body battery leak",
      fallbackAccent: "SOON",
      fallbackDetail: "We need more short-sleep nights to estimate your next-day recovery penalty",
      fallbackTone: "red",
      build: () => {
        const rows = sleepJoined.filter((row) => row.sleepDurationMin != null && row.recovery != null);
        if (rows.length === 0) throw new Error("insufficient_data");

        const thresholdOptions = [6, 6.5, 7];
        let bestSplit: { thresholdHours: number; shortRecoveries: number[]; normalRecoveries: number[]; penalty: number } | null = null;

        for (const thresholdHours of thresholdOptions) {
          const thresholdMinutes = thresholdHours * 60;
          const shortRecoveries = rows.filter((row) => (row.sleepDurationMin as number) < thresholdMinutes).map((row) => row.recovery as number);
          const normalRecoveries = rows.filter((row) => (row.sleepDurationMin as number) >= thresholdMinutes).map((row) => row.recovery as number);
          if (shortRecoveries.length === 0 || normalRecoveries.length === 0) continue;

          const penalty = average(normalRecoveries) - average(shortRecoveries);
          if (!bestSplit || penalty > bestSplit.penalty) {
            bestSplit = { thresholdHours, shortRecoveries, normalRecoveries, penalty };
          }
        }

        if (!bestSplit) {
          const sortedRows = [...rows].sort((a, b) => (a.sleepDurationMin as number) - (b.sleepDurationMin as number));
          const midpoint = Math.max(1, Math.floor(sortedRows.length / 2));
          const shortRecoveries = sortedRows.slice(0, midpoint).map((row) => row.recovery as number);
          const normalRecoveries = sortedRows.slice(midpoint).map((row) => row.recovery as number);
          bestSplit = {
            thresholdHours: 6.5,
            shortRecoveries,
            normalRecoveries: normalRecoveries.length > 0 ? normalRecoveries : shortRecoveries,
            penalty: averageOr(normalRecoveries, averageOr(shortRecoveries, 0)) - averageOr(shortRecoveries, 0),
          };
        }

        const recoveryPenalty = Math.round(averageOr(bestSplit.normalRecoveries, 0) - averageOr(bestSplit.shortRecoveries, 0));

        const thresholdText = Math.abs(bestSplit.thresholdHours - Math.round(bestSplit.thresholdHours)) < 0.01
          ? `${Math.round(bestSplit.thresholdHours)}h`
          : `${bestSplit.thresholdHours.toFixed(1)}h`;

        return {
          accent: formatSignedPoints(-recoveryPenalty),
          detail: `Your body loses ~${recoveryPenalty} recovery points after nights with less than ${thresholdText} of sleep`,
          accentTone: "red",
          sampleSize: bestSplit.shortRecoveries.length + bestSplit.normalRecoveries.length,
        };
      },
    },
    {
      key: "strain_limit",
      title: "Your strain limit",
      fallbackAccent: "SOON",
      fallbackDetail: "We need more varied strain data to estimate your tolerance",
      build: () => {
        const rows = dailyRows.filter((row) => row.day_strain != null && row.recovery_score_pct != null);
        if (rows.length === 0) throw new Error("insufficient_data");

        const strains = rows.map((row) => row.day_strain as number);
        const sortedThresholds = [...new Set(strains.map((value) => clampRound(value, 1)))].sort((a, b) => a - b);
        let bestThreshold: { threshold: number; drop: number } | null = null;

        for (const threshold of sortedThresholds) {
          const low = rows.filter((row) => (row.day_strain as number) <= threshold).map((row) => row.recovery_score_pct as number);
          const high = rows.filter((row) => (row.day_strain as number) > threshold).map((row) => row.recovery_score_pct as number);
          if (low.length === 0 || high.length === 0) continue;

          const drop = average(high) - average(low);
          if (!bestThreshold || drop < bestThreshold.drop) bestThreshold = { threshold, drop };
        }

        if (!bestThreshold) {
          const threshold = percentile(strains, 0.5);
          bestThreshold = { threshold, drop: 0 };
        }

        const threshold = formatThreshold(bestThreshold.threshold);
        return {
          accent: threshold,
          detail: `Your recovery starts dropping when strain goes above ~${threshold}`,
          accentTone: "neutral",
          sampleSize: rows.length,
        };
      },
    },
    {
      key: "recovery_speed",
      title: "Recovery speed",
      fallbackAccent: "SOON",
      fallbackDetail: "We need more high-strain history to estimate your recovery speed",
      build: () => {
        const rows = dailyRows.filter((row) => row.day_strain != null && row.recovery_score_pct != null).sort((a, b) => a.metric_date.localeCompare(b.metric_date));
        if (rows.length === 0) throw new Error("insufficient_data");

        const strains = rows.map((row) => row.day_strain as number);
        const recoveries = rows.map((row) => row.recovery_score_pct as number);
        const highStrainThreshold = Math.max(14, percentile(strains, 0.75));
        const recoveryThreshold = Math.max(RECOVERY_GREEN_MIN, percentile(recoveries, 0.5));
        const eventIndexes = rows.map((row, index) => ({ row, index })).filter(({ row }) => (row.day_strain as number) >= highStrainThreshold).map(({ index }) => index);

        const daysToRecover: number[] = [];
        for (const startIndex of eventIndexes) {
          for (let nextIndex = startIndex + 1; nextIndex < rows.length; nextIndex += 1) {
            if ((rows[nextIndex].recovery_score_pct as number) >= recoveryThreshold) {
              daysToRecover.push(dayDiff(rows[nextIndex].metric_date, rows[startIndex].metric_date));
              break;
            }
          }
        }

        if (daysToRecover.length === 0) {
          daysToRecover.push(1);
        }

        const avgDays = clampRound(average(daysToRecover), 1);
        return {
          accent: `${avgDays.toFixed(1)} days`,
          detail: `After intense days, your body recovers in ~${avgDays.toFixed(1)} days`,
          accentTone: "neutral",
          sampleSize: daysToRecover.length,
        };
      },
    },
    {
      key: "best_worst_day",
      title: "Best & worst day",
      fallbackAccent: "SOON",
      fallbackDetail: "We need more recovery history to spot your strongest weekday pattern",
      build: () => {
        const rows = dailyRows.filter((row) => row.recovery_score_pct != null);
        if (rows.length === 0) throw new Error("insufficient_data");

        const byWeekday = new Map<number, number[]>();
        for (const row of rows) {
          const weekday = getWeekdayIndex(row.metric_date);
          const values = byWeekday.get(weekday) ?? [];
          values.push(row.recovery_score_pct as number);
          byWeekday.set(weekday, values);
        }

        const weekdayAverages = [...byWeekday.entries()]
          .filter(([, values]) => values.length >= 1)
          .map(([weekday, values]) => ({ weekday, avgRecovery: Math.round(average(values)), sampleSize: values.length }));

        if (weekdayAverages.length === 0) throw new Error("insufficient_data");

        const best = [...weekdayAverages].sort((a, b) => b.avgRecovery - a.avgRecovery)[0];
        const worst = [...weekdayAverages].sort((a, b) => a.avgRecovery - b.avgRecovery)[0];

        return {
          accent: `${formatWeekdayShort(best.weekday)} / ${formatWeekdayShort(worst.weekday)}`,
          detail: `Your best recovery day: ${formatWeekdayLong(best.weekday)} (avg ${best.avgRecovery}%). Your worst: ${formatWeekdayLong(worst.weekday)} (avg ${worst.avgRecovery}%)`,
          accentTone: "neutral",
          sampleSize: best.sampleSize + worst.sampleSize,
        };
      },
    },
    {
      key: "hrv_threshold",
      title: "HRV threshold",
      fallbackAccent: "SOON",
      fallbackDetail: "We need more matched HRV and next-day recovery data to estimate your threshold",
      fallbackTone: "red",
      build: () => {
        const pairedRows = dailyRows
          .map((row) => ({
            hrv: row.hrv_ms,
            nextDayRecovery: dailyByDate.get(addDaysToDateString(row.metric_date, 1))?.recovery_score_pct ?? null,
          }))
          .filter((row): row is { hrv: number; nextDayRecovery: number } => row.hrv != null && row.nextDayRecovery != null);

        if (pairedRows.length === 0) {
          const sameDayRows = dailyRows
            .filter((row) => row.hrv_ms != null && row.recovery_score_pct != null)
            .map((row) => ({ hrv: row.hrv_ms as number, nextDayRecovery: row.recovery_score_pct as number }));

          if (sameDayRows.length === 0) throw new Error("insufficient_data");

          const threshold = Math.round(percentile(sameDayRows.map((row) => row.hrv), 0.5));
          const low = sameDayRows.filter((row) => row.hrv < threshold).map((row) => row.nextDayRecovery);
          return {
            accent: `<${threshold} ms`,
            detail: `When your HRV drops below ${threshold}, your recovery tends to sit around ${Math.round(averageOr(low, average(sameDayRows.map((row) => row.nextDayRecovery))))}%`,
            accentTone: "red",
            sampleSize: sameDayRows.length,
          };
        }

        const thresholds = [...new Set(pairedRows.map((row) => Math.round(row.hrv)))].sort((a, b) => a - b);
        let bestSplit: { threshold: number; lowAvg: number; drop: number; lowCount: number; highCount: number } | null = null;

        for (const threshold of thresholds) {
          const low = pairedRows.filter((row) => row.hrv < threshold).map((row) => row.nextDayRecovery);
          const high = pairedRows.filter((row) => row.hrv >= threshold).map((row) => row.nextDayRecovery);
          if (low.length === 0 || high.length === 0) continue;

          const lowAvg = average(low);
          const drop = lowAvg - average(high);
          if (!bestSplit || drop < bestSplit.drop) {
            bestSplit = { threshold, lowAvg, drop, lowCount: low.length, highCount: high.length };
          }
        }

        if (!bestSplit) {
          const threshold = Math.round(percentile(pairedRows.map((row) => row.hrv), 0.5));
          const low = pairedRows.filter((row) => row.hrv < threshold).map((row) => row.nextDayRecovery);
          const high = pairedRows.filter((row) => row.hrv >= threshold).map((row) => row.nextDayRecovery);
          bestSplit = {
            threshold,
            lowAvg: averageOr(low, averageOr(high, 0)),
            drop: averageOr(low, 0) - averageOr(high, 0),
            lowCount: low.length,
            highCount: high.length,
          };
        }

        return {
          accent: `<${bestSplit.threshold} ms`,
          detail: `When your HRV drops below ${bestSplit.threshold}, your next-day recovery averages ${Math.round(bestSplit.lowAvg)}% regardless of sleep`,
          accentTone: "red",
          sampleSize: bestSplit.lowCount + bestSplit.highCount,
        };
      },
    },
    {
      key: "sleep_gap_days",
      title: "Sleep gap days",
      fallbackAccent: "SOON",
      fallbackDetail: "We need more sleep history to spot your undersleep pattern by weekday",
      fallbackTone: "red",
      build: () => {
        const rows = sleepJoined.filter((row) => row.sleepDurationMin != null);
        if (rows.length === 0) throw new Error("insufficient_data");

        const overallAverage = average(rows.map((row) => row.sleepDurationMin as number));
        const byWeekday = new Map<number, number[]>();
        for (const row of rows) {
          const weekday = getWeekdayIndex(row.wakeDate);
          const values = byWeekday.get(weekday) ?? [];
          values.push(row.sleepDurationMin as number);
          byWeekday.set(weekday, values);
        }

        const weekdayGaps = [...byWeekday.entries()]
          .filter(([, values]) => values.length >= 1)
          .map(([weekday, values]) => ({ weekday, avgSleep: average(values), deltaMinutes: average(values) - overallAverage }))
          .sort((a, b) => a.deltaMinutes - b.deltaMinutes);

        if (weekdayGaps.length === 0) throw new Error("insufficient_data");

        const topTwo = weekdayGaps.length >= 2 ? weekdayGaps.slice(0, 2) : [weekdayGaps[0], weekdayGaps[0]];

        return {
          accent: `${formatWeekdayShort(topTwo[0].weekday)} & ${formatWeekdayShort(topTwo[1].weekday)}`,
          detail: `You consistently undersleep on ${formatWeekdayLong(topTwo[0].weekday)}s and ${formatWeekdayLong(topTwo[1].weekday)}s`,
          accentTone: "red",
          sampleSize: topTwo.length,
        };
      },
    },
    {
      key: "recovery_streak",
      title: "Recovery streak",
      fallbackAccent: "SOON",
      fallbackDetail: "We need more recovery history to summarize your recent streaks",
      fallbackTone: "green",
      build: () => {
        const rows = dailyRows.filter((row) => row.recovery_score_pct != null).sort((a, b) => a.metric_date.localeCompare(b.metric_date));
        if (rows.length === 0) throw new Error("insufficient_data");

        const last90 = rows.slice(-90);
        let green = 0;
        let yellow = 0;
        let red = 0;
        let longestGreenStreak = 0;
        let currentGreenStreak = 0;
        let previousDate: string | null = null;

        for (const row of last90) {
          const recovery = row.recovery_score_pct as number;
          if (recovery >= RECOVERY_GREEN_MIN) {
            green += 1;
            currentGreenStreak = previousDate && dayDiff(row.metric_date, previousDate) === 1 ? currentGreenStreak + 1 : 1;
            longestGreenStreak = Math.max(longestGreenStreak, currentGreenStreak);
          } else {
            currentGreenStreak = 0;
            if (recovery >= RECOVERY_YELLOW_MIN) {
              yellow += 1;
            } else {
              red += 1;
            }
          }

          previousDate = row.metric_date;
        }

        return {
          accent: `${Math.max(longestGreenStreak, 1)} days`,
          detail: `Last 90 days: ${green} green, ${yellow} yellow, ${red} red. Longest green streak: ${Math.max(longestGreenStreak, 1)} days`,
          accentTone: "green",
          sampleSize: last90.length,
        };
      },
    },
      ];

      return builders.map((builder) => buildInsightCard(nowIso, builder));
    } catch (error) {
      console.error(`Failed to load early insights for user ${userId}`, error);
      const nowIso = new Date().toISOString();
      return getFallbackInsightCards(nowIso);
    }
  };

  return unstable_cache(loadUserEarlyInsights, [EARLY_INSIGHTS_TAG_PREFIX, userId], {
    revalidate: 300,
    tags: [`${EARLY_INSIGHTS_TAG_PREFIX}:${userId}`],
  })();
};

export const revalidateUserEarlyInsights = (userId: string) =>
  revalidateTag(`${EARLY_INSIGHTS_TAG_PREFIX}:${userId}`);
