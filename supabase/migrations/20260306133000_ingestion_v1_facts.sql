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