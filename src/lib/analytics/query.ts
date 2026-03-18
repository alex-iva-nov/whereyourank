import { getCurrentProfile } from "@/lib/auth/server";
import { getCohortFallbackOrder, type CohortMetricKey, type CohortStrategy } from "@/lib/analytics/cohorts";
import {
  buildPercentileAnchors,
  getLatestAggregateProfiles,
  getLatestAggregateRowsForMetrics,
  getLatestAggregateRowsForUser,
} from "@/lib/analytics/latest-aggregates";
import { estimatePercentileFromAnchors, percentileToRankLabel } from "@/lib/analytics/percentile";
import { isAggregateCohortEligible } from "@/lib/privacy/aggregate-guards";

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

  const [userMetricRows, latestRows] = await Promise.all([
    getLatestAggregateRowsForUser(userId, metrics),
    getLatestAggregateRowsForMetrics(metrics),
  ]);

  const userMetricByKey = new Map<CohortMetricKey, UserAggregateRow>();
  for (const row of userMetricRows as UserAggregateRow[]) {
    userMetricByKey.set(row.metric_key as CohortMetricKey, row);
  }

  const cohortKeys = getCohortFallbackOrder(profile.age_bucket, profile.sex);
  const latestProfiles = await getLatestAggregateProfiles(latestRows.map((row) => row.user_id));
  const cohortRows: CohortPercentileRow[] = [];

  for (const metricKey of metrics) {
    const metricRows = latestRows.filter((row) => row.metric_key === metricKey);

    for (const cohortKey of cohortKeys) {
      const values = metricRows
        .filter((row) => {
          const rowProfile = latestProfiles.get(row.user_id);
          if (!rowProfile) return false;

          if (cohortKey === "all") return true;
          if (cohortKey === `age:${profile.age_bucket}`) {
            return rowProfile.age_bucket === profile.age_bucket;
          }

          return (
            cohortKey === `age_sex:${profile.age_bucket}:${profile.sex}` &&
            rowProfile.age_bucket === profile.age_bucket &&
            rowProfile.sex === profile.sex
          );
        })
        .map((row) => Number(row.metric_value))
        .filter((value) => Number.isFinite(value));

      const anchors = buildPercentileAnchors(values);
      if (!anchors) {
        continue;
      }

      cohortRows.push({
        cohort_key: cohortKey,
        metric_key: metricKey,
        sample_size: anchors.sampleSize,
        p10: anchors.p10,
        p25: anchors.p25,
        p50: anchors.p50,
        p75: anchors.p75,
        p90: anchors.p90,
      });
    }
  }

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
