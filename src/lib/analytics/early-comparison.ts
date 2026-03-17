import "server-only";

import { supabaseAdmin } from "@/lib/supabase/admin-client";
import { publicEnv } from "@/lib/env";
import { estimatePercentileFromAnchors } from "@/lib/analytics/percentile";

type MetricKey = "recovery_score_pct" | "asleep_duration_min" | "hrv_ms";
type ComparisonState = "ok" | "no_user_value" | "no_dataset";

type AggregateRow = {
  metric_key: MetricKey;
  metric_value: number;
  window_end_date: string;
};

type CohortPercentileRow = {
  metric_key: MetricKey;
  sample_size: number;
  p10: number;
  p25: number;
  p50: number;
  p75: number;
  p90: number;
};

type RecoveryComparison = {
  state: ComparisonState;
  percentile: number | null;
  sampleSize: number;
};

type AverageDeltaComparison = {
  state: ComparisonState;
  delta: number | null;
  sampleSize: number;
};

export type EarlyComparisonSectionData = {
  recovery: RecoveryComparison;
  sleep: AverageDeltaComparison;
  hrv: AverageDeltaComparison;
};

const METRICS: MetricKey[] = ["recovery_score_pct", "asleep_duration_min", "hrv_ms"];

const buildRecoveryComparison = (
  userValue: number | null,
  cohort: CohortPercentileRow | undefined,
): RecoveryComparison => {
  if (userValue == null) {
    return {
      state: "no_user_value",
      percentile: null,
      sampleSize: cohort?.sample_size ?? 0,
    };
  }

  if (!cohort) {
    return {
      state: "no_dataset",
      percentile: null,
      sampleSize: 0,
    };
  }

  const percentile = estimatePercentileFromAnchors(userValue, {
    p10: cohort.p10,
    p25: cohort.p25,
    p50: cohort.p50,
    p75: cohort.p75,
    p90: cohort.p90,
  });

  return {
    state: "ok",
    percentile,
    sampleSize: cohort.sample_size,
  };
};

export const getEarlyComparisonSectionData = async (userId: string): Promise<EarlyComparisonSectionData> => {
  const today = new Date().toISOString().slice(0, 10);

  const [{ data: userData, error: userError }, { data: cohortData, error: cohortError }] = await Promise.all([
    supabaseAdmin
    .from("user_metric_30d_aggregates")
    .select("metric_key, metric_value, window_end_date")
    .eq("user_id", userId)
    .eq("window_end_date", today)
    .in("metric_key", METRICS),
    supabaseAdmin
    .from("cohort_metric_percentiles")
    .select("metric_key, sample_size, p10, p25, p50, p75, p90")
    .eq("window_end_date", today)
    .eq("cohort_key", "all")
    .in("metric_key", METRICS),
  ]);

  if (userError) {
    throw new Error(`Failed to load early comparison aggregates: ${userError.message}`);
  }

  if (cohortError) {
    throw new Error(`Failed to load early comparison cohort aggregates: ${cohortError.message}`);
  }

  const userRows = ((userData ?? []) as AggregateRow[]).map((row) => ({
    ...row,
    metric_value: Number(row.metric_value),
  }));
  const cohortRows = ((cohortData ?? []) as CohortPercentileRow[]).map((row) => ({
    ...row,
    sample_size: Number(row.sample_size),
    p10: Number(row.p10),
    p25: Number(row.p25),
    p50: Number(row.p50),
    p75: Number(row.p75),
    p90: Number(row.p90),
  }));

  const cohortMinSampleSize = publicEnv.cohortMinSampleSize;
  const userValueByMetric = new Map<MetricKey, number>();
  const cohortByMetric = new Map<MetricKey, CohortPercentileRow>();

  for (const row of userRows) {
    if (Number.isFinite(row.metric_value)) {
      userValueByMetric.set(row.metric_key, row.metric_value);
    }
  }

  for (const row of cohortRows) {
    if (row.sample_size >= cohortMinSampleSize && Number.isFinite(row.p50)) {
      cohortByMetric.set(row.metric_key, row);
    }
  }

  const getDelta = (metricKey: MetricKey): AverageDeltaComparison => {
    const userValue = userValueByMetric.get(metricKey) ?? null;
    const cohort = cohortByMetric.get(metricKey);

    if (userValue == null) {
      return { state: "no_user_value", delta: null, sampleSize: cohort?.sample_size ?? 0 };
    }

    if (!cohort) {
      return { state: "no_dataset", delta: null, sampleSize: 0 };
    }

    return {
      state: "ok",
      delta: Math.round(userValue - cohort.p50),
      sampleSize: cohort.sample_size,
    };
  };

  const getRecovery = (): RecoveryComparison => {
    const userValue = userValueByMetric.get("recovery_score_pct") ?? null;
    const cohort = cohortByMetric.get("recovery_score_pct");

    if (userValue == null) {
      return { state: "no_user_value", percentile: null, sampleSize: cohort?.sample_size ?? 0 };
    }

    if (!cohort) {
      return { state: "no_dataset", percentile: null, sampleSize: 0 };
    }

    return buildRecoveryComparison(userValue, cohort);
  };

  return {
    recovery: getRecovery(),
    sleep: getDelta("asleep_duration_min"),
    hrv: getDelta("hrv_ms"),
  };
};
