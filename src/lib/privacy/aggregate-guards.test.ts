import assert from "node:assert/strict";
import test from "node:test";

import { MIN_AGGREGATE_COHORT_SIZE, isAggregateCohortEligible } from "./aggregate-guards.ts";

test("aggregate guard blocks small cohorts", () => {
  assert.equal(isAggregateCohortEligible(MIN_AGGREGATE_COHORT_SIZE - 1), false);
});

test("aggregate guard allows cohorts at threshold", () => {
  assert.equal(isAggregateCohortEligible(MIN_AGGREGATE_COHORT_SIZE), true);
});


