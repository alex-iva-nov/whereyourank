import { normalizeText } from "@/lib/ingestion/normalization/normalizeText";

export const normalizeNumber = (value: string | null | undefined): number | null => {
  const text = normalizeText(value);
  if (!text) return null;

  const normalized = text.replace(',', '.');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
};

export const normalizeInteger = (value: string | null | undefined): number | null => {
  const num = normalizeNumber(value);
  if (num === null) return null;
  return Math.round(num);
};
