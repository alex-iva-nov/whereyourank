import "server-only";

import { supabaseAdmin } from "@/lib/supabase/admin-client";

type AggregateRow = {
  user_id: string;
  metric_key: string;
  metric_value: number;
  window_end_date: string;
};

type UserProfileRow = {
  user_id: string;
  age_bucket: string;
  sex: string;
};

export type LatestAggregateRow = AggregateRow;
export type LatestAggregateProfile = UserProfileRow;

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

const unique = <T>(values: T[]): T[] => [...new Set(values)];

export const getLatestAnalyticsWindowDateForUser = async (userId: string): Promise<string | null> => {
  const { data: aggregateRow, error: aggregateError } = await supabaseAdmin
    .from("user_metric_30d_aggregates")
    .select("window_end_date")
    .eq("user_id", userId)
    .order("window_end_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (aggregateError) {
    throw new Error(`Failed to load latest analytics window: ${aggregateError.message}`);
  }

  const aggregateWindow = (aggregateRow as { window_end_date: string } | null)?.window_end_date ?? null;
  if (aggregateWindow) {
    return aggregateWindow;
  }

  const { data: metricRow, error: metricError } = await supabaseAdmin
    .from("user_daily_metrics")
    .select("metric_date")
    .eq("user_id", userId)
    .order("metric_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (metricError) {
    throw new Error(`Failed to load latest metric date: ${metricError.message}`);
  }

  return (metricRow as { metric_date: string } | null)?.metric_date ?? null;
};

export const getLatestAggregateRowsForUser = async (
  userId: string,
  metricKeys: string[],
): Promise<LatestAggregateRow[]> => {
  const { data, error } = await supabaseAdmin
    .from("user_metric_30d_aggregates")
    .select("user_id, metric_key, metric_value, window_end_date")
    .eq("user_id", userId)
    .in("metric_key", metricKeys)
    .order("window_end_date", { ascending: false });

  if (error) {
    throw new Error(`Failed to load latest aggregate rows for user: ${error.message}`);
  }

  const latestByMetric = new Map<string, LatestAggregateRow>();

  for (const row of (data ?? []) as Array<{ user_id: string; metric_key: string; metric_value: number; window_end_date: string }>) {
    if (!latestByMetric.has(row.metric_key)) {
      latestByMetric.set(row.metric_key, {
        user_id: row.user_id,
        metric_key: row.metric_key,
        metric_value: Number(row.metric_value),
        window_end_date: row.window_end_date,
      });
    }
  }

  return metricKeys
    .map((metricKey) => latestByMetric.get(metricKey))
    .filter((row): row is LatestAggregateRow => Boolean(row));
};

export const getLatestAggregateRowsForMetrics = async (metricKeys: string[]): Promise<LatestAggregateRow[]> => {
  const { data, error } = await supabaseAdmin
    .from("user_metric_30d_aggregates")
    .select("user_id, metric_key, metric_value, window_end_date")
    .in("metric_key", metricKeys)
    .order("window_end_date", { ascending: false });

  if (error) {
    throw new Error(`Failed to load latest aggregate rows: ${error.message}`);
  }

  const latestByUserMetric = new Map<string, LatestAggregateRow>();

  for (const row of (data ?? []) as Array<{ user_id: string; metric_key: string; metric_value: number; window_end_date: string }>) {
    const key = `${row.user_id}:${row.metric_key}`;
    if (!latestByUserMetric.has(key)) {
      latestByUserMetric.set(key, {
        user_id: row.user_id,
        metric_key: row.metric_key,
        metric_value: Number(row.metric_value),
        window_end_date: row.window_end_date,
      });
    }
  }

  return [...latestByUserMetric.values()];
};

export const getLatestAggregateProfiles = async (userIds: string[]): Promise<Map<string, LatestAggregateProfile>> => {
  const ids = unique(userIds);
  if (ids.length === 0) {
    return new Map();
  }

  const { data, error } = await supabaseAdmin
    .from("user_profiles")
    .select("user_id, age_bucket, sex")
    .in("user_id", ids);

  if (error) {
    throw new Error(`Failed to load user profiles for cohorting: ${error.message}`);
  }

  return new Map(
    ((data ?? []) as UserProfileRow[]).map((row) => [
      row.user_id,
      {
        user_id: row.user_id,
        age_bucket: row.age_bucket,
        sex: row.sex,
      },
    ]),
  );
};

export const buildPercentileAnchors = (values: number[]) => {
  if (values.length === 0) {
    return null;
  }

  return {
    p10: percentile(values, 0.1),
    p25: percentile(values, 0.25),
    p50: percentile(values, 0.5),
    p75: percentile(values, 0.75),
    p90: percentile(values, 0.9),
    sampleSize: values.length,
  };
};
