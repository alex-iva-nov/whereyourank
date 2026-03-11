-- WHOOP Benchmarking MVP initial schema
-- Generated from docs/engineering/data-model.md

create extension if not exists pgcrypto;

create or replace function public.set_current_timestamp_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.normalize_metric_key(value text)
returns text
language sql
immutable
returns null on null input
as $$
  select trim(both '_' from regexp_replace(lower(trim(value)), '[^a-z0-9]+', '_', 'g'));
$$;

create or replace function public.apply_metric_key_normalization()
returns trigger
language plpgsql
as $$
begin
  if new.metric_key is not null then
    new.metric_key = public.normalize_metric_key(new.metric_key);
  end if;
  return new;
end;
$$;

create or replace function public.apply_country_code_normalization()
returns trigger
language plpgsql
as $$
begin
  if new.country is not null then
    new.country = upper(trim(new.country));
  end if;
  return new;
end;
$$;

create or replace function public.apply_sha256_normalization()
returns trigger
language plpgsql
as $$
begin
  if new.sha256 is not null then
    new.sha256 = lower(trim(new.sha256));
  end if;
  return new;
end;
$$;

create table if not exists public.user_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  age_bucket text not null,
  sex text not null,
  country text not null,
  first_dashboard_feedback_prompt_seen_at timestamptz null,
  first_dashboard_feedback_dismissed_at timestamptz null,
  first_dashboard_feedback_submitted_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_profiles_age_bucket_check check (age_bucket in ('13_18', '18_24', '25_29', '30_34', '35_39', '40_44', '45_49', '50_54', '55_59', '60_64', '65_69', '70_74', '75_79', '80_plus', '25_34', '35_44', '45_54', '55_plus')),
  constraint user_profiles_sex_check check (sex in ('female', 'male', 'other', 'prefer_not_to_say')),
  constraint user_profiles_country_check check (country ~ '^[A-Z]{2}$')
);

create trigger trg_user_profiles_country_normalize
before insert or update on public.user_profiles
for each row
execute function public.apply_country_code_normalization();

create trigger trg_user_profiles_updated_at
before update on public.user_profiles
for each row
execute function public.set_current_timestamp_updated_at();

create table if not exists public.consent_events (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  consent_type text not null,
  consent_version text not null,
  accepted boolean not null,
  created_at timestamptz not null default now(),
  constraint consent_events_type_check check (consent_type in ('terms', 'privacy', 'benchmark_aggregation'))
);

create index if not exists idx_consent_events_user_created_at
  on public.consent_events (user_id, created_at desc);

create table if not exists public.user_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  submitted_at timestamptz not null default now(),
  context text not null default 'first_dashboard',
  sentiment text not null,
  message text null,
  dashboard_seen_at timestamptz null,
  upload_completed_at timestamptz null,
  created_at timestamptz not null default now(),
  constraint user_feedback_sentiment_check check (sentiment in ('loved_it', 'confusing', 'missing_something')),
  constraint user_feedback_context_unique unique (user_id, context)
);

create index if not exists idx_user_feedback_context_submitted_at
  on public.user_feedback (context, submitted_at desc);

create index if not exists idx_user_feedback_user_submitted_at
  on public.user_feedback (user_id, submitted_at desc);

create table if not exists public.upload_batches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null,
  uploaded_at timestamptz not null default now(),
  completed_at timestamptz null,
  constraint upload_batches_status_check check (status in ('pending', 'processing', 'completed', 'failed', 'partial'))
);

create index if not exists idx_upload_batches_user_uploaded_at
  on public.upload_batches (user_id, uploaded_at desc);

create table if not exists public.upload_files (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.upload_batches(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  file_kind text not null,
  storage_path text not null,
  original_filename text not null,
  sha256 text not null,
  file_size_bytes bigint not null,
  uploaded_at timestamptz not null default now(),
  constraint upload_files_kind_check check (file_kind in ('physiological_cycles', 'sleeps', 'workouts', 'journal_entries')),
  constraint upload_files_sha256_check check (sha256 ~ '^[a-f0-9]{64}$'),
  constraint upload_files_file_size_nonnegative_check check (file_size_bytes >= 0),
  constraint upload_files_user_sha_kind_unique unique (user_id, sha256, file_kind)
);

create index if not exists idx_upload_files_batch_id
  on public.upload_files (batch_id);

create index if not exists idx_upload_files_user_uploaded_at
  on public.upload_files (user_id, uploaded_at desc);

create index if not exists idx_upload_files_user_kind_uploaded_at
  on public.upload_files (user_id, file_kind, uploaded_at desc);

create trigger trg_upload_files_sha256_normalize
before insert or update on public.upload_files
for each row
execute function public.apply_sha256_normalization();

create table if not exists public.parse_jobs (
  id uuid primary key default gen_random_uuid(),
  upload_file_id uuid not null references public.upload_files(id) on delete cascade,
  job_type text not null default 'parse_normalize',
  status text not null,
  parser_version text not null,
  started_at timestamptz null,
  finished_at timestamptz null,
  rows_read int not null default 0,
  rows_inserted int not null default 0,
  rows_rejected int not null default 0,
  error_summary text null,
  constraint parse_jobs_status_check check (status in ('queued', 'running', 'completed', 'failed')),
  constraint parse_jobs_rows_nonnegative_check check (rows_read >= 0 and rows_inserted >= 0 and rows_rejected >= 0)
);

create index if not exists idx_parse_jobs_upload_file
  on public.parse_jobs (upload_file_id);

create index if not exists idx_parse_jobs_status
  on public.parse_jobs (status);

create table if not exists public.parse_errors (
  id bigserial primary key,
  parse_job_id uuid not null references public.parse_jobs(id) on delete cascade,
  row_number int null,
  column_name text null,
  error_code text not null,
  error_message text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_parse_errors_parse_job
  on public.parse_errors (parse_job_id);

create table if not exists public.whoop_physiological_cycles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  upload_file_id uuid not null references public.upload_files(id) on delete cascade,
  source_row_hash text not null,
  cycle_date date not null,
  recovery_score numeric(5,2),
  resting_heart_rate_bpm numeric(5,2),
  hrv_ms numeric(7,2),
  blood_oxygen_percent numeric(5,2),
  skin_temp_c_delta numeric(5,2),
  created_at timestamptz not null default now(),
  constraint whoop_physiological_cycles_unique unique (user_id, cycle_date, source_row_hash)
);

create index if not exists idx_whoop_cycles_user_date
  on public.whoop_physiological_cycles (user_id, cycle_date desc);

create table if not exists public.whoop_sleeps (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  upload_file_id uuid not null references public.upload_files(id) on delete cascade,
  source_row_hash text not null,
  sleep_id text null,
  sleep_start_at timestamptz not null,
  sleep_end_at timestamptz not null,
  sleep_performance_percent numeric(5,2),
  sleep_duration_min int,
  sleep_efficiency_percent numeric(5,2),
  sleep_consistency_percent numeric(5,2),
  sleep_debt_min int,
  light_sleep_min int,
  deep_sleep_min int,
  rem_sleep_min int,
  created_at timestamptz not null default now()
);

create index if not exists idx_whoop_sleeps_user_start
  on public.whoop_sleeps (user_id, sleep_start_at desc);

create table if not exists public.whoop_workouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  upload_file_id uuid not null references public.upload_files(id) on delete cascade,
  source_row_hash text not null,
  workout_id text null,
  workout_start_at timestamptz not null,
  workout_end_at timestamptz null,
  activity_name text,
  workout_duration_min int,
  strain_score numeric(6,2),
  energy_burned_kcal int,
  avg_heart_rate_bpm numeric(5,2),
  max_heart_rate_bpm numeric(5,2),
  zone_1_min int,
  zone_2_min int,
  zone_3_min int,
  zone_4_min int,
  zone_5_min int,
  created_at timestamptz not null default now()
);

create index if not exists idx_whoop_workouts_user_start
  on public.whoop_workouts (user_id, workout_start_at desc);

create table if not exists public.whoop_journal_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  upload_file_id uuid not null references public.upload_files(id) on delete cascade,
  source_row_hash text not null,
  entry_date date not null,
  question_key text not null,
  answer_bool boolean null,
  answer_text text null,
  created_at timestamptz not null default now(),
  constraint whoop_journal_entries_unique unique (user_id, entry_date, question_key, source_row_hash)
);

create index if not exists idx_whoop_journal_entries_user_date
  on public.whoop_journal_entries (user_id, entry_date desc);

create table if not exists public.user_metric_daily (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  metric_date date not null,
  metric_key text not null,
  metric_value numeric not null,
  source_priority text not null,
  created_at timestamptz not null default now(),
  constraint user_metric_daily_source_priority_check check (source_priority in ('cycle', 'sleep', 'workout', 'derived')),
  constraint user_metric_daily_metric_key_normalized_check check (
    metric_key = public.normalize_metric_key(metric_key) and metric_key <> ''
  ),
  constraint user_metric_daily_unique unique (user_id, metric_date, metric_key)
);

create trigger trg_user_metric_daily_metric_key_normalize
before insert or update on public.user_metric_daily
for each row
execute function public.apply_metric_key_normalization();

create index if not exists idx_user_metric_daily_metric_date
  on public.user_metric_daily (metric_key, metric_date);

create index if not exists idx_user_metric_daily_user_metric_date
  on public.user_metric_daily (user_id, metric_key, metric_date desc);

create index if not exists idx_user_metric_daily_user_date
  on public.user_metric_daily (user_id, metric_date desc);

create table if not exists public.user_metric_rollups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  metric_key text not null,
  window_key text not null,
  value_mean numeric null,
  value_median numeric null,
  value_stddev numeric null,
  value_count int not null,
  computed_at timestamptz not null default now(),
  constraint user_metric_rollups_metric_key_normalized_check check (
    metric_key = public.normalize_metric_key(metric_key) and metric_key <> ''
  ),
  constraint user_metric_rollups_window_check check (window_key in ('last_7d', 'last_30d', 'last_90d', 'lifetime')),
  constraint user_metric_rollups_value_count_nonnegative check (value_count >= 0),
  constraint user_metric_rollups_unique unique (user_id, metric_key, window_key)
);

create trigger trg_user_metric_rollups_metric_key_normalize
before insert or update on public.user_metric_rollups
for each row
execute function public.apply_metric_key_normalization();

create index if not exists idx_user_metric_rollups_user_computed
  on public.user_metric_rollups (user_id, computed_at desc);

create table if not exists public.cohort_metric_distributions (
  id uuid primary key default gen_random_uuid(),
  cohort_key text not null,
  metric_key text not null,
  window_key text not null,
  sample_size int not null,
  mean numeric not null,
  median numeric not null,
  p10 numeric not null,
  p25 numeric not null,
  p50 numeric not null,
  p75 numeric not null,
  p90 numeric not null,
  computed_at timestamptz not null default now(),
  constraint cohort_metric_distributions_metric_key_normalized_check check (
    metric_key = public.normalize_metric_key(metric_key) and metric_key <> ''
  ),
  constraint cohort_metric_distributions_window_check check (window_key in ('last_7d', 'last_30d', 'last_90d', 'lifetime')),
  constraint cohort_metric_distributions_sample_size_positive check (sample_size > 0),
  constraint cohort_metric_distributions_unique unique (cohort_key, metric_key, window_key, computed_at)
);

create trigger trg_cohort_metric_distributions_metric_key_normalize
before insert or update on public.cohort_metric_distributions
for each row
execute function public.apply_metric_key_normalization();

create index if not exists idx_cohort_metric_distributions_lookup
  on public.cohort_metric_distributions (cohort_key, metric_key, window_key, computed_at desc);

create index if not exists idx_cohort_metric_distributions_metric_lookup
  on public.cohort_metric_distributions (metric_key, cohort_key, computed_at desc);

create table if not exists public.user_metric_percentiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  metric_key text not null,
  window_key text not null,
  user_value numeric not null,
  cohort_key_used text not null,
  sample_size_used int not null,
  percentile numeric(5,2) not null,
  rank_label text not null,
  computed_at timestamptz not null default now(),
  constraint user_metric_percentiles_metric_key_normalized_check check (
    metric_key = public.normalize_metric_key(metric_key) and metric_key <> ''
  ),
  constraint user_metric_percentiles_window_check check (window_key in ('last_7d', 'last_30d', 'last_90d', 'lifetime')),
  constraint user_metric_percentiles_sample_size_positive check (sample_size_used > 0),
  constraint user_metric_percentiles_rank_label_check check (rank_label in ('low', 'below_avg', 'avg', 'above_avg', 'high')),
  constraint user_metric_percentiles_percentile_range check (percentile >= 0 and percentile <= 100),
  constraint user_metric_percentiles_unique unique (user_id, metric_key, window_key)
);

create trigger trg_user_metric_percentiles_metric_key_normalize
before insert or update on public.user_metric_percentiles
for each row
execute function public.apply_metric_key_normalization();

create index if not exists idx_user_metric_percentiles_user_computed
  on public.user_metric_percentiles (user_id, computed_at desc);

create table if not exists public.deletion_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null,
  requested_at timestamptz not null default now(),
  processed_at timestamptz null,
  failure_reason text null,
  constraint deletion_requests_status_check check (status in ('requested', 'processing', 'completed', 'failed'))
);

create index if not exists idx_deletion_requests_user_requested
  on public.deletion_requests (user_id, requested_at desc);








-- Ingestion v1 tables

-- Production-shaped v1 ingestion tables for WHOOP CSV pipeline

create table if not exists public.uploads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  storage_path text not null,
  original_filename text not null,
  file_size_bytes bigint not null,
  sha256 text not null,
  upload_status text not null default 'uploaded',
  detected_file_kind text null,
  created_at timestamptz not null default now(),
  processed_at timestamptz null,
  constraint uploads_size_nonnegative_check check (file_size_bytes >= 0),
  constraint uploads_sha256_check check (sha256 ~ '^[a-f0-9]{64}$'),
  constraint uploads_status_check check (upload_status in ('uploaded', 'processing', 'completed', 'failed')),
  constraint uploads_kind_check check (detected_file_kind is null or detected_file_kind in ('physiological_cycles', 'sleeps', 'workouts', 'journal_entries')),
  constraint uploads_user_sha_unique unique (user_id, sha256)
);

create trigger trg_uploads_sha256_normalize
before insert or update on public.uploads
for each row
execute function public.apply_sha256_normalization();

create index if not exists idx_uploads_user_created_at
  on public.uploads (user_id, created_at desc);

create index if not exists idx_uploads_user_status_created_at
  on public.uploads (user_id, upload_status, created_at desc);

create table if not exists public.ingestion_runs (
  id uuid primary key default gen_random_uuid(),
  upload_id uuid not null references public.uploads(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  file_kind text not null,
  parser_version text not null,
  status text not null,
  rows_total int not null default 0,
  rows_parsed int not null default 0,
  rows_inserted int not null default 0,
  rows_updated int not null default 0,
  rows_failed int not null default 0,
  duration_ms int not null default 0,
  error_rate numeric(6,4) not null default 0,
  started_at timestamptz null,
  finished_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ingestion_runs_kind_check check (file_kind in ('physiological_cycles', 'sleeps', 'workouts', 'journal_entries')),
  constraint ingestion_runs_status_check check (status in ('queued', 'processing', 'completed', 'failed')),
  constraint ingestion_runs_counters_nonnegative_check check (
    rows_total >= 0 and rows_parsed >= 0 and rows_inserted >= 0 and rows_updated >= 0 and rows_failed >= 0 and duration_ms >= 0
  ),
  constraint ingestion_runs_error_rate_range_check check (error_rate >= 0 and error_rate <= 1)
);

create trigger trg_ingestion_runs_updated_at
before update on public.ingestion_runs
for each row
execute function public.set_current_timestamp_updated_at();

create index if not exists idx_ingestion_runs_upload_id
  on public.ingestion_runs (upload_id);

create index if not exists idx_ingestion_runs_user_created_at
  on public.ingestion_runs (user_id, created_at desc);

create index if not exists idx_ingestion_runs_user_kind_created_at
  on public.ingestion_runs (user_id, file_kind, created_at desc);

create index if not exists idx_ingestion_runs_status_created_at
  on public.ingestion_runs (status, created_at desc);

create table if not exists public.ingestion_errors (
  id bigserial primary key,
  ingestion_run_id uuid not null references public.ingestion_runs(id) on delete cascade,
  upload_id uuid not null references public.uploads(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  file_kind text null,
  row_number int null,
  error_code text not null,
  error_message text not null,
  raw_context jsonb null,
  created_at timestamptz not null default now(),
  constraint ingestion_errors_kind_check check (
    file_kind is null or file_kind in ('physiological_cycles', 'sleeps', 'workouts', 'journal_entries')
  )
);

create index if not exists idx_ingestion_errors_run_id
  on public.ingestion_errors (ingestion_run_id);

create index if not exists idx_ingestion_errors_upload_id
  on public.ingestion_errors (upload_id);

create index if not exists idx_ingestion_errors_user_created_at
  on public.ingestion_errors (user_id, created_at desc);

create table if not exists public.whoop_cycle_facts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  upload_id uuid not null references public.uploads(id) on delete cascade,
  natural_key text not null,
  row_hash text not null,
  source_row_number int null,
  cycle_start_at timestamptz not null,
  cycle_end_at timestamptz null,
  cycle_timezone text null,
  recovery_score numeric(5,2) null,
  resting_heart_rate_bpm numeric(6,2) null,
  hrv_ms numeric(8,2) null,
  skin_temp_celsius numeric(6,2) null,
  blood_oxygen_percent numeric(5,2) null,
  day_strain numeric(6,2) null,
  energy_burned_cal numeric(10,2) null,
  max_hr_bpm numeric(6,2) null,
  avg_hr_bpm numeric(6,2) null,
  sleep_onset_at timestamptz null,
  wake_onset_at timestamptz null,
  sleep_performance_percent numeric(5,2) null,
  respiratory_rate_rpm numeric(6,2) null,
  asleep_duration_min int null,
  in_bed_duration_min int null,
  light_sleep_duration_min int null,
  deep_sleep_duration_min int null,
  rem_sleep_duration_min int null,
  awake_duration_min int null,
  sleep_need_min int null,
  sleep_debt_min int null,
  sleep_efficiency_percent numeric(5,2) null,
  sleep_consistency_percent numeric(5,2) null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint whoop_cycle_facts_user_natural_key_unique unique (user_id, natural_key)
);

create trigger trg_whoop_cycle_facts_updated_at
before update on public.whoop_cycle_facts
for each row
execute function public.set_current_timestamp_updated_at();

create index if not exists idx_whoop_cycle_facts_user_cycle_start
  on public.whoop_cycle_facts (user_id, cycle_start_at desc);

create table if not exists public.whoop_sleep_facts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  upload_id uuid not null references public.uploads(id) on delete cascade,
  natural_key text not null,
  row_hash text not null,
  source_row_number int null,
  cycle_start_at timestamptz not null,
  cycle_end_at timestamptz null,
  cycle_timezone text null,
  sleep_onset_at timestamptz not null,
  wake_onset_at timestamptz not null,
  nap boolean not null,
  sleep_performance_percent numeric(5,2) null,
  respiratory_rate_rpm numeric(6,2) null,
  asleep_duration_min int null,
  in_bed_duration_min int null,
  light_sleep_duration_min int null,
  deep_sleep_duration_min int null,
  rem_sleep_duration_min int null,
  awake_duration_min int null,
  sleep_need_min int null,
  sleep_debt_min int null,
  sleep_efficiency_percent numeric(5,2) null,
  sleep_consistency_percent numeric(5,2) null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint whoop_sleep_facts_user_natural_key_unique unique (user_id, natural_key)
);

create trigger trg_whoop_sleep_facts_updated_at
before update on public.whoop_sleep_facts
for each row
execute function public.set_current_timestamp_updated_at();

create index if not exists idx_whoop_sleep_facts_user_sleep_onset
  on public.whoop_sleep_facts (user_id, sleep_onset_at desc);

create table if not exists public.whoop_workout_facts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  upload_id uuid not null references public.uploads(id) on delete cascade,
  natural_key text not null,
  row_hash text not null,
  source_row_number int null,
  cycle_start_at timestamptz not null,
  cycle_end_at timestamptz null,
  cycle_timezone text null,
  workout_start_at timestamptz not null,
  workout_end_at timestamptz not null,
  duration_min numeric(10,2) null,
  activity_name text not null,
  activity_strain numeric(6,2) null,
  energy_burned_cal numeric(10,2) null,
  max_hr_bpm numeric(6,2) null,
  avg_hr_bpm numeric(6,2) null,
  hr_zone_1_percent numeric(5,2) null,
  hr_zone_2_percent numeric(5,2) null,
  hr_zone_3_percent numeric(5,2) null,
  hr_zone_4_percent numeric(5,2) null,
  hr_zone_5_percent numeric(5,2) null,
  gps_enabled boolean null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint whoop_workout_facts_user_natural_key_unique unique (user_id, natural_key)
);

create trigger trg_whoop_workout_facts_updated_at
before update on public.whoop_workout_facts
for each row
execute function public.set_current_timestamp_updated_at();

create index if not exists idx_whoop_workout_facts_user_workout_start
  on public.whoop_workout_facts (user_id, workout_start_at desc);

create table if not exists public.whoop_journal_facts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  upload_id uuid not null references public.uploads(id) on delete cascade,
  natural_key text not null,
  row_hash text not null,
  source_row_number int null,
  cycle_start_at timestamptz not null,
  cycle_end_at timestamptz null,
  cycle_timezone text null,
  question_text text not null,
  answered_yes boolean null,
  notes text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint whoop_journal_facts_user_natural_key_unique unique (user_id, natural_key)
);

create trigger trg_whoop_journal_facts_updated_at
before update on public.whoop_journal_facts
for each row
execute function public.set_current_timestamp_updated_at();

create index if not exists idx_whoop_journal_facts_user_cycle_start
  on public.whoop_journal_facts (user_id, cycle_start_at desc);

alter table public.uploads enable row level security;
alter table public.ingestion_runs enable row level security;
alter table public.ingestion_errors enable row level security;
alter table public.whoop_cycle_facts enable row level security;
alter table public.whoop_sleep_facts enable row level security;
alter table public.whoop_workout_facts enable row level security;
alter table public.whoop_journal_facts enable row level security;

create policy "uploads_select_own" on public.uploads
for select using (auth.uid() = user_id);

create policy "uploads_insert_own" on public.uploads
for insert with check (auth.uid() = user_id);

create policy "uploads_update_own" on public.uploads
for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "ingestion_runs_select_own" on public.ingestion_runs
for select using (auth.uid() = user_id);

create policy "ingestion_errors_select_own" on public.ingestion_errors
for select using (auth.uid() = user_id);

create policy "whoop_cycle_facts_select_own" on public.whoop_cycle_facts
for select using (auth.uid() = user_id);

create policy "whoop_sleep_facts_select_own" on public.whoop_sleep_facts
for select using (auth.uid() = user_id);

create policy "whoop_workout_facts_select_own" on public.whoop_workout_facts
for select using (auth.uid() = user_id);

create policy "whoop_journal_facts_select_own" on public.whoop_journal_facts
for select using (auth.uid() = user_id);


-- Derived analytics v1

-- Derived analytics v1 (separate from ingestion)

create table if not exists public.user_daily_metrics (
  user_id uuid not null references auth.users(id) on delete cascade,
  metric_date date not null,
  hrv_ms numeric(8,2) null,
  recovery_score_pct numeric(5,2) null,
  resting_hr_bpm numeric(6,2) null,
  day_strain numeric(6,2) null,
  sleep_performance_pct numeric(5,2) null,
  sleep_efficiency_pct numeric(5,2) null,
  asleep_duration_min int null,
  workouts_count int not null default 0,
  workout_strain_total numeric(8,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, metric_date),
  constraint user_daily_metrics_workouts_count_nonnegative_check check (workouts_count >= 0)
);

create trigger trg_user_daily_metrics_updated_at
before update on public.user_daily_metrics
for each row
execute function public.set_current_timestamp_updated_at();

create index if not exists idx_user_daily_metrics_metric_date
  on public.user_daily_metrics (metric_date desc);

create index if not exists idx_user_daily_metrics_user_metric_date
  on public.user_daily_metrics (user_id, metric_date desc);

create table if not exists public.user_metric_30d_aggregates (
  user_id uuid not null references auth.users(id) on delete cascade,
  metric_key text not null,
  window_end_date date not null,
  metric_value numeric not null,
  sample_days int not null,
  computed_at timestamptz not null default now(),
  primary key (user_id, metric_key, window_end_date),
  constraint user_metric_30d_aggregates_metric_key_check check (
    metric_key in ('hrv_ms', 'recovery_score_pct', 'sleep_performance_pct', 'asleep_duration_min', 'day_strain')
  ),
  constraint user_metric_30d_aggregates_sample_days_positive_check check (sample_days > 0)
);

create index if not exists idx_user_metric_30d_aggregates_metric_lookup
  on public.user_metric_30d_aggregates (metric_key, window_end_date desc);

create index if not exists idx_user_metric_30d_aggregates_user_lookup
  on public.user_metric_30d_aggregates (user_id, window_end_date desc);

create table if not exists public.cohort_metric_percentiles (
  cohort_key text not null,
  metric_key text not null,
  window_end_date date not null,
  sample_size int not null,
  p10 numeric not null,
  p25 numeric not null,
  p50 numeric not null,
  p75 numeric not null,
  p90 numeric not null,
  computed_at timestamptz not null default now(),
  primary key (cohort_key, metric_key, window_end_date),
  constraint cohort_metric_percentiles_metric_key_check check (
    metric_key in ('hrv_ms', 'recovery_score_pct', 'sleep_performance_pct', 'asleep_duration_min', 'day_strain')
  ),
  constraint cohort_metric_percentiles_sample_size_positive_check check (sample_size > 0)
);

create index if not exists idx_cohort_metric_percentiles_metric_cohort
  on public.cohort_metric_percentiles (metric_key, cohort_key, window_end_date desc);

create or replace function public.build_mvp_cohort_key(
  p_mode text,
  p_age_bucket text,
  p_sex text
)
returns text
language plpgsql
immutable
as $$
begin
  if p_mode = 'age_sex' then
    return 'age_sex:' || coalesce(p_age_bucket, 'unknown') || ':' || coalesce(p_sex, 'unknown');
  end if;

  if p_mode = 'age' then
    return 'age:' || coalesce(p_age_bucket, 'unknown');
  end if;

  return 'all';
end;
$$;

create or replace function public.recompute_user_daily_metrics(
  p_user_id uuid
)
returns void
language plpgsql
as $$
begin
  delete from public.user_daily_metrics where user_id = p_user_id;

  with cycle_daily as (
    select
      user_id,
      (cycle_start_at at time zone 'utc')::date as metric_date,
      avg(hrv_ms)::numeric(8,2) as hrv_ms,
      avg(recovery_score)::numeric(5,2) as recovery_score_pct,
      avg(resting_heart_rate_bpm)::numeric(6,2) as resting_hr_bpm,
      avg(day_strain)::numeric(6,2) as day_strain,
      avg(sleep_performance_percent)::numeric(5,2) as sleep_performance_pct,
      avg(sleep_efficiency_percent)::numeric(5,2) as sleep_efficiency_pct,
      round(avg(asleep_duration_min))::int as asleep_duration_min
    from public.whoop_cycle_facts
    where user_id = p_user_id
    group by user_id, (cycle_start_at at time zone 'utc')::date
  ),
  sleep_daily as (
    select
      user_id,
      (wake_onset_at at time zone 'utc')::date as metric_date,
      avg(sleep_performance_percent)::numeric(5,2) as sleep_performance_pct,
      avg(sleep_efficiency_percent)::numeric(5,2) as sleep_efficiency_pct,
      round(avg(asleep_duration_min))::int as asleep_duration_min
    from public.whoop_sleep_facts
    where user_id = p_user_id
    group by user_id, (wake_onset_at at time zone 'utc')::date
  ),
  workout_daily as (
    select
      user_id,
      (workout_start_at at time zone 'utc')::date as metric_date,
      count(*)::int as workouts_count,
      coalesce(sum(activity_strain), 0)::numeric(8,2) as workout_strain_total
    from public.whoop_workout_facts
    where user_id = p_user_id
    group by user_id, (workout_start_at at time zone 'utc')::date
  ),
  metric_dates as (
    select user_id, metric_date from cycle_daily
    union
    select user_id, metric_date from sleep_daily
    union
    select user_id, metric_date from workout_daily
  )
  insert into public.user_daily_metrics (
    user_id,
    metric_date,
    hrv_ms,
    recovery_score_pct,
    resting_hr_bpm,
    day_strain,
    sleep_performance_pct,
    sleep_efficiency_pct,
    asleep_duration_min,
    workouts_count,
    workout_strain_total
  )
  select
    d.user_id,
    d.metric_date,
    c.hrv_ms,
    c.recovery_score_pct,
    c.resting_hr_bpm,
    c.day_strain,
    coalesce(s.sleep_performance_pct, c.sleep_performance_pct) as sleep_performance_pct,
    coalesce(s.sleep_efficiency_pct, c.sleep_efficiency_pct) as sleep_efficiency_pct,
    coalesce(s.asleep_duration_min, c.asleep_duration_min) as asleep_duration_min,
    coalesce(w.workouts_count, 0) as workouts_count,
    coalesce(w.workout_strain_total, 0)::numeric(8,2) as workout_strain_total
  from metric_dates d
  left join cycle_daily c on c.user_id = d.user_id and c.metric_date = d.metric_date
  left join sleep_daily s on s.user_id = d.user_id and s.metric_date = d.metric_date
  left join workout_daily w on w.user_id = d.user_id and w.metric_date = d.metric_date;
end;
$$;

create or replace function public.recompute_user_metric_30d_aggregates(
  p_user_id uuid,
  p_window_end_date date default current_date
)
returns void
language plpgsql
as $$
begin
  delete from public.user_metric_30d_aggregates
  where user_id = p_user_id
    and window_end_date = p_window_end_date;

  insert into public.user_metric_30d_aggregates (
    user_id,
    metric_key,
    window_end_date,
    metric_value,
    sample_days
  )
  select p_user_id, 'hrv_ms', p_window_end_date, avg(udm.hrv_ms), count(udm.hrv_ms)::int
  from public.user_daily_metrics udm
  where udm.user_id = p_user_id
    and udm.metric_date between p_window_end_date - interval '29 days' and p_window_end_date
    and udm.hrv_ms is not null
  having count(udm.hrv_ms) > 0

  union all

  select p_user_id, 'recovery_score_pct', p_window_end_date, avg(udm.recovery_score_pct), count(udm.recovery_score_pct)::int
  from public.user_daily_metrics udm
  where udm.user_id = p_user_id
    and udm.metric_date between p_window_end_date - interval '29 days' and p_window_end_date
    and udm.recovery_score_pct is not null
  having count(udm.recovery_score_pct) > 0

  union all

  select p_user_id, 'sleep_performance_pct', p_window_end_date, avg(udm.sleep_performance_pct), count(udm.sleep_performance_pct)::int
  from public.user_daily_metrics udm
  where udm.user_id = p_user_id
    and udm.metric_date between p_window_end_date - interval '29 days' and p_window_end_date
    and udm.sleep_performance_pct is not null
  having count(udm.sleep_performance_pct) > 0

  union all

  select p_user_id, 'asleep_duration_min', p_window_end_date, avg(udm.asleep_duration_min), count(udm.asleep_duration_min)::int
  from public.user_daily_metrics udm
  where udm.user_id = p_user_id
    and udm.metric_date between p_window_end_date - interval '29 days' and p_window_end_date
    and udm.asleep_duration_min is not null
  having count(udm.asleep_duration_min) > 0

  union all

  select p_user_id, 'day_strain', p_window_end_date, avg(udm.day_strain), count(udm.day_strain)::int
  from public.user_daily_metrics udm
  where udm.user_id = p_user_id
    and udm.metric_date between p_window_end_date - interval '29 days' and p_window_end_date
    and udm.day_strain is not null
  having count(udm.day_strain) > 0;
end;
$$;

create or replace function public.recompute_cohort_metric_percentiles(
  p_window_end_date date default current_date
)
returns void
language plpgsql
as $$
begin
  delete from public.cohort_metric_percentiles
  where window_end_date = p_window_end_date;

  with base as (
    select
      uma.user_id,
      uma.metric_key,
      uma.metric_value,
      up.age_bucket,
      up.sex
    from public.user_metric_30d_aggregates uma
    join public.user_profiles up on up.user_id = uma.user_id
    where uma.window_end_date = p_window_end_date
  ),
  cohort_inputs as (
    select public.build_mvp_cohort_key('age_sex', age_bucket, sex) as cohort_key, metric_key, metric_value
    from base

    union all

    select public.build_mvp_cohort_key('age', age_bucket, sex) as cohort_key, metric_key, metric_value
    from base

    union all

    select public.build_mvp_cohort_key('all', age_bucket, sex) as cohort_key, metric_key, metric_value
    from base
  )
  insert into public.cohort_metric_percentiles (
    cohort_key,
    metric_key,
    window_end_date,
    sample_size,
    p10,
    p25,
    p50,
    p75,
    p90
  )
  select
    cohort_key,
    metric_key,
    p_window_end_date,
    count(*)::int as sample_size,
    percentile_cont(0.10) within group (order by metric_value) as p10,
    percentile_cont(0.25) within group (order by metric_value) as p25,
    percentile_cont(0.50) within group (order by metric_value) as p50,
    percentile_cont(0.75) within group (order by metric_value) as p75,
    percentile_cont(0.90) within group (order by metric_value) as p90
  from cohort_inputs
  group by cohort_key, metric_key
  having count(*) > 0;
end;
$$;

create or replace function public.recompute_analytics_for_user(
  p_user_id uuid,
  p_window_end_date date default current_date
)
returns jsonb
language plpgsql
as $$
declare
  v_daily_rows int;
  v_agg_rows int;
begin
  perform public.recompute_user_daily_metrics(p_user_id);
  perform public.recompute_user_metric_30d_aggregates(p_user_id, p_window_end_date);
  perform public.recompute_cohort_metric_percentiles(p_window_end_date);

  select count(*)::int into v_daily_rows
  from public.user_daily_metrics
  where user_id = p_user_id;

  select count(*)::int into v_agg_rows
  from public.user_metric_30d_aggregates
  where user_id = p_user_id
    and window_end_date = p_window_end_date;

  return jsonb_build_object(
    'user_id', p_user_id,
    'window_end_date', p_window_end_date,
    'daily_rows', v_daily_rows,
    'aggregate_rows', v_agg_rows
  );
end;
$$;

create or replace function public.recompute_analytics_for_all(
  p_window_end_date date default current_date
)
returns jsonb
language plpgsql
as $$
declare
  v_user_id uuid;
  v_users_processed int := 0;
begin
  for v_user_id in
    select user_id from public.user_profiles
  loop
    perform public.recompute_user_daily_metrics(v_user_id);
    perform public.recompute_user_metric_30d_aggregates(v_user_id, p_window_end_date);
    v_users_processed := v_users_processed + 1;
  end loop;

  perform public.recompute_cohort_metric_percentiles(p_window_end_date);

  return jsonb_build_object(
    'window_end_date', p_window_end_date,
    'users_processed', v_users_processed
  );
end;
$$;

alter table public.user_daily_metrics enable row level security;
alter table public.user_metric_30d_aggregates enable row level security;
alter table public.cohort_metric_percentiles enable row level security;
alter table public.user_feedback enable row level security;

create policy "user_daily_metrics_select_own" on public.user_daily_metrics
for select using (auth.uid() = user_id);

create policy "user_metric_30d_aggregates_select_own" on public.user_metric_30d_aggregates
for select using (auth.uid() = user_id);

create policy "cohort_metric_percentiles_select_authenticated" on public.cohort_metric_percentiles
for select using (auth.role() = 'authenticated');

create policy "user_feedback_select_own" on public.user_feedback
for select using (auth.uid() = user_id);

create policy "user_feedback_insert_own" on public.user_feedback
for insert with check (auth.uid() = user_id);

create policy "user_feedback_update_own" on public.user_feedback
for update using (auth.uid() = user_id) with check (auth.uid() = user_id);



-- MVP hardening indexes

-- MVP hardening indexes

create index if not exists idx_uploads_user_kind_created_at
  on public.uploads (user_id, detected_file_kind, created_at desc);

create index if not exists idx_deletion_requests_user_status_requested
  on public.deletion_requests (user_id, status, requested_at desc);

