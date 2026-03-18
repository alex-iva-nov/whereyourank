import { supabaseAdmin } from "@/lib/supabase/admin-client";
import { getLatestAnalyticsWindowDateForUser } from "@/lib/analytics/latest-aggregates";
import { MIN_AGGREGATE_COHORT_SIZE } from "@/lib/privacy/aggregate-guards";

export const recomputeAnalyticsForUser = async (userId: string, windowEndDate?: string | null) => {
  const effectiveWindowEndDate = windowEndDate ?? await getLatestAnalyticsWindowDateForUser(userId);
  if (!effectiveWindowEndDate) {
    return { user_id: userId, window_end_date: null, daily_rows: 0, aggregate_rows: 0 };
  }

  const { data, error } = await supabaseAdmin.rpc("recompute_analytics_for_user", {
    p_user_id: userId,
    p_window_end_date: effectiveWindowEndDate,
  });

  if (error) {
    throw new Error(`Failed to recompute analytics for user ${userId}: ${error.message}`);
  }

  return data as { user_id: string; window_end_date: string; daily_rows: number; aggregate_rows: number };
};

export const recomputeAnalyticsForAll = async (windowEndDate?: string) => {
  const { data, error } = await supabaseAdmin.rpc("recompute_analytics_for_all", {
    p_window_end_date: windowEndDate ?? new Date().toISOString().slice(0, 10),
  });

  if (error) {
    throw new Error(`Failed to recompute analytics for all users: ${error.message}`);
  }

  return data as { window_end_date: string; users_processed: number };
};

export const getMinCohortSampleSize = () => MIN_AGGREGATE_COHORT_SIZE;
