import "server-only";

import { revalidateTag, unstable_cache } from "next/cache";

import { supabaseAdmin } from "@/lib/supabase/admin-client";

type UserDataCountResponse = {
  totalUsers: number;
};

export const USER_DATA_COUNT_CACHE_TAG = "global-user-data-count";

const isMissingRpcFunctionError = (error: { code?: string; message?: string } | null): boolean => {
  if (!error) {
    return false;
  }

  return error.code === "PGRST202" || (error.message ?? "").includes("get_total_users_with_data");
};

const loadDistinctUserIdsFromTable = async (table: string): Promise<string[]> => {
  const { data, error } = await supabaseAdmin.from(table).select("user_id");

  if (error) {
    throw new Error(`Failed to load user ids from ${table}: ${error.message}`);
  }

  return ((data ?? []) as Array<{ user_id: string | null }>)
    .map((row) => row.user_id)
    .filter((value): value is string => Boolean(value));
};

const loadUserDataCountFallback = async (): Promise<UserDataCountResponse> => {
  const [cycleUserIds, sleepUserIds, workoutUserIds] = await Promise.all([
    loadDistinctUserIdsFromTable("whoop_cycle_facts"),
    loadDistinctUserIdsFromTable("whoop_sleep_facts"),
    loadDistinctUserIdsFromTable("whoop_workout_facts"),
  ]);

  return {
    totalUsers: new Set([...cycleUserIds, ...sleepUserIds, ...workoutUserIds]).size,
  };
};

const loadUserDataCount = async (): Promise<UserDataCountResponse> => {
  const { data, error } = await supabaseAdmin.rpc("get_total_users_with_data");

  if (error) {
    if (isMissingRpcFunctionError(error)) {
      return loadUserDataCountFallback();
    }

    throw new Error(`Failed to load global user data count: ${error.message}`);
  }

  const raw = Array.isArray(data) ? data[0] : data;
  const totalUsers = Number(raw ?? 0);

  return {
    totalUsers: Number.isFinite(totalUsers) ? totalUsers : 0,
  };
};

const getCachedUserDataCount = unstable_cache(loadUserDataCount, [USER_DATA_COUNT_CACHE_TAG], {
  revalidate: 300,
  tags: [USER_DATA_COUNT_CACHE_TAG],
});

export const getUserDataCount = async (): Promise<UserDataCountResponse> => {
  try {
    return await getCachedUserDataCount();
  } catch (error) {
    console.error("Failed to load user data count", error);
    return { totalUsers: 0 };
  }
};

export const revalidateUserDataCount = () => revalidateTag(USER_DATA_COUNT_CACHE_TAG);
