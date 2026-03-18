import assert from "node:assert/strict";
import test from "node:test";

import { createDeleteUserDataForMvp } from "./delete-data-core.ts";

const FIXED_NOW = "2026-03-18T12:00:00.000Z";

type TableMockState = {
  rows?: unknown[];
  insertResult?: unknown;
  insertError?: { message: string } | null;
  updateError?: { message: string } | null;
  deleteError?: { message: string } | null;
};

const createDbMock = (options?: {
  tables?: Record<string, TableMockState>;
  storagePages?: Array<Array<{ id?: string; name: string }>>;
  storageListError?: { message: string } | null;
  storageRemoveError?: { message: string } | null;
}) => {
  const operations: Array<{ table: string; action: string; payload?: unknown }> = [];
  const removeCalls: string[][] = [];
  let storagePageIndex = 0;
  const tables = options?.tables ?? {};

  const api = {
    operations,
    removeCalls,
    storage: {
      from() {
        return {
          list: async () => {
            if (options?.storageListError) {
              return { data: null, error: options.storageListError };
            }

            const page = options?.storagePages?.[storagePageIndex] ?? [];
            storagePageIndex += 1;
            return { data: page, error: null };
          },
          remove: async (files: string[]) => {
            removeCalls.push(files);
            return { error: options?.storageRemoveError ?? null };
          },
        };
      },
    },
    from(table: string) {
      const state = tables[table] ?? {};
      return {
        insert(payload: unknown) {
          operations.push({ table, action: "insert", payload });
          return {
            select() {
              return {
                single: async () => ({
                  data: state.insertResult ?? null,
                  error: state.insertError ?? null,
                }),
              };
            },
          };
        },
        select() {
          return {
            eq: async (_column: string, _value: unknown) => ({
              data: state.rows ?? [],
              error: state.deleteError ?? null,
            }),
            in: async (_column: string, _values: unknown[]) => ({
              data: state.rows ?? [],
              error: state.deleteError ?? null,
            }),
            single: async () => ({
              data: (state.rows ?? [])[0] ?? null,
              error: state.deleteError ?? null,
            }),
          };
        },
        delete() {
          operations.push({ table, action: "delete" });
          return {
            eq: async (_column: string, _value: unknown) => ({
              error: state.deleteError ?? null,
            }),
            in: async (_column: string, _values: unknown[]) => ({
              error: state.deleteError ?? null,
            }),
          };
        },
        update(payload: unknown) {
          operations.push({ table, action: "update", payload });
          return {
            eq(_column: string, _value: unknown) {
              return {
                eq: async () => ({
                  error: state.updateError ?? null,
                }),
              };
            },
          };
        },
      };
    },
  };

  return api;
};

test("deleteUserDataForMvp completes and invalidates affected cohort windows", async () => {
  const db = createDbMock({
    tables: {
      deletion_requests: {
        insertResult: { id: "del-1" },
      },
      user_metric_30d_aggregates: {
        rows: [{ window_end_date: "2026-03-15" }, { window_end_date: "2026-03-15" }, { window_end_date: "2026-03-16" }],
      },
      upload_files: {
        rows: [{ id: "upload-file-1" }],
      },
      parse_jobs: {
        rows: [{ id: "parse-job-1" }],
      },
    },
    storagePages: [[{ id: "1", name: "raw-a.csv" }], []],
  });

  const deleteUserDataForMvp = createDeleteUserDataForMvp({
    db: db as never,
    storageBucketRaw: "whoop-raw-uploads",
    now: () => FIXED_NOW,
  });

  const result = await deleteUserDataForMvp("user-1");

  assert.deepEqual(result, { deletionRequestId: "del-1", status: "completed" });
  assert.deepEqual(db.removeCalls, [["user-1/raw-a.csv"]]);

  const cohortDelete = db.operations.find(
    (operation) => operation.table === "cohort_metric_percentiles" && operation.action === "delete",
  );
  assert.ok(cohortDelete);

  const completedUpdate = db.operations.find(
    (operation) =>
      operation.table === "deletion_requests" &&
      operation.action === "update" &&
      (operation.payload as { status?: string }).status === "completed",
  );
  assert.ok(completedUpdate);
});

test("deleteUserDataForMvp marks deletion failed when cohort invalidation fails", async () => {
  const db = createDbMock({
    tables: {
      deletion_requests: {
        insertResult: { id: "del-2" },
      },
      user_metric_30d_aggregates: {
        rows: [{ window_end_date: "2026-03-15" }],
      },
      cohort_metric_percentiles: {
        deleteError: { message: "delete denied" },
      },
    },
    storagePages: [[]],
  });

  const deleteUserDataForMvp = createDeleteUserDataForMvp({
    db: db as never,
    storageBucketRaw: "whoop-raw-uploads",
    now: () => FIXED_NOW,
  });

  await assert.rejects(() => deleteUserDataForMvp("user-2"), /invalidate cohort percentile snapshots/i);

  const failedUpdate = db.operations.find(
    (operation) =>
      operation.table === "deletion_requests" &&
      operation.action === "update" &&
      (operation.payload as { status?: string }).status === "failed",
  );
  assert.ok(failedUpdate);
});
