import assert from "node:assert/strict";
import test from "node:test";

import { validateHeaders } from "./validateHeaders.ts";

test("accepts known workout header aliases", () => {
  const errors = validateHeaders(
    ["cycle_start_time", "timezone", "workout start", "workout end", "activity"],
    "workouts",
  );

  assert.deepEqual(errors, []);
});

test("reports missing required headers", () => {
  const errors = validateHeaders(["cycle start time", "workout start time"], "workouts");

  assert.equal(errors.length, 3);
  assert.deepEqual(
    errors.map((error) => error.columnName),
    ["cycle timezone", "workout end time", "activity name"],
  );
});
