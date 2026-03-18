export const HOW_YOU_COMPARE_SO_FAR_MIN_SAMPLE_SIZE = 3;
export const HOW_YOU_COMPARE_SO_FAR_USER_COUNT_SWITCH_THRESHOLD = 100;

export const getHowYouCompareSoFarMinSampleSize = (): number => {
  // Product decision for the current three-card section:
  // keep rendering cohort comparisons at min_n = 3 until we revisit the policy
  // after the dataset grows beyond the first 100 users.
  return HOW_YOU_COMPARE_SO_FAR_MIN_SAMPLE_SIZE;
};
