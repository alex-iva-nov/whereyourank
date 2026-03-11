import type { DbClient, FactRecord, WhoopFileKind } from "@/lib/ingestion/types";
import { upsertFacts } from "@/lib/ingestion/persistence/upsertFacts";

export const persistRows = async (
  db: DbClient,
  fileKind: WhoopFileKind,
  userId: string,
  rows: FactRecord[],
) => {
  const table =
    fileKind === "physiological_cycles"
      ? "whoop_cycle_facts"
      : fileKind === "sleeps"
        ? "whoop_sleep_facts"
        : fileKind === "workouts"
          ? "whoop_workout_facts"
          : "whoop_journal_facts";

  return upsertFacts(db, table, userId, rows);
};
