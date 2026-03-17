import { createHash } from "node:crypto";

import { runIngestionForUpload } from "@/lib/ingestion/orchestrator";
import { persistUpload } from "@/lib/ingestion/persistence/persistUpload";
import type { DbClient, IngestionBatchResult, IngestionFileResult, NormalizedUploadInput } from "@/lib/ingestion/types";

const PARSER_VERSION = "whoop-v1";

export const runIngestion = async (
  db: DbClient,
  userId: string,
  files: NormalizedUploadInput[],
): Promise<IngestionBatchResult> => {
  const fileResults: IngestionFileResult[] = [];

  for (const file of files) {
    const upload = await persistUpload.create(db, {
      userId,
      storagePath: file.storagePath,
      originalFilename: file.filename,
      fileSizeBytes: file.bytes.byteLength,
      sha256: createHash("sha256").update(file.bytes).digest("hex"),
      detectedFileKind: null,
    });

    await persistUpload.setStatus(db, upload.id, userId, "processing", null);

    const result = await runIngestionForUpload(db, {
      userId,
      upload,
      csv: file.csv,
      parserVersion: PARSER_VERSION,
    });

    await persistUpload.setStatus(
      db,
      upload.id,
      userId,
      result.status === "completed" ? "completed" : "failed",
      result.fileKind,
    );

    fileResults.push(result);
  }

  const uploadedFiles = fileResults.length;
  const failedFiles = fileResults.filter((item) => item.status === "failed").length;

  return {
    status: uploadedFiles === 0 ? "failed" : failedFiles === 0 ? "completed" : "partial",
    uploadedFiles,
    failedFiles,
    fileResults,
  };
};
