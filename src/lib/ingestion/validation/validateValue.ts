import type { IngestionErrorItem, ValidationResult } from "@/lib/ingestion/types";

const asError = (
  code: IngestionErrorItem["code"],
  rowNumber: number,
  fieldName: string,
  rawValue: string | null | undefined,
): IngestionErrorItem => ({
  code,
  message: `Invalid ${fieldName}: ${rawValue ?? "null"}`,
  rowNumber,
  columnName: fieldName,
});

export const validateValue = {
  number(
    rowNumber: number,
    fieldName: string,
    rawValue: string | null | undefined,
    parsed: number | null,
    required: boolean,
  ): ValidationResult<number | null> {
    if ((rawValue === null || rawValue === undefined || String(rawValue).trim() === "") && !required) {
      return { ok: true, value: null };
    }

    if (parsed === null) {
      return { ok: false, error: asError("invalid_number", rowNumber, fieldName, rawValue) };
    }

    return { ok: true, value: parsed };
  },

  boolean(
    rowNumber: number,
    fieldName: string,
    rawValue: string | null | undefined,
    parsed: boolean | null,
    required: boolean,
  ): ValidationResult<boolean | null> {
    if ((rawValue === null || rawValue === undefined || String(rawValue).trim() === "") && !required) {
      return { ok: true, value: null };
    }

    if (parsed === null) {
      return { ok: false, error: asError("invalid_boolean", rowNumber, fieldName, rawValue) };
    }

    return { ok: true, value: parsed };
  },

  timestamp(
    rowNumber: number,
    fieldName: string,
    rawValue: string | null | undefined,
    parsed: string | null,
    required: boolean,
  ): ValidationResult<string | null> {
    if ((rawValue === null || rawValue === undefined || String(rawValue).trim() === "") && !required) {
      return { ok: true, value: null };
    }

    if (parsed === null) {
      return { ok: false, error: asError("invalid_timestamp", rowNumber, fieldName, rawValue) };
    }

    return { ok: true, value: parsed };
  },
};
