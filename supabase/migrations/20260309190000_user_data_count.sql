create or replace function public.get_total_users_with_data()
returns bigint
language sql
security definer
set search_path = public
stable
as $$
  select count(*)::bigint
  from (
    select user_id from public.whoop_cycle_facts
    union
    select user_id from public.whoop_sleep_facts
    union
    select user_id from public.whoop_workout_facts
  ) users_with_data;
$$;

