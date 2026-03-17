import assert from "node:assert/strict";
import test from "node:test";

import { upsertFacts } from "./upsertFacts.ts";

type FactRow = {
  user_id: string;
  upload_id: string;
  natural_key: string;
  row_hash: string;
  source_row_number: number;
  cycle_start_at: string;
  cycle_end_at: string | null;
  cycle_timezone: string | null;
  sleep_onset_at: string;
  wake_onset_at: string;
  nap: boolean;
  sleep_performance_percent: number | null;
  respiratory_rate_rpm: number | null;
  asleep_duration_min: number | null;
  in_bed_duration_min: number | null;
  light_sleep_duration_min: number | null;
  deep_sleep_duration_min: number | null;
  rem_sleep_duration_min: number | null;
  awake_duration_min: number | null;
  sleep_need_min: number | null;
  sleep_debt_min: number | null;
  sleep_efficiency_percent: number | null;
  sleep_consistency_percent: number | null;
};

const makeSleepFact = (naturalKey: string, rowHash: string): FactRow => ({
  user_id: "user-1",
  upload_id: "upload-1",
  natural_key: naturalKey,
  row_hash: rowHash,
  source_row_number: 2,
  cycle_start_at: "2026-03-01T00:00:00.000Z",
  cycle_end_at: null,
  cycle_timezone: "UTC",
  sleep_onset_at: "2026-03-01T22:00:00.000Z",
  wake_onset_at: "2026-03-02T06:00:00.000Z",
  nap: false,
  sleep_performance_percent: 90,
  respiratory_rate_rpm: null,
  asleep_duration_min: 480,
  in_bed_duration_min: 500,
  light_sleep_duration_min: 200,
  deep_sleep_duration_min: 100,
  rem_sleep_duration_min: 80,
  awake_duration_min: 20,
  sleep_need_min: 450,
  sleep_debt_min: 0,
  sleep_efficiency_percent: 96,
  sleep_consistency_percent: 88,
});

const createDbMock = (options?: {
  existingRows?: Array<{ id: string; natural_key: string; row_hash: string }>;
  insertError?: string;
  updateErrorForKey?: string;
}) => {
  const inserted: FactRow[] = [];
  const updated: Array<{ natural_key: string }> = [];

  return {
    inserted,
    updated,
    from() {
      return {
        select() {
          return {
            eq() {
              return {
                in: async () => ({
                  data: options?.existingRows ?? [],
                  error: null,
                }),
              };
            },
          };
        },
        insert(rows: FactRow[]) {
          inserted.push(...rows);
          return {
            select: async () => ({
              data: options?.insertError ? null : rows.map((row, index) => ({ id: `${row.natural_key}-${index}` })),
              error: options?.insertError ? { message: options.insertError } : null,
            }),
          };
        },
        update(payload: FactRow & { updated_at: string }) {
          return {
            eq() {
              return {
                eq: async (_column: string, value: string) => {
                  updated.push({ natural_key: payload.natural_key });

                  if (options?.updateErrorForKey && options.updateErrorForKey === value) {
                    return { error: { message: "update failed" } };
                  }

                  return { error: null };
                },
              };
            },
          };
        },
      };
    },
  };
};

test("tracks inserted, updated, and skipped rows", async () => {
  const db = createDbMock({
    existingRows: [
      { id: "1", natural_key: "sleep-1", row_hash: "same-hash" },
      { id: "2", natural_key: "sleep-2", row_hash: "old-hash" },
    ],
  });

  const summary = await upsertFacts(
    db as never,
    "whoop_sleep_facts",
    "user-1",
    [
      makeSleepFact("sleep-1", "same-hash"),
      makeSleepFact("sleep-2", "new-hash"),
      makeSleepFact("sleep-3", "fresh-hash"),
    ] as never,
  );

  assert.deepEqual(summary, { inserted: 1, updated: 1, skipped: 1 });
  assert.equal(db.inserted.length, 1);
  assert.equal(db.updated.length, 1);
  assert.equal(db.updated[0]?.natural_key, "sleep-2");
});

test("surfaces update failures", async () => {
  const db = createDbMock({
    existingRows: [{ id: "2", natural_key: "sleep-2", row_hash: "old-hash" }],
    updateErrorForKey: "sleep-2",
  });

  await assert.rejects(
    upsertFacts(
      db as never,
      "whoop_sleep_facts",
      "user-1",
      [makeSleepFact("sleep-2", "new-hash")] as never,
    ),
    /Failed to update fact/,
  );
});
