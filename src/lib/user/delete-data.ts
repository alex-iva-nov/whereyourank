import { recomputeAnalyticsForAll } from "@/lib/analytics/recompute";
import { publicEnv } from "@/lib/env";
import { supabaseAdmin } from "@/lib/supabase/admin-client";

const deleteFromTableByUser = async (table: string, userId: string) => {
  const { error } = await supabaseAdmin.from(table).delete().eq("user_id", userId);
  if (error) {
    throw new Error(`Failed deleting from ${table}: ${error.message}`);
  }
};

const deleteByIn = async (table: string, column: string, values: string[]) => {
  if (values.length === 0) return;
  const { error } = await supabaseAdmin.from(table).delete().in(column, values);
  if (error) {
    throw new Error(`Failed deleting from ${table}: ${error.message}`);
  }
};

const logPrivacyEvent = async (userId: string, eventType: string, eventPayload: Record<string, unknown>) => {
  // NOTE: Keep privacy event payload minimal and avoid sensitive raw content.
  await supabaseAdmin.from("privacy_events").insert({
    user_id: userId,
    event_type: eventType,
    event_payload: eventPayload,
  });
};

const deleteStorageFolder = async (userId: string) => {
  const bucket = publicEnv.storageBucketRaw;
  const pageSize = 100;
  let offset = 0;

  while (true) {
    const { data, error } = await supabaseAdmin.storage
      .from(bucket)
      .list(userId, { limit: pageSize, offset, sortBy: { column: "name", order: "asc" } });

    if (error) {
      throw new Error(`Failed to list storage objects for deletion: ${error.message}`);
    }

    if (!data || data.length === 0) {
      break;
    }

    const files = data.filter((item) => item.id).map((item) => `${userId}/${item.name}`);

    if (files.length > 0) {
      const { error: removeError } = await supabaseAdmin.storage.from(bucket).remove(files);
      if (removeError) {
        throw new Error(`Failed to remove storage objects: ${removeError.message}`);
      }
    }

    if (data.length < pageSize) {
      break;
    }

    offset += pageSize;
  }
};

const deleteLegacyIngestionRows = async (userId: string) => {
  const { data: uploadFilesData, error: uploadFilesError } = await supabaseAdmin
    .from("upload_files")
    .select("id")
    .eq("user_id", userId);

  if (uploadFilesError) {
    throw new Error(`Failed loading legacy upload files: ${uploadFilesError.message}`);
  }

  const uploadFileIds = ((uploadFilesData ?? []) as Array<{ id: string }>).map((row) => row.id);

  if (uploadFileIds.length > 0) {
    const { data: parseJobsData, error: parseJobsLoadError } = await supabaseAdmin
      .from("parse_jobs")
      .select("id")
      .in("upload_file_id", uploadFileIds);

    if (parseJobsLoadError) {
      throw new Error(`Failed loading legacy parse jobs: ${parseJobsLoadError.message}`);
    }

    const parseJobIds = ((parseJobsData ?? []) as Array<{ id: string }>).map((row) => row.id);

    await deleteByIn("parse_errors", "parse_job_id", parseJobIds);
    await deleteByIn("parse_jobs", "id", parseJobIds);
  }

  await deleteFromTableByUser("whoop_journal_entries", userId);
  await deleteFromTableByUser("whoop_workouts", userId);
  await deleteFromTableByUser("whoop_sleeps", userId);
  await deleteFromTableByUser("whoop_physiological_cycles", userId);

  await deleteByIn("upload_files", "id", uploadFileIds);
  await deleteFromTableByUser("upload_batches", userId);
};

export const deleteUserDataForMvp = async (userId: string) => {
  const { data: req, error: reqError } = await supabaseAdmin
    .from("deletion_requests")
    .insert({ user_id: userId, status: "processing" })
    .select("id")
    .single();

  const deletionRequestId = req?.id as string | undefined;

  if (reqError || !deletionRequestId) {
    throw new Error(`Failed to create deletion request: ${reqError?.message ?? "unknown"}`);
  }

  await logPrivacyEvent(userId, "delete_my_data_requested", {
    deletion_request_id: deletionRequestId,
  });

  try {
    await deleteStorageFolder(userId);

    await deleteFromTableByUser("ingestion_errors", userId);
    await deleteFromTableByUser("ingestion_runs", userId);

    await deleteFromTableByUser("whoop_journal_facts", userId);
    await deleteFromTableByUser("whoop_workout_facts", userId);
    await deleteFromTableByUser("whoop_sleep_facts", userId);
    await deleteFromTableByUser("whoop_cycle_facts", userId);

    await deleteFromTableByUser("uploads", userId);

    await deleteLegacyIngestionRows(userId);

    await deleteFromTableByUser("user_metric_percentiles", userId);
    await deleteFromTableByUser("user_metric_rollups", userId);
    await deleteFromTableByUser("user_metric_daily", userId);

    await deleteFromTableByUser("user_metric_30d_aggregates", userId);
    await deleteFromTableByUser("user_daily_metrics", userId);

    await deleteFromTableByUser("consent_events", userId);
    await deleteFromTableByUser("user_profiles", userId);

    try {
      await recomputeAnalyticsForAll();
    } catch {
      // Best effort cleanup for cohort aggregates.
    }

    const { error: doneError } = await supabaseAdmin
      .from("deletion_requests")
      .update({ status: "completed", processed_at: new Date().toISOString() })
      .eq("id", deletionRequestId)
      .eq("user_id", userId);

    if (doneError) {
      throw new Error(`Failed to finalize deletion request: ${doneError.message}`);
    }

    await logPrivacyEvent(userId, "delete_my_data_completed", {
      deletion_request_id: deletionRequestId,
    });

    return { deletionRequestId, status: "completed" as const };
  } catch (error) {
    await supabaseAdmin
      .from("deletion_requests")
      .update({
        status: "failed",
        processed_at: new Date().toISOString(),
        failure_reason: error instanceof Error ? error.message : "Unknown deletion error",
      })
      .eq("id", deletionRequestId)
      .eq("user_id", userId);

    await logPrivacyEvent(userId, "delete_my_data_failed", {
      deletion_request_id: deletionRequestId,
      error: error instanceof Error ? error.message : "Unknown deletion error",
    });

    throw error;
  }
};
