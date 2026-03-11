import "server-only";

import { supabaseAdmin } from "@/lib/supabase/admin-client";

type MetricKey = "recovery_score_pct" | "asleep_duration_min" | "hrv_ms";
type ComparisonState = "ok" | "no_user_value" | "no_dataset";

type AggregateRow = {
  user_id: string;
  metric_key: MetricKey;
  metric_value: number;
  window_end_date: string;
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

const average = (values: number[]): number => {
  if (values.length === 0) {
    return Number.NaN;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
};

const buildAverageDeltaComparison = (userValue: number | null, datasetValues: number[]): AverageDeltaComparison => {
  if (userValue == null) {
    return {
      state: "no_user_value",
      delta: null,
      sampleSize: datasetValues.length,
    };
  }

  if (datasetValues.length === 0) {
    return {
      state: "no_dataset",
      delta: null,
      sampleSize: 0,
    };
  }

  return {
    state: "ok",
    delta: Math.round(userValue - average(datasetValues)),
    sampleSize: datasetValues.length,
  };
};

const buildRecoveryComparison = (userValue: number | null, datasetValues: number[]): RecoveryComparison => {
  if (userValue == null) {
    return {
      state: "no_user_value",
      percentile: null,
      sampleSize: datasetValues.length,
    };
  }

  if (datasetValues.length === 0) {
    return {
      state: "no_dataset",
      percentile: null,
      sampleSize: 0,
    };
  }

  const lowerCount = datasetValues.filter((value) => value < userValue).length;
  const equalCount = datasetValues.filter((value) => value === userValue).length;
  const percentile = Math.round(((lowerCount + equalCount * 0.5) / datasetValues.length) * 100);

  return {
    state: "ok",
    percentile,
    sampleSize: datasetValues.length,
  };
};

export const getEarlyComparisonSectionData = async (userId: string): Promise<EarlyComparisonSectionData> => {
  const today = new Date().toISOString().slice(0, 10);

  const { data, error } = await supabaseAdmin
    .from("user_metric_30d_aggregates")
    .select("user_id, metric_key, metric_value")
    .eq("window_end_date", today)
    .in("metric_key", METRICS);

  if (error) {
    throw new Error(`Failed to load early comparison aggregates: ${error.message}`);
  }

  const rows = ((data ?? []) as AggregateRow[]).map((row) => ({
    ...row,
    metric_value: Number(row.metric_value),
  }));

  const valuesByMetric = new Map<MetricKey, number[]>();
  const userValueByMetric = new Map<MetricKey, number>();

  for (const metric of METRICS) {
    valuesByMetric.set(metric, []);
  }

  for (const row of rows) {
    if (!Number.isFinite(row.metric_value)) {
      continue;
    }

    valuesByMetric.get(row.metric_key)?.push(row.metric_value);

    if (row.user_id === userId) {
      userValueByMetric.set(row.metric_key, row.metric_value);
    }
  }

  return {
    recovery: buildRecoveryComparison(userValueByMetric.get("recovery_score_pct") ?? null, valuesByMetric.get("recovery_score_pct") ?? []),
    sleep: buildAverageDeltaComparison(userValueByMetric.get("asleep_duration_min") ?? null, valuesByMetric.get("asleep_duration_min") ?? []),
    hrv: buildAverageDeltaComparison(userValueByMetric.get("hrv_ms") ?? null, valuesByMetric.get("hrv_ms") ?? []),
  };
};