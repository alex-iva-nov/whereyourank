export type DeleteDataDeps = {
  db: any;
  storageBucketRaw: string;
  now: () => string;
};

type StorageListItem = {
  id?: string;
  name: string;
};

const deleteFromTableByUser = async (deps: DeleteDataDeps, table: string, userId: string) => {
  const { error } = await deps.db.from(table).delete().eq("user_id", userId);
  if (error) {
    throw new Error(`Failed deleting from ${table}: ${error.message}`);
  }
};

const deleteByIn = async (deps: DeleteDataDeps, table: string, column: string, values: string[]) => {
  if (values.length === 0) return;
  const { error } = await deps.db.from(table).delete().in(column, values);
  if (error) {
    throw new Error(`Failed deleting from ${table}: ${error.message}`);
  }
};

const logPrivacyEvent = async (
  deps: DeleteDataDeps,
  userId: string,
  eventType: string,
  eventPayload: Record<string, unknown>,
) => {
  await deps.db.from("privacy_events").insert({
    user_id: userId,
    event_type: eventType,
    event_payload: eventPayload,
  });
};

const deleteStorageFolder = async (deps: DeleteDataDeps, userId: string) => {
  const bucket = deps.storageBucketRaw;
  const pageSize = 100;
  let offset = 0;

  while (true) {
    const { data, error } = await deps.db.storage
      .from(bucket)
      .list(userId, { limit: pageSize, offset, sortBy: { column: "name", order: "asc" } });

    if (error) {
      throw new Error(`Failed to list storage objects for deletion: ${error.message}`);
    }

    if (!data || data.length === 0) {
      break;
    }

    const files = (data as StorageListItem[])
      .filter((item) => item.id)
      .map((item) => `${userId}/${item.name}`);

    if (files.length > 0) {
      const { error: removeError } = await deps.db.storage.from(bucket).remove(files);
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

const deleteLegacyIngestionRows = async (deps: DeleteDataDeps, userId: string) => {
  const { data: uploadFilesData, error: uploadFilesError } = await deps.db
    .from("upload_files")
    .select("id")
    .eq("user_id", userId);

  if (uploadFilesError) {
    throw new Error(`Failed loading legacy upload files: ${uploadFilesError.message}`);
  }

  const uploadFileIds = ((uploadFilesData ?? []) as Array<{ id: string }>).map((row) => row.id);

  if (uploadFileIds.length > 0) {
    const { data: parseJobsData, error: parseJobsLoadError } = await deps.db
      .from("parse_jobs")
      .select("id")
      .in("upload_file_id", uploadFileIds);

    if (parseJobsLoadError) {
      throw new Error(`Failed loading legacy parse jobs: ${parseJobsLoadError.message}`);
    }

    const parseJobIds = ((parseJobsData ?? []) as Array<{ id: string }>).map((row) => row.id);

    await deleteByIn(deps, "parse_errors", "parse_job_id", parseJobIds);
    await deleteByIn(deps, "parse_jobs", "id", parseJobIds);
  }

  await deleteFromTableByUser(deps, "whoop_journal_entries", userId);
  await deleteFromTableByUser(deps, "whoop_workouts", userId);
  await deleteFromTableByUser(deps, "whoop_sleeps", userId);
  await deleteFromTableByUser(deps, "whoop_physiological_cycles", userId);

  await deleteByIn(deps, "upload_files", "id", uploadFileIds);
  await deleteFromTableByUser(deps, "upload_batches", userId);
};

const loadAggregateWindowDatesForUser = async (deps: DeleteDataDeps, userId: string): Promise<string[]> => {
  const { data, error } = await deps.db
    .from("user_metric_30d_aggregates")
    .select("window_end_date")
    .eq("user_id", userId);

  if (error) {
    throw new Error(`Failed loading aggregate windows for deletion: ${error.message}`);
  }

  return Array.from(
    new Set(
      ((data ?? []) as Array<{ window_end_date: string | null }>)
        .map((row) => row.window_end_date)
        .filter((value): value is string => Boolean(value)),
    ),
  );
};

const invalidateCohortSnapshotsForWindows = async (deps: DeleteDataDeps, windowEndDates: string[]) => {
  if (windowEndDates.length === 0) {
    return;
  }

  const { error } = await deps.db
    .from("cohort_metric_percentiles")
    .delete()
    .in("window_end_date", windowEndDates);

  if (error) {
    throw new Error(`Failed to invalidate cohort percentile snapshots: ${error.message}`);
  }
};

export const createDeleteUserDataForMvp = (deps: DeleteDataDeps) => async (userId: string) => {
  const { data: req, error: reqError } = await deps.db
    .from("deletion_requests")
    .insert({ user_id: userId, status: "processing" })
    .select("id")
    .single();

  const deletionRequestId = req?.id as string | undefined;

  if (reqError || !deletionRequestId) {
    throw new Error(`Failed to create deletion request: ${reqError?.message ?? "unknown"}`);
  }

  await logPrivacyEvent(deps, userId, "delete_my_data_requested", {
    deletion_request_id: deletionRequestId,
  });

  try {
    const aggregateWindowDates = await loadAggregateWindowDatesForUser(deps, userId);

    await deleteStorageFolder(deps, userId);

    await deleteFromTableByUser(deps, "ingestion_errors", userId);
    await deleteFromTableByUser(deps, "ingestion_runs", userId);
    await deleteFromTableByUser(deps, "whoop_journal_facts", userId);
    await deleteFromTableByUser(deps, "whoop_workout_facts", userId);
    await deleteFromTableByUser(deps, "whoop_sleep_facts", userId);
    await deleteFromTableByUser(deps, "whoop_cycle_facts", userId);
    await deleteFromTableByUser(deps, "uploads", userId);

    await deleteLegacyIngestionRows(deps, userId);

    await deleteFromTableByUser(deps, "user_metric_percentiles", userId);
    await deleteFromTableByUser(deps, "user_metric_rollups", userId);
    await deleteFromTableByUser(deps, "user_metric_daily", userId);
    await deleteFromTableByUser(deps, "user_metric_30d_aggregates", userId);
    await deleteFromTableByUser(deps, "user_daily_metrics", userId);
    await deleteFromTableByUser(deps, "consent_events", userId);
    await deleteFromTableByUser(deps, "user_profiles", userId);

    await invalidateCohortSnapshotsForWindows(deps, aggregateWindowDates);

    const { error: doneError } = await deps.db
      .from("deletion_requests")
      .update({ status: "completed", processed_at: deps.now() })
      .eq("id", deletionRequestId)
      .eq("user_id", userId);

    if (doneError) {
      throw new Error(`Failed to finalize deletion request: ${doneError.message}`);
    }

    await logPrivacyEvent(deps, userId, "delete_my_data_completed", {
      deletion_request_id: deletionRequestId,
    });

    return { deletionRequestId, status: "completed" as const };
  } catch (error) {
    await deps.db
      .from("deletion_requests")
      .update({
        status: "failed",
        processed_at: deps.now(),
        failure_reason: error instanceof Error ? error.message : "Unknown deletion error",
      })
      .eq("id", deletionRequestId)
      .eq("user_id", userId);

    await logPrivacyEvent(deps, userId, "delete_my_data_failed", {
      deletion_request_id: deletionRequestId,
      error: error instanceof Error ? error.message : "Unknown deletion error",
    });

    throw error;
  }
};
