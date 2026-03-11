export const COHORT_METRIC_KEYS = [
  "hrv_ms",
  "recovery_score_pct",
  "sleep_performance_pct",
  "asleep_duration_min",
  "day_strain",
] as const;

export type CohortMetricKey = (typeof COHORT_METRIC_KEYS)[number];

export type CohortStrategy = "age_sex" | "age" | "all";

export const getCohortKey = (strategy: CohortStrategy, ageBucket: string, sex: string): string => {
  if (strategy === "age_sex") {
    return `age_sex:${ageBucket}:${sex}`;
  }

  if (strategy === "age") {
    return `age:${ageBucket}`;
  }

  return "all";
};

export const getCohortFallbackOrder = (ageBucket: string, sex: string): string[] => [
  getCohortKey("age_sex", ageBucket, sex),
  getCohortKey("age", ageBucket, sex),
  getCohortKey("all", ageBucket, sex),
];
