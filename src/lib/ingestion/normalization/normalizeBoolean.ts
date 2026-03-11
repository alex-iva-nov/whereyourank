import { normalizeText } from "@/lib/ingestion/normalization/normalizeText";

export const normalizeBoolean = (value: string | null | undefined): boolean | null => {
  const text = normalizeText(value);
  if (!text) return null;

  const normalized = text.toLowerCase();
  if (["true", "yes", "1"].includes(normalized)) return true;
  if (["false", "no", "0"].includes(normalized)) return false;
  return null;
};
