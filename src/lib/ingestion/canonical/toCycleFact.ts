import { hashRowObject } from "@/lib/ingestion/fingerprints/fingerprint";
import { naturalKeys } from "@/lib/ingestion/fingerprints/naturalKeys";
import type { CycleFactRecord, ParsedPhysiologicalCycle } from "@/lib/ingestion/types";

export const toCycleFact = (
  userId: string,
  uploadId: string,
  rowNumber: number,
  parsed: ParsedPhysiologicalCycle,
): CycleFactRecord => {
  const naturalKey = naturalKeys.physiologicalCycles(userId, parsed.cycleStartAt);

  const payload = {
    cycle_start_at: parsed.cycleStartAt,
    cycle_end_at: parsed.cycleEndAt,
    cycle_timezone: parsed.cycleTimezone,
    recovery_score: parsed.recoveryScore,
    resting_heart_rate_bpm: parsed.restingHeartRateBpm,
    hrv_ms: parsed.heartRateVariabilityMs,
    skin_temp_celsius: parsed.skinTempCelsius,
    blood_oxygen_percent: parsed.bloodOxygenPercent,
    day_strain: parsed.dayStrain,
    energy_burned_cal: parsed.energyBurnedCal,
    max_hr_bpm: parsed.maxHeartRateBpm,
    avg_hr_bpm: parsed.averageHeartRateBpm,
    sleep_onset_at: parsed.sleepOnsetAt,
    wake_onset_at: parsed.wakeOnsetAt,
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
