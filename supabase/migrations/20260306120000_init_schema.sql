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






