import { getCurrentProfile } from "@/lib/auth/server";
import { getCohortFallbackOrder, type CohortMetricKey, type CohortStrategy } from "@/lib/analytics/cohorts";
import { estimatePercentileFromAnchors, percentileToRankLabel } from "@/lib/analytics/percentile";
import { isAggregateCohortEligible } from "@/lib/privacy/aggregate-guards";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";

const DEFAULT_METRICS: CohortMetricKey[] = ["hrv_ms", "sleep_performance_pct", "recovery_score_pct"];

type UserAggregateRow = {
  metric_key: CohortMetricKey;
  metric_value: number;
  window_end_date: string;
};

type CohortPercentileRow = {
  cohort_key: string;
  metric_key: CohortMetricKey;
  sample_size: number;
  p25: number;
  p50: number;
  p75: number;
  p90: number;
  p10: number;
};

export type ComparisonMetricState = "ok" | "no_user_value" | "insufficient_cohort";

export type UserCohortComparisonItem = {
  metricKey: CohortMetricKey;
  state: ComparisonMetricState;
  userValue: number | null;
  cohortKey: string | null;
  cohortStrategy: CohortStrategy | null;
  cohortSampleSize: number | null;
  percentile: number | null;
  rankLabel: string | null;
  fallbackUsed: boolean;
  preferredCohortKey: string;
  anchors: {
    p25: number | null;
    p50: number | null;
    p75: number | null;
    p90: number | null;
  };
};

const strategyFromCohortKey = (key: string): CohortStrategy => {
  if (key.startsWith("age_sex:")) return "age_sex";
  if (key.startsWith("age:")) return "age";
  return "all";
};

export const getUserCohortComparisons = async (
  userId: string,
  minSampleSize: number,
  metrics: CohortMetricKey[] = DEFAULT_METRICS,
): Promise<UserCohortComparisonItem[]> => {
  const profile = await getCurrentProfile(userId);
  if (!profile) {
    return metrics.map((metricKey) => ({
      metricKey,
      state: "no_user_value",
      userValue: null,
      cohortKey: null,
      cohortStrategy: null,
      cohortSampleSize: null,
      percentile: null,
      rankLabel: null,
      fallbackUsed: false,
      preferredCohortKey: "",
      anchors: { p25: null, p50: null, p75: null, p90: null },
    }));
  }

  const supabase = await createSupabaseServerClient();
  const today = new Date().toISOString().slice(0, 10);

  const { data: userMetricRowsRaw, error: userMetricError } = await supabase
    .from("user_metric_30d_aggregates")
    .select("metric_key, metric_value, window_end_date")
    .eq("user_id", userId)
    .eq("window_end_date", today)
    .in("metric_key", metrics);

  if (userMetricError) {
    throw new Error(`Failed to load user metric aggregates: ${userMetricError.message}`);
  }

  const userMetricRows = (userMetricRowsRaw ?? []) as UserAggregateRow[];
  const userMetricByKey = new Map<CohortMetricKey, UserAggregateRow>();
  for (const row of userMetricRows) {
    userMetricByKey.set(row.metric_key, row);
  }

  const cohortKeys = getCohortFallbackOrder(profile.age_bucket, profile.sex);

  const { data: cohortRowsRaw, error: cohortRowsError } = await supabase
    .from("cohort_metric_percentiles")
    .select("cohort_key, metric_key, sample_size, p10, p25, p50, p75, p90")
    .eq("window_end_date", today)
    .in("metric_key", metrics)
    .in("cohort_key", cohortKeys);

  if (cohortRowsError) {
    throw new Error(`Failed to load cohort percentiles: ${cohortRowsError.message}`);
  }

  const cohortRows = (cohortRowsRaw ?? []) as CohortPercentileRow[];

  const results: UserCohortComparisonItem[] = [];

  for (const metricKey of metrics) {
    const userMetric = userMetricByKey.get(metricKey);
    const preferredCohortKey = cohortKeys[0];

    if (!userMetric) {
      results.push({
        metricKey,
        state: "no_user_value",
        userValue: null,
        cohortKey: null,
        cohortStrategy: null,
        cohortSampleSize: null,
        percentile: null,
        rankLabel: null,
        fallbackUsed: false,
        preferredCohortKey,
        anchors: { p25: null, p50: null, p75: null, p90: null },
      });
      continue;
    }

    const eligible = cohortKeys
      .map((cohortKey) => cohortRows.find((row) => row.metric_key === metricKey && row.cohort_key === cohortKey))
      .filter((row): row is CohortPercentileRow => Boolean(row))
      .find((row) => isAggregateCohortEligible(Number(row.sample_size), minSampleSize));

    if (!eligible) {
      results.push({
        metricKey,
        state: "insufficient_cohort",
        userValue: Number(userMetric.metric_value),
        cohortKey: null,
        cohortStrategy: null,
        cohortSampleSize: null,
        percentile: null,
        rankLabel: null,
        fallbackUsed: false,
        preferredCohortKey,
        anchors: { p25: null, p50: null, p75: null, p90: null },
      });
      continue;
    }

    const percentile = estimatePercentileFromAnchors(Number(userMetric.metric_value), {
      p10: Number(eligible.p10),
      p25: Number(eligible.p25),
      p50: Number(eligible.p50),
      p75: Number(eligible.p75),
      p90: Number(eligible.p90),
    });

    results.push({
      metricKey,
      state: "ok",
      userValue: Number(userMetric.metric_value),
      cohortKey: eligible.cohort_key,
      cohortStrategy: strategyFromCohortKey(eligible.cohort_key),
      cohortSampleSize: Number(eligible.sample_size),
      percentile,
      rankLabel: percentileToRankLabel(percentile),
      fallbackUsed: eligible.cohort_key !== preferredCohortKey,
      preferredCohortKey,
      anchors: {
        p25: Number(eligible.p25),
        p50: Number(eligible.p50),
        p75: Number(eligible.p75),
        p90: Number(eligible.p90),
      },
    });
  }

  return results;
};
