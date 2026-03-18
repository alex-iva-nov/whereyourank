import { parse } from "csv-parse/sync";

import type { CsvData } from "@/lib/ingestion/types";

const MAX_CSV_COLUMNS = 250;
const MAX_CSV_ROWS = 50_000;
const MAX_CSV_CELL_LENGTH = 10_000;
const MAX_CSV_LINE_LENGTH = 100_000;
const MAX_CONTROL_CHAR_RATIO = 0.001;

const detectDelimiter = (input: string): ";" | "," => {
  const firstLine = input.split(/\r?\n/, 1)[0] ?? "";
  const semicolonCount = (firstLine.match(/;/g) ?? []).length;
  const commaCount = (firstLine.match(/,/g) ?? []).length;
  return semicolonCount > commaCount ? ";" : ",";
};

const assertSafeCsvInput = (input: string): void => {
  if (input.includes("\u0000")) {
    throw new Error("CSV contains binary content and could not be processed safely.");
  }

  const controlChars = input.match(/[\u0001-\u0008\u000B\u000C\u000E-\u001F\u007F]/g) ?? [];
  if (input.length > 0 && controlChars.length / input.length > MAX_CONTROL_CHAR_RATIO) {
    throw new Error("CSV contains too many unexpected control characters.");
  }

  for (const line of input.split(/\r?\n/)) {
    if (line.length > MAX_CSV_LINE_LENGTH) {
      throw new Error("CSV contains an unexpectedly long row.");
    }
  }
};

const assertSafeCsvShape = (headers: string[], rows: Array<Record<string, string | null | undefined>>): void => {
  if (headers.length === 0) {
    throw new Error("CSV is missing a header row.");
  }

  if (headers.length > MAX_CSV_COLUMNS) {
    throw new Error(`CSV has too many columns. Maximum supported columns: ${MAX_CSV_COLUMNS}.`);
  }

  if (rows.length > MAX_CSV_ROWS) {
    throw new Error(`CSV has too many rows. Maximum supported rows: ${MAX_CSV_ROWS}.`);
  }

  for (const header of headers) {
    if (header.length > MAX_CSV_CELL_LENGTH) {
      throw new Error("CSV contains an unexpectedly long header value.");
    }
  }

  for (const row of rows) {
    for (const value of Object.values(row)) {
      if (typeof value === "string" && value.length > MAX_CSV_CELL_LENGTH) {
        throw new Error("CSV contains an unexpectedly long cell value.");
      }
    }
  }
};

export const readCsv = (input: string): CsvData => {
  assertSafeCsvInput(input);
  const delimiter = detectDelimiter(input);

  const rows = parse(input, {
    delimiter,
    columns: true,
    bom: true,
    skip_empty_lines: true,
    trim: true,
    relax_column_count: true,
  }) as Array<Record<string, string | null | undefined>>;

  const firstRow = rows[0] ?? {};
  const headers = Object.keys(firstRow);
  assertSafeCsvShape(headers, rows);

  return {
    delimiter,
    headers,
    rows,
  };
};
