import { hashRowObject } from "@/lib/ingestion/fingerprints/fingerprint";
import { naturalKeys } from "@/lib/ingestion/fingerprints/naturalKeys";
import type { ParsedSleep, SleepFactRecord } from "@/lib/ingestion/types";

export const toSleepFact = (
  userId: string,
  uploadId: string,
  rowNumber: number,
  parsed: ParsedSleep,
): SleepFactRecord => {
  const naturalKey = naturalKeys.sleeps(
    userId,
    parsed.sleepOnsetAt,
    parsed.wakeOnsetAt,
    parsed.nap,
  );

  const payload = {
    cycle_start_at: parsed.cycleStartAt,
    cycle_end_at: parsed.cycleEndAt,
    cycle_timezone: parsed.cycleTimezone,
    sleep_onset_at: parsed.sleepOnsetAt,
    wake_onset_at: parsed.wakeOnsetAt,
    nap: parsed.nap,
    sleep_performance_percent: parsed.sleepPerformancePercent,
    respiratory_rate_rpm: parsed.respiratoryRateRpm,
    asleep_duration_min: parsed.asleepDurationMin,
    in_bed_duration_min: parsed.inBedDurationMin,
    light_sleep_duration_min: parsed.lightSleepDurationMin,
    deep_sleep_duration_min: parsed.deepSleepDurationMin,
    rem_sleep_duration_min: parsed.remDurationMin,
    awake_duration_min: parsed.awakeDurationMin,
    sleep_need_min: parsed.sleepNeedMin,
    sleep_debt_min: parsed.sleepDebtMin,
    sleep_efficiency_percent: parsed.sleepEfficiencyPercent,
    sleep_consistency_percent: parsed.sleepConsistencyPercent,
  };

  return {
    user_id: userId,
    upload_id: uploadId,
    natural_key: naturalKey,
    row_hash: hashRowObject(payload),
    source_row_number: rowNumber,
    ...payload,
  };
};
