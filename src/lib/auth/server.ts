import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { publicEnv } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";

type UserProfile = {
  user_id: string;
  age_bucket: string;
  sex: string;
  country: string;
};

const getSupabaseProjectRef = () => {
  try {
    return new URL(publicEnv.supabaseUrl).hostname.split(".")[0];
  } catch {
    return null;
  }
};

const hasSupabaseAuthCookie = async () => {
  const projectRef = getSupabaseProjectRef();
  const cookieStore = await cookies();
  const authCookieName = projectRef ? `sb-${projectRef}-auth-token` : null;

  return cookieStore.getAll().some(({ name, value }) => {
    if (!value) {
      return false;
    }

    if (authCookieName && (name === authCookieName || name.startsWith(`${authCookieName}.`))) {
      return true;
    }

    return name.startsWith("sb-") && name.includes("-auth-token");
  });
};

export const getCurrentUser = async () => {
  if (!(await hasSupabaseAuthCookie())) {
    return null;
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user;
};

export const requireUser = async () => {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/sign-in");
  }

  return user;
};

export const getCurrentProfile = async (userId: string): Promise<UserProfile | null> => {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("user_profiles")
    .select("user_id, age_bucket, sex, country")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load user profile: ${error.message}`);
  }

  return (data as UserProfile | null) ?? null;
};

export const requireOnboardingComplete = async () => {
  const user = await requireUser();
  const profile = await getCurrentProfile(user.id);

  if (!profile) {
    redirect("/onboarding");
  }

  return { user, profile };
};
