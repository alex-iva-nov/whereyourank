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

create policy "user_daily_metrics_select_own" on public.user_daily_metrics
for select using (auth.uid() = user_id);

create policy "user_metric_30d_aggregates_select_own" on public.user_metric_30d_aggregates
for select using (auth.uid() = user_id);

create policy "cohort_metric_percentiles_select_authenticated" on public.cohort_metric_percentiles
for select using (auth.role() = 'authenticated');
