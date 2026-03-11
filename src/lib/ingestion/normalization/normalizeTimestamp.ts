import { normalizeText } from "@/lib/ingestion/normalization/normalizeText";

const withOffset = (timestamp: string, timezone: string | null): string => {
  if (/[zZ]$|[+-]\d{2}:?\d{2}$/.test(timestamp)) {
    return timestamp;
  }

  const tz = (timezone ?? "").toUpperCase();
  if (tz === "UTCZ" || tz === "UTC") {
    return `${timestamp}Z`;
  }

  return `${timestamp}Z`;
};

export const normalizeTimestamp = (
  value: string | null | undefined,
  timezone: string | null,
): string | null => {
  const text = normalizeText(value);
  if (!text) return null;

  const normalized = text.includes("T") ? text : text.replace(" ", "T");
  const candidate = withOffset(normalized, timezone);
  const parsed = Date.parse(candidate);

  if (Number.isNaN(parsed)) return null;

  return new Date(parsed).toISOString();
};
