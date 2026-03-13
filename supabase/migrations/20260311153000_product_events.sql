create table if not exists public.product_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_name text not null,
  event_payload jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint product_events_event_name_check check (
    event_name in (
      'sign_in_completed',
      'sign_up_completed',
      'onboarding_completed',
      'upload_page_viewed',
      'upload_submitted',
      'upload_completed',
      'dashboard_viewed',
      'first_dashboard_feedback_submitted'
    )
  )
);

create index if not exists idx_product_events_user_occurred_at
  on public.product_events (user_id, occurred_at desc);

create index if not exists idx_product_events_name_occurred_at
  on public.product_events (event_name, occurred_at desc);

alter table public.product_events enable row level security;

create policy "product_events_select_own" on public.product_events
for select using (auth.uid() = user_id);

create policy "product_events_insert_own" on public.product_events
for insert with check (auth.uid() = user_id);
