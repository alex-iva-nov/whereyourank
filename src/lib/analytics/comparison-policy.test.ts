import assert from "node:assert/strict";
import test from "node:test";

import {
  HOW_YOU_COMPARE_SO_FAR_MIN_SAMPLE_SIZE,
  HOW_YOU_COMPARE_SO_FAR_USER_COUNT_SWITCH_THRESHOLD,
  getHowYouCompareSoFarMinSampleSize,
} from "./comparison-policy.ts";

test("keeps current how-you-compare policy at min_n 3", () => {
  assert.equal(HOW_YOU_COMPARE_SO_FAR_MIN_SAMPLE_SIZE, 3);
  assert.equal(getHowYouCompareSoFarMinSampleSize(), 3);
});

test("documents the future policy switch threshold", () => {
  assert.equal(HOW_YOU_COMPARE_SO_FAR_USER_COUNT_SWITCH_THRESHOLD, 100);
});
