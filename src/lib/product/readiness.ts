export const REQUIRED_WHOOP_FILE_KINDS = [
  "physiological_cycles",
  "sleeps",
  "workouts",
  "journal_entries",
] as const;

export type RequiredWhoopFileKind = (typeof REQUIRED_WHOOP_FILE_KINDS)[number];

export type UploadReadiness = {
  uploadedKinds: RequiredWhoopFileKind[];
  missingKinds: RequiredWhoopFileKind[];
  isCompleteBundle: boolean;
};

export const getUploadReadinessForUser = async (supabase: any, userId: string): Promise<UploadReadiness> => {
  const { data, error } = await supabase
    .from("uploads")
    .select("detected_file_kind")
    .eq("user_id", userId)
    .eq("upload_status", "completed")
    .not("detected_file_kind", "is", null);

  if (error) {
    throw new Error(`Failed to load uploaded file kinds: ${error.message}`);
  }

  const uploadedSet = new Set<RequiredWhoopFileKind>();

  for (const row of (data ?? []) as Array<{ detected_file_kind: string | null }>) {
    const kind = row.detected_file_kind;
    if (kind && REQUIRED_WHOOP_FILE_KINDS.includes(kind as RequiredWhoopFileKind)) {
      uploadedSet.add(kind as RequiredWhoopFileKind);
    }
  }

  const uploadedKinds = REQUIRED_WHOOP_FILE_KINDS.filter((kind) => uploadedSet.has(kind));
  const missingKinds = REQUIRED_WHOOP_FILE_KINDS.filter((kind) => !uploadedSet.has(kind));

  return {
    uploadedKinds,
    missingKinds,
    isCompleteBundle: missingKinds.length === 0,
  };
};

export const getAvailableMetricKeysForUser = async (supabase: any, userId: string): Promise<string[]> => {
  const today = new Date().toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from("user_metric_30d_aggregates")
    .select("metric_key")
    .eq("user_id", userId)
    .eq("window_end_date", today);

  if (error) {
    throw new Error(`Failed to load user metrics availability: ${error.message}`);
  }

  return Array.from(new Set(((data ?? []) as Array<{ metric_key: string }>).map((row) => row.metric_key))).sort();
};
