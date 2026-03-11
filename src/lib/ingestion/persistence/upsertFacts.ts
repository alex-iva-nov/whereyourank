import type { DbClient, FactRecord } from "@/lib/ingestion/types";

type UpsertSummary = {
  inserted: number;
  updated: number;
  skipped: number;
};

const chunk = <T>(items: T[], size: number): T[][] => {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size));
  }
  return out;
};

export const upsertFacts = async (
  db: DbClient,
  tableName: "whoop_cycle_facts" | "whoop_sleep_facts" | "whoop_workout_facts" | "whoop_journal_facts",
  userId: string,
  rows: FactRecord[],
): Promise<UpsertSummary> => {
  if (rows.length === 0) {
    return { inserted: 0, updated: 0, skipped: 0 };
  }

  let inserted = 0;
  let updated = 0;
  let skipped = 0;

  for (const rowChunk of chunk(rows, 100)) {
    const naturalKeys = rowChunk.map((row) => row.natural_key);

    const { data: existingRows, error: existingError } = await db
      .from(tableName)
      .select("id,natural_key,row_hash")
      .eq("user_id", userId)
      .in("natural_key", naturalKeys);

    if (existingError) {
      throw new Error(`Failed to query existing facts for ${tableName}: ${existingError.message}`);
    }

    const existingByNaturalKey = new Map<string, { id: string; row_hash: string }>();
    for (const existing of (existingRows ?? []) as Array<{ id: string; natural_key: string; row_hash: string }>) {
      existingByNaturalKey.set(existing.natural_key, existing);
    }

    const toInsert: FactRecord[] = [];
    const toUpdate: FactRecord[] = [];

    for (const row of rowChunk) {
      const existing = existingByNaturalKey.get(row.natural_key);
      if (!existing) {
        toInsert.push(row);
        continue;
      }

      if (existing.row_hash === row.row_hash) {
        skipped += 1;
        continue;
      }

      toUpdate.push(row);
    }

    if (toInsert.length > 0) {
      const { error: insertError, data: insertedRows } = await db.from(tableName).insert(toInsert).select("id");
      if (insertError) {
        throw new Error(`Failed to insert facts for ${tableName}: ${insertError.message}`);
      }
      inserted += ((insertedRows ?? []) as Array<{ id: string }>).length;
    }

    for (const row of toUpdate) {
      const { error: updateError } = await db
        .from(tableName)
        .update({ ...row, updated_at: new Date().toISOString() })
        .eq("user_id", userId)
        .eq("natural_key", row.natural_key);

      if (updateError) {
        throw new Error(`Failed to update fact for ${tableName}: ${updateError.message}`);
      }

      updated += 1;
    }
  }

  return { inserted, updated, skipped };
};
