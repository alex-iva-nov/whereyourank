import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server-client";

export type FirstDashboardFeedbackPromptState = {
  shouldShowPrompt: boolean;
  promptSeenAt: string | null;
  dismissedAt: string | null;
  submittedAt: string | null;
  latestCompletedUploadAt: string | null;
  schemaReady: boolean;
};

type ProfileFeedbackLifecycleRow = {
  first_dashboard_feedback_prompt_seen_at: string | null;
  first_dashboard_feedback_dismissed_at: string | null;
  first_dashboard_feedback_submitted_at: string | null;
};

type UploadCompletionRow = {
  processed_at: string | null;
};

const isMissingFeedbackSchemaError = (error: { code?: string; message?: string } | null): boolean => {
  if (!error) {
    return false;
  }

  const message = (error.message ?? "").toLowerCase();
  return error.code === "42703" || error.code === "42P01" || message.includes("first_dashboard_feedback_") || message.includes("user_feedback");
};

export const getFirstDashboardFeedbackPromptState = async (userId: string): Promise<FirstDashboardFeedbackPromptState> => {
  try {
    const supabase = await createSupabaseServerClient();

    const [profileRes, uploadRes] = await Promise.all([
      supabase
        .from("user_profiles")
        .select("first_dashboard_feedback_prompt_seen_at, first_dashboard_feedback_dismissed_at, first_dashboard_feedback_submitted_at")
        .eq("user_id", userId)
        .single(),
      supabase
        .from("uploads")
        .select("processed_at")
        .eq("user_id", userId)
        .eq("upload_status", "completed")
        .not("processed_at", "is", null)
        .order("processed_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    if (uploadRes.error) {
      throw new Error(`Failed to load latest upload completion: ${uploadRes.error.message}`);
    }

    const latestUpload = (uploadRes.data as UploadCompletionRow | null)?.processed_at ?? null;

    if (profileRes.error) {
      if (isMissingFeedbackSchemaError(profileRes.error)) {
        return {
          shouldShowPrompt: false,
          promptSeenAt: null,
          dismissedAt: null,
          submittedAt: null,
          latestCompletedUploadAt: latestUpload,
          schemaReady: false,
        };
      }

      throw new Error(`Failed to load feedback lifecycle state: ${profileRes.error.message}`);
    }

    const lifecycle = profileRes.data as ProfileFeedbackLifecycleRow;

    return {
      shouldShowPrompt:
        latestUpload != null &&
        lifecycle.first_dashboard_feedback_submitted_at == null &&
        lifecycle.first_dashboard_feedback_dismissed_at == null,
      promptSeenAt: lifecycle.first_dashboard_feedback_prompt_seen_at,
      dismissedAt: lifecycle.first_dashboard_feedback_dismissed_at,
      submittedAt: lifecycle.first_dashboard_feedback_submitted_at,
      latestCompletedUploadAt: latestUpload,
      schemaReady: true,
    };
  } catch (error) {
    console.error("Failed to load first dashboard feedback prompt state", error);
    return {
      shouldShowPrompt: false,
      promptSeenAt: null,
      dismissedAt: null,
      submittedAt: null,
      latestCompletedUploadAt: null,
      schemaReady: false,
    };
  }
};
