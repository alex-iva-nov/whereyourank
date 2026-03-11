import { normalizeText } from "@/lib/ingestion/normalization/normalizeText";

export const normalizeTimezone = (value: string | null | undefined): string | null => {
  const text = normalizeText(value);
  if (!text) return null;
  return text.toUpperCase();
};
