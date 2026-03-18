create or replace function public.recompute_user_derived_analytics(
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
