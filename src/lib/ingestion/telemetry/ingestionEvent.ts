import type { IngestionTelemetry } from "@/lib/ingestion/types";

export type IngestionEvent = {
  type: "ingestion.completed" | "ingestion.failed";
  telemetry: IngestionTelemetry;
};

export const toIngestionEvent = (
  status: "completed" | "failed",
  telemetry: IngestionTelemetry,
): IngestionEvent => ({
  type: status === "completed" ? "ingestion.completed" : "ingestion.failed",
  telemetry,
});
