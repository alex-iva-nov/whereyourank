import type { IngestionErrorCode } from "@/lib/ingestion/types";

export const ERROR_CATALOG: Record<IngestionErrorCode, { retryable: boolean }> = {
  missing_required_header: { retryable: false },
  unknown_file_kind: { retryable: false },
  invalid_timestamp: { retryable: false },
  invalid_number: { retryable: false },
  invalid_boolean: { retryable: false },
  missing_required_field: { retryable: false },
  duplicate_in_batch: { retryable: false },
  db_upsert_failed: { retryable: true },
  invalid_row_shape: { retryable: false },
  unsafe_csv_content: { retryable: false },
};
