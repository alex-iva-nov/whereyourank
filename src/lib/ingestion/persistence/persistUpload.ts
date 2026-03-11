import type { DbClient, UploadRecord, WhoopFileKind } from "@/lib/ingestion/types";

export const persistUpload = {
  async create(
    db: DbClient,
    input: {
      userId: string;
      storagePath: string;
      originalFilename: string;
      fileSizeBytes: number;
      sha256: string;
      detectedFileKind: WhoopFileKind | null;
    },
  ): Promise<UploadRecord> {
    const { data, error } = await db
      .from("uploads")
      .upsert(
        {
          user_id: input.userId,
          storage_path: input.storagePath,
          original_filename: input.originalFilename,
          file_size_bytes: input.fileSizeBytes,
          sha256: input.sha256,
          upload_status: "uploaded",
          detected_file_kind: input.detectedFileKind,
        },
        {
          onConflict: "user_id,sha256",
          ignoreDuplicates: false,
        },
      )
      .select("id,user_id,storage_path,original_filename")
      .single();

    if (error || !data) {
      throw new Error(`Failed to create upload record: ${error?.message ?? "unknown"}`);
    }

    return data as UploadRecord;
  },

  async setStatus(
    db: DbClient,
    uploadId: string,
    userId: string,
    status: "processing" | "completed" | "failed",
    detectedFileKind?: WhoopFileKind | null,
  ): Promise<void> {
    const payload: Record<string, unknown> = {
      upload_status: status,
      processed_at: status === "completed" || status === "failed" ? new Date().toISOString() : null,
    };

    if (detectedFileKind !== undefined) {
      payload.detected_file_kind = detectedFileKind;
    }

    const { error } = await db.from("uploads").update(payload).eq("id", uploadId).eq("user_id", userId);

    if (error) {
      throw new Error(`Failed to update upload status: ${error.message}`);
    }
  },
};
