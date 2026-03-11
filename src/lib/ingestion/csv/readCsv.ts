import { parse } from "csv-parse/sync";

import type { CsvData } from "@/lib/ingestion/types";

const detectDelimiter = (input: string): ";" | "," => {
  const firstLine = input.split(/\r?\n/, 1)[0] ?? "";
  const semicolonCount = (firstLine.match(/;/g) ?? []).length;
  const commaCount = (firstLine.match(/,/g) ?? []).length;
  return semicolonCount > commaCount ? ";" : ",";
};

export const readCsv = (input: string): CsvData => {
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

  return {
    delimiter,
    headers,
    rows,
  };
};
