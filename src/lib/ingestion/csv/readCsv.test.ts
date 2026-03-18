import assert from "node:assert/strict";
import test from "node:test";

import { readCsv } from "./readCsv.ts";

test("parses a valid csv with bom safely", () => {
  const csv = "\uFEFFcycle start time,cycle timezone\n2026-03-01T00:00:00Z,UTC\n";
  const parsed = readCsv(csv);

  assert.deepEqual(parsed.headers, ["cycle start time", "cycle timezone"]);
  assert.equal(parsed.rows.length, 1);
});

test("rejects csv input with binary content", () => {
  assert.throws(
    () => readCsv("cycle start time,cycle timezone\u0000\n2026-03-01T00:00:00Z,UTC\n"),
    /binary content/i,
  );
});

test("rejects csv input with unexpectedly long cell values", () => {
  const oversized = "a".repeat(10_001);

  assert.throws(
    () => readCsv(`cycle start time,cycle timezone\n${oversized},UTC\n`),
    /unexpectedly long cell value/i,
  );
});
