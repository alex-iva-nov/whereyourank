import { buildHeaderMap, getMappedValue } from "@/lib/ingestion/csv/headerMap";
import { normalizeBoolean } from "@/lib/ingestion/normalization/normalizeBoolean";
import { normalizeNumber } from "@/lib/ingestion/normalization/normalizeNumber";
import { normalizeText } from "@/lib/ingestion/normalization/normalizeText";
import { normalizeTimestamp } from "@/lib/ingestion/normalization/normalizeTimestamp";
import { normalizeTimezone } from "@/lib/ingestion/normalization/normalizeTimezone";
import { validateRowShape } from "@/lib/ingestion/validation/validateRowShape";
import { validateValue } from "@/lib/ingestion/validation/validateValue";
import type { CsvRow, IngestionErrorItem, ParsedWorkout } from "@/lib/ingestion/types";

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

export const parseWorkoutsRow = (
  headers: string[],
  row: CsvRow,
  rowNumber: number,
): { parsed: ParsedWorkout | null; errors: IngestionErrorItem[] } => {
  const map = buildHeaderMap(headers, "workouts");
  const errors: IngestionErrorItem[] = [];

  const cycleTimezone = normalizeTimezone(getMappedValue(row, map, "cycle timezone"));
  const cycleStartRaw = getMappedValue(row, map, "cycle start time");
  const cycleStartAt = normalizeTimestamp(cycleStartRaw, cycleTimezone);
  const cycleEndAt = normalizeTimestamp(getMappedValue(row, map, "cycle end time"), cycleTimezone);

  const startRaw = getMappedValue(row, map, "workout start time");
  const endRaw = getMappedValue(row, map, "workout end time");
  const workoutStartAt = normalizeTimestamp(startRaw, cycleTimezone);
  const workoutEndAt = normalizeTimestamp(endRaw, cycleTimezone);
  const activityName = normalizeText(getMappedValue(row, map, "activity name"));

  const startValidation = validateValue.timestamp(
    rowNumber,
    "workout start time",
    startRaw,
    workoutStartAt,
    true,
  );
  if (!startValidation.ok) errors.push(startValidation.error);

  const endValidation = validateValue.timestamp(rowNumber, "workout end time", endRaw, workoutEndAt, true);
  if (!endValidation.ok) errors.push(endValidation.error);

  errors.push(
    ...validateRowShape(rowNumber, [
      { key: "cycle start time", value: cycleStartAt },
      { key: "cycle timezone", value: cycleTimezone },
      { key: "workout start time", value: workoutStartAt },
      { key: "workout end time", value: workoutEndAt },
      { key: "activity name", value: activityName },
    ]),
  );

  if (!cycleStartAt || !workoutStartAt || !workoutEndAt || !activityName || errors.length > 0) {
    return { parsed: null, errors };
  }

  return {
    parsed: {
      cycleStartAt,
      cycleEndAt,
      cycleTimezone,
      workoutStartAt,
      workoutEndAt,
      durationMin: optionalNumber(rowNumber, "duration (min)", getMappedValue(row, map, "duration (min)"), errors),
      activityName,
      activityStrain: optionalNumber(rowNumber, "activity strain", getMappedValue(row, map, "activity strain"), errors),
      energyBurnedCal: optionalNumber(rowNumber, "energy burned (cal)", getMappedValue(row, map, "energy burned (cal)"), errors),
      maxHeartRateBpm: optionalNumber(rowNumber, "max hr (bpm)", getMappedValue(row, map, "max hr (bpm)"), errors),
      averageHeartRateBpm: optionalNumber(rowNumber, "average hr (bpm)", getMappedValue(row, map, "average hr (bpm)"), errors),
      hrZone1Percent: optionalNumber(rowNumber, "hr zone 1 %", getMappedValue(row, map, "hr zone 1 %"), errors),
      hrZone2Percent: optionalNumber(rowNumber, "hr zone 2 %", getMappedValue(row, map, "hr zone 2 %"), errors),
      hrZone3Percent: optionalNumber(rowNumber, "hr zone 3 %", getMappedValue(row, map, "hr zone 3 %"), errors),
      hrZone4Percent: optionalNumber(rowNumber, "hr zone 4 %", getMappedValue(row, map, "hr zone 4 %"), errors),
      hrZone5Percent: optionalNumber(rowNumber, "hr zone 5 %", getMappedValue(row, map, "hr zone 5 %"), errors),
      gpsEnabled: optionalBoolean(rowNumber, "gps enabled", getMappedValue(row, map, "gps enabled"), errors),
    },
    errors,
  };
};
