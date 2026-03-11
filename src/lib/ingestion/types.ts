import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/database.types";
import type { WhoopFileKind } from "@/lib/ingestion/kinds";
export type { WhoopFileKind } from "@/lib/ingestion/kinds";

export type DbClient = SupabaseClient<Database>;

export type CsvRow = Record<string, string | null | undefined>;

export type CsvData = {
  delimiter: ";" | ",";
  headers: string[];
  rows: CsvRow[];
};

export type NormalizedUploadInput = {
  userId: string;
  filename: string;
  mimeType: string;
  bytes: Buffer;
  text: string;
  storagePath: string;
};

export type IngestionErrorCode =
  | "missing_required_header"
  | "unknown_file_kind"
  | "invalid_timestamp"
  | "invalid_number"
  | "invalid_boolean"
  | "missing_required_field"
  | "duplicate_in_batch"
  | "db_upsert_failed"
  | "invalid_row_shape";

export type IngestionErrorItem = {
  code: IngestionErrorCode;
  message: string;
  rowNumber: number | null;
  columnName?: string | null;
  rawContext?: Record<string, unknown> | null;
};

export type ValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: IngestionErrorItem };

export type DetectionResult = {
  fileKind: WhoopFileKind | null;
  confidence: "signature" | "unknown";
  reasons: string[];
};

export type ParsedCommon = {
  cycleStartAt: string;
  cycleEndAt: string | null;
  cycleTimezone: string | null;
};

export type ParsedPhysiologicalCycle = ParsedCommon & {
  recoveryScore: number | null;
  restingHeartRateBpm: number | null;
  heartRateVariabilityMs: number | null;
  skinTempCelsius: number | null;
  bloodOxygenPercent: number | null;
  dayStrain: number | null;
  energyBurnedCal: number | null;
  maxHeartRateBpm: number | null;
  averageHeartRateBpm: number | null;
  sleepOnsetAt: string | null;
  wakeOnsetAt: string | null;
  sleepPerformancePercent: number | null;
  respiratoryRateRpm: number | null;
  asleepDurationMin: number | null;
  inBedDurationMin: number | null;
  lightSleepDurationMin: number | null;
  deepSleepDurationMin: number | null;
  remDurationMin: number | null;
  awakeDurationMin: number | null;
  sleepNeedMin: number | null;
  sleepDebtMin: number | null;
  sleepEfficiencyPercent: number | null;
  sleepConsistencyPercent: number | null;
};

export type ParsedSleep = ParsedCommon & {
  sleepOnsetAt: string;
  wakeOnsetAt: string;
  sleepPerformancePercent: number | null;
  respiratoryRateRpm: number | null;
  asleepDurationMin: number | null;
  inBedDurationMin: number | null;
  lightSleepDurationMin: number | null;
  deepSleepDurationMin: number | null;
  remDurationMin: number | null;
  awakeDurationMin: number | null;
  sleepNeedMin: number | null;
  sleepDebtMin: number | null;
  sleepEfficiencyPercent: number | null;
  sleepConsistencyPercent: number | null;
  nap: boolean;
};

export type ParsedWorkout = ParsedCommon & {
  workoutStartAt: string;
  workoutEndAt: string;
  durationMin: number | null;
  activityName: string;
  activityStrain: number | null;
  energyBurnedCal: number | null;
  maxHeartRateBpm: number | null;
  averageHeartRateBpm: number | null;
  hrZone1Percent: number | null;
  hrZone2Percent: number | null;
  hrZone3Percent: number | null;
  hrZone4Percent: number | null;
  hrZone5Percent: number | null;
  gpsEnabled: boolean | null;
};

export type ParsedJournalEntry = ParsedCommon & {
  questionText: string;
  answeredYes: boolean | null;
  notes: string | null;
};

export type FactRecordBase = {
  user_id: string;
  upload_id: string;
  natural_key: string;
  row_hash: string;
  source_row_number: number;
};

export type CycleFactRecord = FactRecordBase & {
  cycle_start_at: string;
  cycle_end_at: string | null;
  cycle_timezone: string | null;
  recovery_score: number | null;
  resting_heart_rate_bpm: number | null;
  hrv_ms: number | null;
  skin_temp_celsius: number | null;
  blood_oxygen_percent: number | null;
  day_strain: number | null;
  energy_burned_cal: number | null;
  max_hr_bpm: number | null;
  avg_hr_bpm: number | null;
  sleep_onset_at: string | null;
  wake_onset_at: string | null;
  sleep_performance_percent: number | null;
  respiratory_rate_rpm: number | null;
  asleep_duration_min: number | null;
  in_bed_duration_min: number | null;
  light_sleep_duration_min: number | null;
  deep_sleep_duration_min: number | null;
  rem_sleep_duration_min: number | null;
  awake_duration_min: number | null;
  sleep_need_min: number | null;
  sleep_debt_min: number | null;
  sleep_efficiency_percent: number | null;
  sleep_consistency_percent: number | null;
};

export type SleepFactRecord = FactRecordBase & {
  cycle_start_at: string;
  cycle_end_at: string | null;
  cycle_timezone: string | null;
  sleep_onset_at: string;
  wake_onset_at: string;
  nap: boolean;
  sleep_performance_percent: number | null;
  respiratory_rate_rpm: number | null;
  asleep_duration_min: number | null;
  in_bed_duration_min: number | null;
  light_sleep_duration_min: number | null;
  deep_sleep_duration_min: number | null;
  rem_sleep_duration_min: number | null;
  awake_duration_min: number | null;
  sleep_need_min: number | null;
  sleep_debt_min: number | null;
  sleep_efficiency_percent: number | null;
  sleep_consistency_percent: number | null;
};

export type WorkoutFactRecord = FactRecordBase & {
  cycle_start_at: string;
  cycle_end_at: string | null;
  cycle_timezone: string | null;
  workout_start_at: string;
  workout_end_at: string;
  duration_min: number | null;
  activity_name: string;
  activity_strain: number | null;
  energy_burned_cal: number | null;
  max_hr_bpm: number | null;
  avg_hr_bpm: number | null;
  hr_zone_1_percent: number | null;
  hr_zone_2_percent: number | null;
  hr_zone_3_percent: number | null;
  hr_zone_4_percent: number | null;
  hr_zone_5_percent: number | null;
  gps_enabled: boolean | null;
};

export type JournalFactRecord = FactRecordBase & {
  cycle_start_at: string;
  cycle_end_at: string | null;
  cycle_timezone: string | null;
  question_text: string;
  answered_yes: boolean | null;
  notes: string | null;
};

export type FactRecord =
  | CycleFactRecord
  | SleepFactRecord
  | WorkoutFactRecord
  | JournalFactRecord;

export type UploadRecord = {
  id: string;
  user_id: string;
  storage_path: string;
  original_filename: string;
};

export type IngestionRunRecord = {
  id: string;
};

export type IngestionTelemetry = {
  ingestionRunId: string;
  userId: string;
  uploadId: string;
  fileKind: WhoopFileKind;
  parserVersion: string;
  rowsTotal: number;
  rowsParsed: number;
  rowsInserted: number;
  rowsUpdated: number;
  rowsFailed: number;
  durationMs: number;
  errorRate: number;
};

export type IngestionFileResult = {
  filename: string;
  uploadId: string;
  ingestionRunId: string;
  fileKind: WhoopFileKind | null;
  status: "completed" | "failed";
  telemetry: IngestionTelemetry | null;
  errors: IngestionErrorItem[];
};

export type IngestionBatchResult = {
  status: "completed" | "partial" | "failed";
  uploadedFiles: number;
  failedFiles: number;
  fileResults: IngestionFileResult[];
};


