import { buildHeaderMap, getMappedValue } from "@/lib/ingestion/csv/headerMap";
import { normalizeBoolean } from "@/lib/ingestion/normalization/normalizeBoolean";
import { normalizeText } from "@/lib/ingestion/normalization/normalizeText";
import { normalizeTimestamp } from "@/lib/ingestion/normalization/normalizeTimestamp";
import { normalizeTimezone } from "@/lib/ingestion/normalization/normalizeTimezone";
import { validateRowShape } from "@/lib/ingestion/validation/validateRowShape";
import { validateValue } from "@/lib/ingestion/validation/validateValue";
import type { CsvRow, IngestionErrorItem, ParsedJournalEntry } from "@/lib/ingestion/types";

const optionalBoolean = (
  rowNumber: number,
  field: string,
  raw: string | null,
  errors: IngestionErrorItem[],
): boolean | null => {
  const parsed = normalizeBoolean(raw);
  const validation = validateValue.boolean(rowNumber, field, raw, parsed, false);
  if (!validation.ok) {
    errors.push(validation.error);
    return null;
  }
  return validation.value;
};

export const parseJournalEntriesRow = (
  headers: string[],
  row: CsvRow,
  rowNumber: number,
): { parsed: ParsedJournalEntry | null; errors: IngestionErrorItem[] } => {
  const map = buildHeaderMap(headers, "journal_entries");
  const errors: IngestionErrorItem[] = [];

  const cycleTimezone = normalizeTimezone(getMappedValue(row, map, "cycle timezone"));
  const cycleStartRaw = getMappedValue(row, map, "cycle start time");
  const cycleStartAt = normalizeTimestamp(cycleStartRaw, cycleTimezone);
  const cycleEndAt = normalizeTimestamp(getMappedValue(row, map, "cycle end time"), cycleTimezone);
  const questionText = normalizeText(getMappedValue(row, map, "question text"));

  errors.push(
    ...validateRowShape(rowNumber, [
      { key: "cycle start time", value: cycleStartAt },
      { key: "cycle timezone", value: cycleTimezone },
      { key: "question text", value: questionText },
    ]),
  );

  if (!cycleStartAt || !cycleTimezone || !questionText || errors.length > 0) {
    return { parsed: null, errors };
  }

  return {
    parsed: {
      cycleStartAt,
      cycleEndAt,
      cycleTimezone,
      questionText,
      answeredYes: optionalBoolean(rowNumber, "answered yes", getMappedValue(row, map, "answered yes"), errors),
      notes: normalizeText(getMappedValue(row, map, "notes")),
    },
    errors,
  };
};
