alter table public.user_profiles
  add column if not exists first_dashboard_feedback_prompt_seen_at timestamptz null,
  add column if not exists first_dashboard_feedback_dismissed_at timestamptz null,
  add column if not exists first_dashboard_feedback_submitted_at timestamptz null;

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

alter table public.user_feedback enable row level security;

drop policy if exists "user_feedback_select_own" on public.user_feedback;
create policy "user_feedback_select_own" on public.user_feedback
for select using (auth.uid() = user_id);

drop policy if exists "user_feedback_insert_own" on public.user_feedback;
create policy "user_feedback_insert_own" on public.user_feedback
for insert with check (auth.uid() = user_id);

drop policy if exists "user_feedback_update_own" on public.user_feedback;
create policy "user_feedback_update_own" on public.user_feedback
for update using (auth.uid() = user_id) with check (auth.uid() = user_id);