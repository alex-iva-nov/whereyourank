import type { DbClient, IngestionErrorItem, WhoopFileKind } from "@/lib/ingestion/types";

export const persistErrors = async (
  db: DbClient,
  input: {
    ingestionRunId: string;
    uploadId: string;
    userId: string;
    fileKind: WhoopFileKind | null;
    errors: IngestionErrorItem[];
  },
): Promise<void> => {
  if (input.errors.length === 0) return;

  const payload = input.errors.slice(0, 500).map((item) => ({
    ingestion_run_id: input.ingestionRunId,
    upload_id: input.uploadId,
    user_id: input.userId,
    file_kind: input.fileKind,
    row_number: item.rowNumber,
    error_code: item.code,
    error_message: item.message,
    raw_context: item.rawContext ?? null,
  }));

  const { error } = await db.from("ingestion_errors").insert(payload);

  if (error) {
    throw new Error(`Failed to persist ingestion errors: ${error.message}`);
  }
};
