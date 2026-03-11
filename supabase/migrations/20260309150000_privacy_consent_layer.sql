-- Privacy/consent MVP hardening
-- NOTE: Legal wording + versioning model should be reviewed by counsel before public scale.

alter table public.consent_events
  add column if not exists accepted_at timestamptz not null default now(),
  add column if not exists privacy_notice_version text null,
  add column if not exists terms_version text null,
  add column if not exists consent_text_snapshot text null;

update public.consent_events
set accepted_at = coalesce(accepted_at, created_at, now())
where accepted_at is null;

alter table public.consent_events
  drop constraint if exists consent_events_type_check;

alter table public.consent_events
  add constraint consent_events_type_check
  check (
    consent_type in (
      'terms',
      'privacy',
      'benchmark_aggregation',
      'whoop_processing',
      'informational_non_medical',
      'privacy_notice_ack',
      'terms_of_use_ack'
    )
  );

create unique index if not exists idx_consent_events_user_type_version_unique
  on public.consent_events (user_id, consent_type, consent_version);

create index if not exists idx_consent_events_user_type_created_at
  on public.consent_events (user_id, consent_type, created_at desc);

create table if not exists public.privacy_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid null references auth.users(id) on delete set null,
  event_type text not null,
  event_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint privacy_events_event_type_check check (
    event_type in (
      'consent_submitted',
      'delete_my_data_requested',
      'delete_my_data_completed',
      'delete_my_data_failed',
      'raw_upload_cleanup_failed'
    )
  )
);

create index if not exists idx_privacy_events_user_created_at
  on public.privacy_events (user_id, created_at desc);

create index if not exists idx_privacy_events_type_created_at
  on public.privacy_events (event_type, created_at desc);

alter table public.privacy_events enable row level security;

create policy "privacy_events_select_own" on public.privacy_events
for select using (auth.uid() = user_id);

create policy "privacy_events_insert_own" on public.privacy_events
for insert with check (auth.uid() = user_id);
