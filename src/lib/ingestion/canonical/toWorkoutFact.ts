import { hashRowObject } from "@/lib/ingestion/fingerprints/fingerprint";
import { naturalKeys } from "@/lib/ingestion/fingerprints/naturalKeys";
import type { ParsedWorkout, WorkoutFactRecord } from "@/lib/ingestion/types";

export const toWorkoutFact = (
  userId: string,
  uploadId: string,
  rowNumber: number,
  parsed: ParsedWorkout,
): WorkoutFactRecord => {
  const naturalKey = naturalKeys.workouts(
    userId,
    parsed.workoutStartAt,
    parsed.workoutEndAt,
    parsed.activityName,
  );

  const payload = {
    cycle_start_at: parsed.cycleStartAt,
    cycle_end_at: parsed.cycleEndAt,
    cycle_timezone: parsed.cycleTimezone,
    workout_start_at: parsed.workoutStartAt,
    workout_end_at: parsed.workoutEndAt,
    duration_min: parsed.durationMin,
    activity_name: parsed.activityName,
    activity_strain: parsed.activityStrain,
    energy_burned_cal: parsed.energyBurnedCal,
    max_hr_bpm: parsed.maxHeartRateBpm,
    avg_hr_bpm: parsed.averageHeartRateBpm,
    hr_zone_1_percent: parsed.hrZone1Percent,
    hr_zone_2_percent: parsed.hrZone2Percent,
    hr_zone_3_percent: parsed.hrZone3Percent,
    hr_zone_4_percent: parsed.hrZone4Percent,
    hr_zone_5_percent: parsed.hrZone5Percent,
    gps_enabled: parsed.gpsEnabled,
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
