import "server-only";

import { publicEnv } from "@/lib/env";
import { estimatePercentileFromAnchors } from "@/lib/analytics/percentile";
import {
  buildPercentileAnchors,
  getLatestAggregateRowsForMetrics,
  getLatestAggregateRowsForUser,
} from "@/lib/analytics/latest-aggregates";

type MetricKey = "recovery_score_pct" | "asleep_duration_min" | "hrv_ms";
type ComparisonState = "ok" | "no_user_value" | "no_dataset";

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

const emptyComparison = (): EarlyComparisonSectionData => ({
  recovery: { state: "no_dataset", percentile: null, sampleSize: 0 },
  sleep: { state: "no_dataset", delta: null, sampleSize: 0 },
  hrv: { state: "no_dataset", delta: null, sampleSize: 0 },
});

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
  try {
    const [userRows, latestRows] = await Promise.all([
      getLatestAggregateRowsForUser(userId, METRICS),
      getLatestAggregateRowsForMetrics(METRICS),
    ]);

    const cohortMinSampleSize = publicEnv.cohortMinSampleSize;
    const userValueByMetric = new Map<MetricKey, number>();
    const cohortByMetric = new Map<MetricKey, CohortPercentileRow>();

    for (const row of userRows) {
      if (Number.isFinite(row.metric_value)) {
        userValueByMetric.set(row.metric_key as MetricKey, row.metric_value);
      }
    }

    for (const metricKey of METRICS) {
      const metricValues = latestRows
        .filter((row) => row.metric_key === metricKey)
        .map((row) => Number(row.metric_value))
        .filter((value) => Number.isFinite(value));

      const anchors = buildPercentileAnchors(metricValues);
      if (anchors && anchors.sampleSize >= cohortMinSampleSize && Number.isFinite(anchors.p50)) {
        cohortByMetric.set(metricKey, {
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
  } catch (error) {
    console.error("Failed to load early comparison section data", error);
    return emptyComparison();
  }
};
