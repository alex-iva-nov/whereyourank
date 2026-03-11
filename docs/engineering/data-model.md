# Data Model — WHOOP Benchmarking MVP

## 1. Purpose of the data model

This data model supports a privacy-first, web-first MVP where a WHOOP user uploads CSV exports and receives deterministic benchmark insights.

The model must support:
- user account + minimal profile (`age_bucket`, `sex`, `country`)
- manual CSV uploads (`physiological_cycles.csv`, `sleeps.csv`, `workouts.csv`, `journal_entries.csv`)
- ingestion observability (files, parse jobs, errors)
- normalized WHOOP records
- derived user metrics and cohort-level benchmark distributions
- percentile/rank-like outputs with cohort fallback
- delete-my-data workflow with complete user-linked deletion

## 2. Design principles

- Privacy first: no full name, no exact birth date, no unnecessary PII.
- Deterministic analytics first: AI reads precomputed outputs, not raw tables.
- Append + recompute model: uploads are immutable; derived tables are rebuildable.
- Explicit lineage: each normalized row links to the source upload file.
- Solo-founder simplicity: keep schema understandable; avoid over-normalization.
- Safe benchmarking: no percentile output for undersized cohorts (`min_n = 50`).

## 3. Entity overview

Core entities:
- Account: auth user + minimal anonymous profile.
- Ingestion: upload batch, upload file, parse job, parse error.
- Normalized WHOOP data: cycle/day, sleep, workout, journal.
- Derived analytics: user daily metrics, user rollups, cohort distributions, user percentiles.
- Governance: consent log and deletion request/job state.

High-level flow:
1. User creates account and profile.
2. User uploads one or more WHOOP CSV files as an upload batch.
3. Files are stored in Supabase Storage and registered in DB.
4. Parse jobs validate + normalize into WHOOP tables.
5. Derived jobs recompute user rollups and cohort distributions.
6. Dashboard and AI intent handlers read only derived outputs.

## 4. Core user/account tables

### 4.1 `user_profiles`
One row per authenticated user.

Columns:
- `user_id uuid primary key references auth.users(id) on delete cascade`
- `age_bucket text not null` (example: `18_24`, `25_34`, `35_44`, `45_54`, `55_plus`)
- `sex text not null` (`female`, `male`, `other`, `prefer_not_to_say`)
- `country text not null` (ISO-3166-1 alpha-2)
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

Constraints:
- check constraints for controlled enum-like values.
- no columns for full name, birth date, or freeform address.

### 4.2 `consent_events`
Append-only legal/compliance log.

Columns:
- `id bigserial primary key`
- `user_id uuid not null references auth.users(id) on delete cascade`
- `consent_type text not null` (`terms`, `privacy`, `benchmark_aggregation`)
- `consent_version text not null`
- `accepted boolean not null`
- `created_at timestamptz not null default now()`

## 5. Upload and ingestion tables

### 5.1 `upload_batches`
A user upload session (can include 1..4 files).

Columns:
- `id uuid primary key default gen_random_uuid()`
- `user_id uuid not null references auth.users(id) on delete cascade`
- `status text not null` (`pending`, `processing`, `completed`, `failed`, `partial`)
- `uploaded_at timestamptz not null default now()`
- `completed_at timestamptz null`

### 5.2 `upload_files`
Each uploaded CSV file in a batch.

Columns:
- `id uuid primary key default gen_random_uuid()`
- `batch_id uuid not null references upload_batches(id) on delete cascade`
- `user_id uuid not null references auth.users(id) on delete cascade`
- `file_kind text not null` (`physiological_cycles`, `sleeps`, `workouts`, `journal_entries`)
- `storage_path text not null` (Supabase Storage object path)
- `original_filename text not null`
- `sha256 text not null`
- `file_size_bytes bigint not null`
- `uploaded_at timestamptz not null default now()`

Constraints/indexes:
- unique (`user_id`, `sha256`, `file_kind`) to prevent accidental duplicates.
- index on (`batch_id`), (`user_id`, `uploaded_at desc`).

### 5.3 `parse_jobs`
Tracks ingestion processing per file.

Columns:
- `id uuid primary key default gen_random_uuid()`
- `upload_file_id uuid not null references upload_files(id) on delete cascade`
- `job_type text not null default 'parse_normalize'`
- `status text not null` (`queued`, `running`, `completed`, `failed`)
- `parser_version text not null`
- `started_at timestamptz null`
- `finished_at timestamptz null`
- `rows_read int not null default 0`
- `rows_inserted int not null default 0`
- `rows_rejected int not null default 0`
- `error_summary text null`

### 5.4 `parse_errors`
Structured row-level errors for debugging/support.

Columns:
- `id bigserial primary key`
- `parse_job_id uuid not null references parse_jobs(id) on delete cascade`
- `row_number int null`
- `column_name text null`
- `error_code text not null`
- `error_message text not null`
- `created_at timestamptz not null default now()`

## 6. Normalized WHOOP data tables

All normalized tables include:
- `id uuid primary key default gen_random_uuid()`
- `user_id uuid not null references auth.users(id) on delete cascade`
- `upload_file_id uuid not null references upload_files(id) on delete cascade`
- `source_row_hash text not null` (dedupe/idempotency)
- `created_at timestamptz not null default now()`

### 6.1 `whoop_physiological_cycles`
Grain: one cycle/day record.

Key metrics (nullable if missing in file):
- `cycle_date date not null`
- `recovery_score numeric(5,2)`
- `resting_heart_rate_bpm numeric(5,2)`
- `hrv_ms numeric(7,2)`
- `blood_oxygen_percent numeric(5,2)`
- `skin_temp_c_delta numeric(5,2)`

Unique:
- unique (`user_id`, `cycle_date`, `source_row_hash`)

### 6.2 `whoop_sleeps`
Grain: one sleep session.

Columns:
- `sleep_id text null`
- `sleep_start_at timestamptz not null`
- `sleep_end_at timestamptz not null`
- `sleep_performance_percent numeric(5,2)`
- `sleep_duration_min int`
- `sleep_efficiency_percent numeric(5,2)`
- `sleep_consistency_percent numeric(5,2)`
- `sleep_debt_min int`
- `light_sleep_min int`
- `deep_sleep_min int`
- `rem_sleep_min int`

Indexes:
- (`user_id`, `sleep_start_at desc`)

### 6.3 `whoop_workouts`
Grain: one workout.

Columns:
- `workout_id text null`
- `workout_start_at timestamptz not null`
- `workout_end_at timestamptz null`
- `activity_name text`
- `workout_duration_min int`
- `strain_score numeric(6,2)`
- `energy_burned_kcal int`
- `avg_heart_rate_bpm numeric(5,2)`
- `max_heart_rate_bpm numeric(5,2)`
- `zone_1_min int`
- `zone_2_min int`
- `zone_3_min int`
- `zone_4_min int`
- `zone_5_min int`

Indexes:
- (`user_id`, `workout_start_at desc`)

### 6.4 `whoop_journal_entries`
Grain: one journal response per date/question.

Columns:
- `entry_date date not null`
- `question_key text not null` (normalized key, example: `alcohol`, `caffeine`)
- `answer_bool boolean null`
- `answer_text text null` (for non-boolean cases if present)

Unique:
- unique (`user_id`, `entry_date`, `question_key`, `source_row_hash`)

## 7. Derived analytics tables

Derived tables are recomputable and safe to truncate/rebuild.

### 7.1 `user_metric_daily`
Long-format daily features for deterministic analytics.

Columns:
- `id uuid primary key default gen_random_uuid()`
- `user_id uuid not null references auth.users(id) on delete cascade`
- `metric_date date not null`
- `metric_key text not null`
- `metric_value numeric not null`
- `source_priority text not null` (`cycle`, `sleep`, `workout`, `derived`)
- `created_at timestamptz not null default now()`

Unique/indexes:
- unique (`user_id`, `metric_date`, `metric_key`)
- index (`metric_key`, `metric_date`)

### 7.2 `user_metric_rollups`
Precomputed windows for dashboard and Q&A.

Columns:
- `id uuid primary key default gen_random_uuid()`
- `user_id uuid not null references auth.users(id) on delete cascade`
- `metric_key text not null`
- `window_key text not null` (`last_7d`, `last_30d`, `last_90d`, `lifetime`)
- `value_mean numeric null`
- `value_median numeric null`
- `value_stddev numeric null`
- `value_count int not null`
- `computed_at timestamptz not null default now()`

Unique:
- unique (`user_id`, `metric_key`, `window_key`)

### 7.3 `cohort_metric_distributions`
Benchmark distribution snapshots for percentile calculation.

Columns:
- `id uuid primary key default gen_random_uuid()`
- `cohort_key text not null` (examples: `all`, `age:25_34`, `sex:male`, `country:GB`, `age_sex:25_34_male`)
- `metric_key text not null`
- `window_key text not null` (same set as rollups; MVP can start with `last_30d`)
- `sample_size int not null`
- `mean numeric not null`
- `median numeric not null`
- `p10 numeric not null`
- `p25 numeric not null`
- `p50 numeric not null`
- `p75 numeric not null`
- `p90 numeric not null`
- `computed_at timestamptz not null default now()`

Unique/index:
- unique (`cohort_key`, `metric_key`, `window_key`, `computed_at`)
- index (`cohort_key`, `metric_key`, `window_key`, `computed_at desc`)

### 7.4 `user_metric_percentiles`
Resolved user percentile result after cohort fallback.

Columns:
- `id uuid primary key default gen_random_uuid()`
- `user_id uuid not null references auth.users(id) on delete cascade`
- `metric_key text not null`
- `window_key text not null`
- `user_value numeric not null`
- `cohort_key_used text not null`
- `sample_size_used int not null`
- `percentile numeric(5,2) not null`
- `rank_label text not null` (`low`, `below_avg`, `avg`, `above_avg`, `high`)
- `computed_at timestamptz not null default now()`

Unique:
- unique (`user_id`, `metric_key`, `window_key`)

## 8. Cohort model

### 8.1 MVP cohort dimensions
Allowed cohort keys in MVP:
- `all`
- `age_bucket`
- `sex`
- `country`
- `age_bucket + sex`

### 8.2 Fallback order
For each user percentile request:
1. `age_bucket + sex`
2. `age_bucket`
3. `sex`
4. `country`
5. `all`

Use first cohort with `sample_size >= 50`.
If no cohort passes threshold, suppress percentile and return “not enough benchmark data yet”.

### 8.3 Metric set for MVP percentiles
Implement at least these 10 metrics:
- `hrv_ms`
- `resting_heart_rate_bpm`
- `recovery_score`
- `blood_oxygen_percent`
- `sleep_performance_percent`
- `sleep_duration_min`
- `sleep_efficiency_percent`
- `sleep_consistency_percent`
- `workout_strain_score`
- `workout_frequency_per_week`

## 9. Data deletion model

### 9.1 `deletion_requests`
Tracks explicit user deletion requests.

Columns:
- `id uuid primary key default gen_random_uuid()`
- `user_id uuid not null references auth.users(id) on delete cascade`
- `status text not null` (`requested`, `processing`, `completed`, `failed`)
- `requested_at timestamptz not null default now()`
- `processed_at timestamptz null`
- `failure_reason text null`

### 9.2 Deletion behavior (MVP)
On confirmed delete-my-data:
- delete Storage objects from `upload_files.storage_path`
- delete ingestion rows: `upload_batches`, `upload_files`, `parse_jobs`, `parse_errors`
- delete normalized WHOOP rows
- delete derived user-level rows (`user_metric_daily`, `user_metric_rollups`, `user_metric_percentiles`)
- delete `user_profiles` and rely on cascade from `auth.users` removal

Retention allowance:
- keep only non-identifying aggregate benchmark snapshots in `cohort_metric_distributions`
- no retained table should contain `user_id` after deletion

Operational target:
- complete deletion within 30 days max (target < 24h)

## 10. Scaling and indexing considerations

- Partition large normalized tables by month on event date once row count requires it.
- Keep ingestion idempotent using `source_row_hash` + uniqueness checks.
- Run derived recomputation asynchronously (queue/cron), not in request path.
- Use materialized views later only if query latency requires it.
- Recommended indexes for MVP:
  - normalized tables: (`user_id`, date/timestamp desc)
  - `user_metric_daily`: (`user_id`, `metric_key`, `metric_date desc`)
  - `user_metric_percentiles`: (`user_id`, `computed_at desc`)
  - `cohort_metric_distributions`: (`metric_key`, `cohort_key`, `computed_at desc`)
- Add RLS policies so users can only read their own user-linked records.

## 11. Open questions / future extensions

- Should country-level cohorts be region-grouped when country sample sizes are small?
- Should `window_key` include `last_14d` for better sleep/recovery sensitivity?
- Do we need a dedicated table for journal factor-outcome associations (instead of on-demand compute)?
- Should cohort distributions be recomputed full-refresh daily or incrementally per upload?
- How long should raw uploaded files be retained after successful parsing (immediate delete vs short retention window)?
- Post-MVP: add WHOOP API sync without changing the normalized schema contracts.
