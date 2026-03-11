import { buildHeaderMap, getMappedValue } from "@/lib/ingestion/csv/headerMap";
import { normalizeBoolean } from "@/lib/ingestion/normalization/normalizeBoolean";
import { normalizeInteger, normalizeNumber } from "@/lib/ingestion/normalization/normalizeNumber";
import { normalizeTimestamp } from "@/lib/ingestion/normalization/normalizeTimestamp";
import { normalizeTimezone } from "@/lib/ingestion/normalization/normalizeTimezone";
import { validateRowShape } from "@/lib/ingestion/validation/validateRowShape";
import { validateValue } from "@/lib/ingestion/validation/validateValue";
import type { CsvRow, IngestionErrorItem, ParsedSleep } from "@/lib/ingestion/types";

const optionalNumber = (
  rowNumber: number,
  field: string,
  raw: string | null,
  errors: IngestionErrorItem[],
): number | null => {
  const parsed = normalizeNumber(raw);
  const validation = validateValue.number(rowNumber, field, raw, parsed, false);
  if (!validation.ok) {
    errors.push(validation.error);
    return null;
  }
  return validation.value;
};

const optionalInteger = (
  rowNumber: number,
  field: string,
  raw: string | null,
  errors: IngestionErrorItem[],
): number | null => {
  const parsed = normalizeInteger(raw);
  const validation = validateValue.number(rowNumber, field, raw, parsed, false);
  if (!validation.ok) {
    errors.push(validation.error);
    return null;
  }
  return validation.value === null ? null : Math.round(validation.value);
};

export const parseSleepsRow = (
  headers: string[],
  row: CsvRow,
  rowNumber: number,
): { parsed: ParsedSleep | null; errors: IngestionErrorItem[] } => {
  const map = buildHeaderMap(headers, "sleeps");
  const errors: IngestionErrorItem[] = [];

  const cycleTimezone = normalizeTimezone(getMappedValue(row, map, "cycle timezone"));
  const cycleStartRaw = getMappedValue(row, map, "cycle start time");
  const cycleStartAt = normalizeTimestamp(cycleStartRaw, cycleTimezone);
  const cycleEndAt = normalizeTimestamp(getMappedValue(row, map, "cycle end time"), cycleTimezone);
  const sleepOnsetRaw = getMappedValue(row, map, "sleep onset");
  const wakeOnsetRaw = getMappedValue(row, map, "wake onset");
  const sleepOnsetAt = normalizeTimestamp(sleepOnsetRaw, cycleTimezone);
  const wakeOnsetAt = normalizeTimestamp(wakeOnsetRaw, cycleTimezone);
  const napRaw = getMappedValue(row, map, "nap");
  const napNormalized = normalizeBoolean(napRaw);

  const sleepOnsetValidation = validateValue.timestamp(
    rowNumber,
    "sleep onset",
    sleepOnsetRaw,
    sleepOnsetAt,
    true,
  );
  if (!sleepOnsetValidation.ok) errors.push(sleepOnsetValidation.error);

  const wakeOnsetValidation = validateValue.timestamp(
    rowNumber,
    "wake onset",
    wakeOnsetRaw,
    wakeOnsetAt,
    true,
  );
  if (!wakeOnsetValidation.ok) errors.push(wakeOnsetValidation.error);

  const napValidation = validateValue.boolean(rowNumber, "nap", napRaw, napNormalized, true);
  if (!napValidation.ok) errors.push(napValidation.error);

  errors.push(
    ...validateRowShape(rowNumber, [
      { key: "cycle start time", value: cycleStartAt },
      { key: "cycle timezone", value: cycleTimezone },
      { key: "sleep onset", value: sleepOnsetAt },
      { key: "wake onset", value: wakeOnsetAt },
      { key: "nap", value: napNormalized },
    ]),
  );

  if (errors.length > 0 || !cycleStartAt || !sleepOnsetAt || !wakeOnsetAt || napNormalized === null) {
    return { parsed: null, errors };
  }

  return {
    parsed: {
      cycleStartAt,
      cycleEndAt,
      cycleTimezone,
      sleepOnsetAt,
      wakeOnsetAt,
      nap: napNormalized,
      sleepPerformancePercent: optionalNumber(rowNumber, "sleep performance %", getMappedValue(row, map, "sleep performance %"), errors),
      respiratoryRateRpm: optionalNumber(rowNumber, "respiratory rate (rpm)", getMappedValue(row, map, "respiratory rate (rpm)"), errors),
      asleepDurationMin: optionalInteger(rowNumber, "asleep duration (min)", getMappedValue(row, map, "asleep duration (min)"), errors),
      inBedDurationMin: optionalInteger(rowNumber, "in bed duration (min)", getMappedValue(row, map, "in bed duration (min)"), errors),
      lightSleepDurationMin: optionalInteger(rowNumber, "light sleep duration (min)", getMappedValue(row, map, "light sleep duration (min)"), errors),
      deepSleepDurationMin: optionalInteger(rowNumber, "deep (sws) duration (min)", getMappedValue(row, map, "deep (sws) duration (min)"), errors),
      remDurationMin: optionalInteger(rowNumber, "rem duration (min)", getMappedValue(row, map, "rem duration (min)"), errors),
      awakeDurationMin: optionalInteger(rowNumber, "awake duration (min)", getMappedValue(row, map, "awake duration (min)"), errors),
      sleepNeedMin: optionalInteger(rowNumber, "sleep need (min)", getMappedValue(row, map, "sleep need (min)"), errors),
      sleepDebtMin: optionalInteger(rowNumber, "sleep debt (min)", getMappedValue(row, map, "sleep debt (min)"), errors),
      sleepEfficiencyPercent: optionalNumber(rowNumber, "sleep efficiency %", getMappedValue(row, map, "sleep efficiency %"), errors),
      sleepConsistencyPercent: optionalNumber(rowNumber, "sleep consistency %", getMappedValue(row, map, "sleep consistency %"), errors),
    },
    errors,
  };
};
