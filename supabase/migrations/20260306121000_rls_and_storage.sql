-- WHOOP Benchmarking MVP RLS + Storage setup

-- Raw upload bucket
insert into storage.buckets (id, name, public)
values ('whoop-raw-uploads', 'whoop-raw-uploads', false)
on conflict (id) do nothing;

alter table public.user_profiles enable row level security;
alter table public.consent_events enable row level security;
alter table public.upload_batches enable row level security;
alter table public.upload_files enable row level security;
alter table public.parse_jobs enable row level security;
alter table public.parse_errors enable row level security;
alter table public.whoop_physiological_cycles enable row level security;
alter table public.whoop_sleeps enable row level security;
alter table public.whoop_workouts enable row level security;
alter table public.whoop_journal_entries enable row level security;
alter table public.user_metric_daily enable row level security;
alter table public.user_metric_rollups enable row level security;
alter table public.cohort_metric_distributions enable row level security;
alter table public.user_metric_percentiles enable row level security;
alter table public.deletion_requests enable row level security;

-- user_profiles
create policy "user_profiles_select_own" on public.user_profiles
for select using (auth.uid() = user_id);

create policy "user_profiles_insert_own" on public.user_profiles
for insert with check (auth.uid() = user_id);

create policy "user_profiles_update_own" on public.user_profiles
for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- consent_events
create policy "consent_events_select_own" on public.consent_events
for select using (auth.uid() = user_id);

create policy "consent_events_insert_own" on public.consent_events
for insert with check (auth.uid() = user_id);

-- upload_batches
create policy "upload_batches_select_own" on public.upload_batches
for select using (auth.uid() = user_id);

create policy "upload_batches_insert_own" on public.upload_batches
for insert with check (auth.uid() = user_id);

create policy "upload_batches_update_own" on public.upload_batches
for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- upload_files
create policy "upload_files_select_own" on public.upload_files
for select using (auth.uid() = user_id);

create policy "upload_files_insert_own" on public.upload_files
for insert with check (auth.uid() = user_id);

-- parse_jobs
create policy "parse_jobs_select_own" on public.parse_jobs
for select using (
  exists (
    select 1
    from public.upload_files uf
    where uf.id = parse_jobs.upload_file_id
      and uf.user_id = auth.uid()
  )
);

-- parse_errors
create policy "parse_errors_select_own" on public.parse_errors
for select using (
  exists (
    select 1
    from public.parse_jobs pj
    join public.upload_files uf on uf.id = pj.upload_file_id
    where pj.id = parse_errors.parse_job_id
      and uf.user_id = auth.uid()
  )
);

-- normalized WHOOP tables
create policy "whoop_physiological_cycles_select_own" on public.whoop_physiological_cycles
for select using (auth.uid() = user_id);

create policy "whoop_sleeps_select_own" on public.whoop_sleeps
for select using (auth.uid() = user_id);

create policy "whoop_workouts_select_own" on public.whoop_workouts
for select using (auth.uid() = user_id);

create policy "whoop_journal_entries_select_own" on public.whoop_journal_entries
for select using (auth.uid() = user_id);

-- derived user-level analytics
create policy "user_metric_daily_select_own" on public.user_metric_daily
for select using (auth.uid() = user_id);

create policy "user_metric_rollups_select_own" on public.user_metric_rollups
for select using (auth.uid() = user_id);

create policy "user_metric_percentiles_select_own" on public.user_metric_percentiles
for select using (auth.uid() = user_id);

-- cohort metrics are non-identifying aggregate snapshots
create policy "cohort_metric_distributions_select_authenticated" on public.cohort_metric_distributions
for select using (auth.role() = 'authenticated');

-- deletion requests
create policy "deletion_requests_select_own" on public.deletion_requests
for select using (auth.uid() = user_id);

create policy "deletion_requests_insert_own" on public.deletion_requests
for insert with check (auth.uid() = user_id);

-- Storage object policies for raw upload bucket
-- Require object path prefix: <auth.uid()>/...
create policy "storage_whoop_raw_upload_select_own"
on storage.objects
for select
using (
  bucket_id = 'whoop-raw-uploads'
  and split_part(name, '/', 1) = auth.uid()::text
);

create policy "storage_whoop_raw_upload_insert_own"
on storage.objects
for insert
with check (
  bucket_id = 'whoop-raw-uploads'
  and split_part(name, '/', 1) = auth.uid()::text
);

create policy "storage_whoop_raw_upload_update_own"
on storage.objects
for update
using (
  bucket_id = 'whoop-raw-uploads'
  and split_part(name, '/', 1) = auth.uid()::text
)
with check (
  bucket_id = 'whoop-raw-uploads'
  and split_part(name, '/', 1) = auth.uid()::text
);

create policy "storage_whoop_raw_upload_delete_own"
on storage.objects
for delete
using (
  bucket_id = 'whoop-raw-uploads'
  and split_part(name, '/', 1) = auth.uid()::text
);
