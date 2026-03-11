import { buildHeaderMap, getMappedValue } from "@/lib/ingestion/csv/headerMap";
import { normalizeInteger, normalizeNumber } from "@/lib/ingestion/normalization/normalizeNumber";
import { normalizeTimestamp } from "@/lib/ingestion/normalization/normalizeTimestamp";
import { normalizeTimezone } from "@/lib/ingestion/normalization/normalizeTimezone";
import { validateRowShape } from "@/lib/ingestion/validation/validateRowShape";
import { validateValue } from "@/lib/ingestion/validation/validateValue";
import type { CsvRow, IngestionErrorItem, ParsedPhysiologicalCycle } from "@/lib/ingestion/types";

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

export const parsePhysiologicalCyclesRow = (
  headers: string[],
  row: CsvRow,
  rowNumber: number,
): { parsed: ParsedPhysiologicalCycle | null; errors: IngestionErrorItem[] } => {
  const map = buildHeaderMap(headers, "physiological_cycles");
  const errors: IngestionErrorItem[] = [];

  const cycleTimezone = normalizeTimezone(getMappedValue(row, map, "cycle timezone"));
  const cycleStartRaw = getMappedValue(row, map, "cycle start time");
  const cycleStartAt = normalizeTimestamp(cycleStartRaw, cycleTimezone);
  const cycleEndAt = normalizeTimestamp(getMappedValue(row, map, "cycle end time"), cycleTimezone);

  const cycleStartValidation = validateValue.timestamp(
    rowNumber,
    "cycle start time",
    cycleStartRaw,
    cycleStartAt,
    true,
  );
  if (!cycleStartValidation.ok) errors.push(cycleStartValidation.error);

  errors.push(
    ...validateRowShape(rowNumber, [
      { key: "cycle start time", value: cycleStartAt },
      { key: "cycle timezone", value: cycleTimezone },
    ]),
  );

  if (errors.length > 0 || !cycleStartAt) {
    return { parsed: null, errors };
  }

  return {
    parsed: {
      cycleStartAt,
      cycleEndAt,
      cycleTimezone,
      recoveryScore: optionalNumber(rowNumber, "recovery score %", getMappedValue(row, map, "recovery score %"), errors),
      restingHeartRateBpm: optionalNumber(rowNumber, "resting heart rate (bpm)", getMappedValue(row, map, "resting heart rate (bpm)"), errors),
      heartRateVariabilityMs: optionalNumber(rowNumber, "heart rate variability (ms)", getMappedValue(row, map, "heart rate variability (ms)"), errors),
      skinTempCelsius: optionalNumber(rowNumber, "skin temp (celsius)", getMappedValue(row, map, "skin temp (celsius)"), errors),
      bloodOxygenPercent: optionalNumber(rowNumber, "blood oxygen %", getMappedValue(row, map, "blood oxygen %"), errors),
      dayStrain: optionalNumber(rowNumber, "day strain", getMappedValue(row, map, "day strain"), errors),
      energyBurnedCal: optionalNumber(rowNumber, "energy burned (cal)", getMappedValue(row, map, "energy burned (cal)"), errors),
      maxHeartRateBpm: optionalNumber(rowNumber, "max hr (bpm)", getMappedValue(row, map, "max hr (bpm)"), errors),
      averageHeartRateBpm: optionalNumber(rowNumber, "average hr (bpm)", getMappedValue(row, map, "average hr (bpm)"), errors),
      sleepOnsetAt: normalizeTimestamp(getMappedValue(row, map, "sleep onset"), cycleTimezone),
      wakeOnsetAt: normalizeTimestamp(getMappedValue(row, map, "wake onset"), cycleTimezone),
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
