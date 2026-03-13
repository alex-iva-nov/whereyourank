import { NextResponse } from "next/server";

import { trackProductEvent } from "@/lib/product-events-server";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";

const SENTIMENT_VALUES = new Set(["loved_it", "confusing", "missing_something"]);

type ProfileLifecycleRow = {
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

const loadFeedbackLifecycle = async (supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>, userId: string) => {
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

  if (profileRes.error) {
    if (isMissingFeedbackSchemaError(profileRes.error)) {
      return {
        profile: null,
        latestCompletedUploadAt: (uploadRes.data as UploadCompletionRow | null)?.processed_at ?? null,
        schemaReady: false,
      };
    }

    throw new Error(`Failed to load feedback lifecycle state: ${profileRes.error.message}`);
  }

  return {
    profile: profileRes.data as ProfileLifecycleRow,
    latestCompletedUploadAt: (uploadRes.data as UploadCompletionRow | null)?.processed_at ?? null,
    schemaReady: true,
  };
};

const updatePromptSeenAtIfNeeded = async (
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  userId: string,
  currentValue: string | null,
) => {
  if (currentValue) {
    return currentValue;
  }

  const promptSeenAt = new Date().toISOString();
  const { data, error } = await supabase
    .from("user_profiles")
    .update({ first_dashboard_feedback_prompt_seen_at: promptSeenAt })
    .eq("user_id", userId)
    .is("first_dashboard_feedback_prompt_seen_at", null)
    .select("first_dashboard_feedback_prompt_seen_at")
    .maybeSingle();

  if (error) {
    if (isMissingFeedbackSchemaError(error)) {
      return promptSeenAt;
    }

    throw new Error(`Failed to mark feedback prompt as seen: ${error.message}`);
  }

  if (data?.first_dashboard_feedback_prompt_seen_at) {
    return data.first_dashboard_feedback_prompt_seen_at as string;
  }

  const { data: existing, error: existingError } = await supabase
    .from("user_profiles")
    .select("first_dashboard_feedback_prompt_seen_at")
    .eq("user_id", userId)
    .single();

  if (existingError) {
    if (isMissingFeedbackSchemaError(existingError)) {
      return promptSeenAt;
    }

    throw new Error(`Failed to reload feedback prompt state: ${existingError.message}`);
  }

  return (existing?.first_dashboard_feedback_prompt_seen_at as string | null) ?? promptSeenAt;
};

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = (await request.json().catch(() => null)) as
    | { action?: string; sentiment?: string; message?: string | null }
    | null;

  if (!payload?.action) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  try {
    const lifecycle = await loadFeedbackLifecycle(supabase, user.id);

    if (!lifecycle.schemaReady) {
      return NextResponse.json({ error: "Feedback schema is not available yet. Apply the latest database migration first." }, { status: 503 });
    }

    if (payload.action === "mark_seen") {
      if (!lifecycle.latestCompletedUploadAt || lifecycle.profile?.first_dashboard_feedback_submitted_at || lifecycle.profile?.first_dashboard_feedback_dismissed_at) {
        return NextResponse.json({ ok: true, promptSeenAt: lifecycle.profile?.first_dashboard_feedback_prompt_seen_at ?? null });
      }

      const promptSeenAt = await updatePromptSeenAtIfNeeded(
        supabase,
        user.id,
        lifecycle.profile?.first_dashboard_feedback_prompt_seen_at ?? null,
      );

      return NextResponse.json({ ok: true, promptSeenAt });
    }

    if (payload.action === "dismiss") {
      if (lifecycle.profile?.first_dashboard_feedback_submitted_at) {
        return NextResponse.json({ ok: true, dismissedAt: lifecycle.profile.first_dashboard_feedback_dismissed_at });
      }

      const promptSeenAt = await updatePromptSeenAtIfNeeded(
        supabase,
        user.id,
        lifecycle.profile?.first_dashboard_feedback_prompt_seen_at ?? null,
      );
      const dismissedAt = new Date().toISOString();

      const { error } = await supabase
        .from("user_profiles")
        .update({
          first_dashboard_feedback_prompt_seen_at: promptSeenAt,
          first_dashboard_feedback_dismissed_at: dismissedAt,
        })
        .eq("user_id", user.id)
        .is("first_dashboard_feedback_dismissed_at", null);

      if (error) {
        throw new Error(`Failed to dismiss feedback prompt: ${error.message}`);
      }

      return NextResponse.json({ ok: true, dismissedAt });
    }

    if (payload.action !== "submit") {
      return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
    }

    if (!SENTIMENT_VALUES.has(payload.sentiment ?? "")) {
      return NextResponse.json({ error: "Please choose a valid feedback option." }, { status: 400 });
    }

    if (!lifecycle.latestCompletedUploadAt) {
      return NextResponse.json({ error: "Feedback is only available after a successful upload." }, { status: 400 });
    }

    if (lifecycle.profile?.first_dashboard_feedback_submitted_at) {
      return NextResponse.json({
        ok: true,
        submittedAt: lifecycle.profile.first_dashboard_feedback_submitted_at,
      });
    }

    const dashboardSeenAt = await updatePromptSeenAtIfNeeded(
      supabase,
      user.id,
      lifecycle.profile?.first_dashboard_feedback_prompt_seen_at ?? null,
    );
    const submittedAt = new Date().toISOString();
    const message = (payload.message ?? "").trim() || null;

    const { error: feedbackError } = await supabase.from("user_feedback").upsert(
      {
        user_id: user.id,
        context: "first_dashboard",
        sentiment: payload.sentiment,
        message,
        dashboard_seen_at: dashboardSeenAt,
        upload_completed_at: lifecycle.latestCompletedUploadAt,
        submitted_at: submittedAt,
      },
      { onConflict: "user_id,context" },
    );

    if (feedbackError) {
      throw new Error(`Failed to save feedback: ${feedbackError.message}`);
    }

    const { error: profileError } = await supabase
      .from("user_profiles")
      .update({
        first_dashboard_feedback_prompt_seen_at: dashboardSeenAt,
        first_dashboard_feedback_submitted_at: submittedAt,
      })
      .eq("user_id", user.id);

    if (profileError) {
      throw new Error(`Failed to update feedback lifecycle: ${profileError.message}`);
    }

    await trackProductEvent(user.id, "first_dashboard_feedback_submitted", {
      sentiment: payload.sentiment,
      has_message: message != null,
    });

    return NextResponse.json({ ok: true, submittedAt });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Feedback request failed" },
      { status: 500 },
    );
  }
}
