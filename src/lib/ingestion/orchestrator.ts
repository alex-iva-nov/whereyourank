import { toCycleFact } from "@/lib/ingestion/canonical/toCycleFact";
import { toJournalFact } from "@/lib/ingestion/canonical/toJournalFact";
import { toSleepFact } from "@/lib/ingestion/canonical/toSleepFact";
import { toWorkoutFact } from "@/lib/ingestion/canonical/toWorkoutFact";
import { rowIterator } from "@/lib/ingestion/csv/rowIterator";
import { detectFileKind } from "@/lib/ingestion/detection/detectFileKind";
import { parseJournalEntriesRow } from "@/lib/ingestion/parsers/journalEntriesParser";
import { parsePhysiologicalCyclesRow } from "@/lib/ingestion/parsers/physiologicalCyclesParser";
import { parseSleepsRow } from "@/lib/ingestion/parsers/sleepsParser";
import { parseWorkoutsRow } from "@/lib/ingestion/parsers/workoutsParser";
import { persistErrors } from "@/lib/ingestion/persistence/persistErrors";
import { persistRows } from "@/lib/ingestion/persistence/persistRows";
import { computeDurationMs, computeErrorRate } from "@/lib/ingestion/telemetry/metrics";
import type {
  CsvData,
  DbClient,
  FactRecord,
  IngestionErrorItem,
  IngestionFileResult,
  IngestionRunRecord,
  IngestionTelemetry,
  UploadRecord,
  WhoopFileKind,
} from "@/lib/ingestion/types";
import { validateHeaders } from "@/lib/ingestion/validation/validateHeaders";

const createIngestionRun = async (
  db: DbClient,
  input: {
    uploadId: string;
    userId: string;
    parserVersion: string;
    fileKind: WhoopFileKind;
  },
): Promise<IngestionRunRecord> => {
  const { data, error } = await db
    .from("ingestion_runs")
    .insert({
      upload_id: input.uploadId,
      user_id: input.userId,
      parser_version: input.parserVersion,
      file_kind: input.fileKind,
      status: "queued",
      started_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error || !data?.id) {
    throw new Error(`Failed to create ingestion run: ${error?.message ?? "unknown"}`);
  }

  return data as IngestionRunRecord;
};

const updateIngestionRun = async (
  db: DbClient,
  runId: string,
  payload: {
    status: "processing" | "completed" | "failed";
    rowsTotal: number;
    rowsParsed: number;
    rowsInserted: number;
    rowsUpdated: number;
    rowsFailed: number;
    durationMs: number;
    errorRate: number;
  },
): Promise<void> => {
  const { error } = await db
    .from("ingestion_runs")
    .update({
      status: payload.status,
      rows_total: payload.rowsTotal,
      rows_parsed: payload.rowsParsed,
      rows_inserted: payload.rowsInserted,
      rows_updated: payload.rowsUpdated,
      rows_failed: payload.rowsFailed,
      duration_ms: payload.durationMs,
      error_rate: payload.errorRate,
      finished_at:
        payload.status === "completed" || payload.status === "failed"
          ? new Date().toISOString()
          : null,
    })
    .eq("id", runId);

  if (error) {
    throw new Error(`Failed to update ingestion run: ${error.message}`);
  }
};

const parseRowToFact = (
  fileKind: WhoopFileKind,
  headers: string[],
  row: Record<string, string | null | undefined>,
  rowNumber: number,
  userId: string,
  uploadId: string,
): { fact: FactRecord | null; errors: IngestionErrorItem[] } => {
  if (fileKind === "physiological_cycles") {
    const parsed = parsePhysiologicalCyclesRow(headers, row, rowNumber);
    if (!parsed.parsed) return { fact: null, errors: parsed.errors };
    return { fact: toCycleFact(userId, uploadId, rowNumber, parsed.parsed), errors: parsed.errors };
  }

  if (fileKind === "sleeps") {
    const parsed = parseSleepsRow(headers, row, rowNumber);
    if (!parsed.parsed) return { fact: null, errors: parsed.errors };
    return { fact: toSleepFact(userId, uploadId, rowNumber, parsed.parsed), errors: parsed.errors };
  }

  if (fileKind === "workouts") {
    const parsed = parseWorkoutsRow(headers, row, rowNumber);
    if (!parsed.parsed) return { fact: null, errors: parsed.errors };
    return { fact: toWorkoutFact(userId, uploadId, rowNumber, parsed.parsed), errors: parsed.errors };
  }

  const parsed = parseJournalEntriesRow(headers, row, rowNumber);
  if (!parsed.parsed) return { fact: null, errors: parsed.errors };
  return { fact: toJournalFact(userId, uploadId, rowNumber, parsed.parsed), errors: parsed.errors };
};

export const runIngestionForUpload = async (
  db: DbClient,
  input: {
    userId: string;
    upload: UploadRecord;
    csv: CsvData;
    parserVersion: string;
  },
): Promise<IngestionFileResult> => {
  const startedAt = Date.now();
  const errors: IngestionErrorItem[] = [];

  const detection = detectFileKind(input.csv.headers);
  const fileKind = detection.fileKind;

  if (!fileKind) {
    return {
      filename: input.upload.original_filename,
      uploadId: input.upload.id,
      ingestionRunId: "",
      fileKind: null,
      status: "failed",
      telemetry: null,
      errors: [
        {
          code: "unknown_file_kind",
          message: detection.reasons.join("; "),
          rowNumber: null,
        },
      ],
    };
  }

  const headerErrors = validateHeaders(input.csv.headers, fileKind);
  errors.push(...headerErrors);

  const run = await createIngestionRun(db, {
    uploadId: input.upload.id,
    userId: input.userId,
    parserVersion: input.parserVersion,
    fileKind,
  });

  await updateIngestionRun(db, run.id, {
    status: "processing",
    rowsTotal: input.csv.rows.length,
    rowsParsed: 0,
    rowsInserted: 0,
    rowsUpdated: 0,
    rowsFailed: 0,
    durationMs: 0,
    errorRate: 0,
  });

  try {
    if (headerErrors.length > 0) {
      await persistErrors(db, {
        ingestionRunId: run.id,
        uploadId: input.upload.id,
        userId: input.userId,
        fileKind,
        errors: headerErrors,
      });

      const durationMs = computeDurationMs(startedAt);
      await updateIngestionRun(db, run.id, {
        status: "failed",
        rowsTotal: input.csv.rows.length,
        rowsParsed: 0,
        rowsInserted: 0,
        rowsUpdated: 0,
        rowsFailed: headerErrors.length,
        durationMs,
        errorRate: computeErrorRate(input.csv.rows.length, headerErrors.length),
      });

      return {
        filename: input.upload.original_filename,
        uploadId: input.upload.id,
        ingestionRunId: run.id,
        fileKind,
        status: "failed",
        telemetry: {
          ingestionRunId: run.id,
          userId: input.userId,
          uploadId: input.upload.id,
          fileKind,
          parserVersion: input.parserVersion,
          rowsTotal: input.csv.rows.length,
          rowsParsed: 0,
          rowsInserted: 0,
          rowsUpdated: 0,
          rowsFailed: headerErrors.length,
          durationMs,
          errorRate: computeErrorRate(input.csv.rows.length, headerErrors.length),
        },
        errors,
      };
    }

    const facts: FactRecord[] = [];
    const seenNaturalKeys = new Set<string>();
    let rowsParsed = 0;

    for (const item of rowIterator(input.csv.rows, 2)) {
      const parsed = parseRowToFact(
        fileKind,
        input.csv.headers,
        item.row,
        item.rowNumber,
        input.userId,
        input.upload.id,
      );

      if (parsed.errors.length > 0) {
        errors.push(...parsed.errors);
        continue;
      }

      if (!parsed.fact) {
        errors.push({
          code: "invalid_row_shape",
          message: "Row could not be parsed into canonical shape",
          rowNumber: item.rowNumber,
        });
        continue;
      }

      if (seenNaturalKeys.has(parsed.fact.natural_key)) {
        errors.push({
          code: "duplicate_in_batch",
          message: "Duplicate natural key in the same upload file",
          rowNumber: item.rowNumber,
        });
        continue;
      }

      seenNaturalKeys.add(parsed.fact.natural_key);
      facts.push(parsed.fact);
      rowsParsed += 1;
    }

    let rowsInserted = 0;
    let rowsUpdated = 0;

    try {
      const upsertResult = await persistRows(db, fileKind, input.userId, facts);
      rowsInserted = upsertResult.inserted;
      rowsUpdated = upsertResult.updated;
    } catch (error) {
      errors.push({
        code: "db_upsert_failed",
        message: error instanceof Error ? error.message : "Unknown upsert failure",
        rowNumber: null,
      });
    }

    if (errors.length > 0) {
      await persistErrors(db, {
        ingestionRunId: run.id,
        uploadId: input.upload.id,
        userId: input.userId,
        fileKind,
        errors,
      });
    }

    const rowsFailed = errors.length;
    const durationMs = computeDurationMs(startedAt);
    const status = errors.some((error) => error.code === "db_upsert_failed") ? "failed" : "completed";

    const telemetry: IngestionTelemetry = {
      ingestionRunId: run.id,
      userId: input.userId,
      uploadId: input.upload.id,
      fileKind,
      parserVersion: input.parserVersion,
      rowsTotal: input.csv.rows.length,
      rowsParsed,
      rowsInserted,
      rowsUpdated,
      rowsFailed,
      durationMs,
      errorRate: computeErrorRate(input.csv.rows.length, rowsFailed),
    };

    await updateIngestionRun(db, run.id, {
      status,
      rowsTotal: telemetry.rowsTotal,
      rowsParsed: telemetry.rowsParsed,
      rowsInserted: telemetry.rowsInserted,
      rowsUpdated: telemetry.rowsUpdated,
      rowsFailed: telemetry.rowsFailed,
      durationMs: telemetry.durationMs,
      errorRate: telemetry.errorRate,
    });

    return {
      filename: input.upload.original_filename,
      uploadId: input.upload.id,
      ingestionRunId: run.id,
      fileKind,
      status,
      telemetry,
      errors,
    };
  } catch (error) {
    const fallbackError: IngestionErrorItem = {
      code: "db_upsert_failed",
      message: error instanceof Error ? error.message : "Unhandled ingestion error",
      rowNumber: null,
    };

    errors.push(fallbackError);

    await persistErrors(db, {
      ingestionRunId: run.id,
      uploadId: input.upload.id,
      userId: input.userId,
      fileKind,
      errors: [fallbackError],
    });

    const durationMs = computeDurationMs(startedAt);

    await updateIngestionRun(db, run.id, {
      status: "failed",
      rowsTotal: input.csv.rows.length,
      rowsParsed: 0,
      rowsInserted: 0,
      rowsUpdated: 0,
      rowsFailed: 1,
      durationMs,
      errorRate: computeErrorRate(input.csv.rows.length, 1),
    });

    return {
      filename: input.upload.original_filename,
      uploadId: input.upload.id,
      ingestionRunId: run.id,
      fileKind,
      status: "failed",
      telemetry: {
        ingestionRunId: run.id,
        userId: input.userId,
        uploadId: input.upload.id,
        fileKind,
        parserVersion: input.parserVersion,
        rowsTotal: input.csv.rows.length,
        rowsParsed: 0,
        rowsInserted: 0,
        rowsUpdated: 0,
        rowsFailed: 1,
        durationMs,
        errorRate: computeErrorRate(input.csv.rows.length, 1),
      },
      errors,
    };
  }
};
