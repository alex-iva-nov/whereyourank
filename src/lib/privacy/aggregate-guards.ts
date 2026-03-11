// NOTE: Keep this threshold conservative and review with counsel/privacy advisor before scaling.
export const MIN_AGGREGATE_COHORT_SIZE = 50;

export const isAggregateCohortEligible = (
  sampleSize: number,
  minCohortSize: number = MIN_AGGREGATE_COHORT_SIZE,
): boolean => sampleSize >= minCohortSize;
