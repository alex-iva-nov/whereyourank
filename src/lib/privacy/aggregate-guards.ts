// NOTE: This is the default guard for general cohort benchmark output.
// Product-specific surfaces may use a different server-side policy where explicitly documented.
export const MIN_AGGREGATE_COHORT_SIZE = 50;

export const isAggregateCohortEligible = (
  sampleSize: number,
  minCohortSize: number = MIN_AGGREGATE_COHORT_SIZE,
): boolean => sampleSize >= minCohortSize;
