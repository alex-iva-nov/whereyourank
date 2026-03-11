import type { CsvRow } from "@/lib/ingestion/types";

export type CsvRowWithNumber = {
  rowNumber: number;
  row: CsvRow;
};

export function* rowIterator(rows: CsvRow[], startAt = 2): Generator<CsvRowWithNumber> {
  for (let index = 0; index < rows.length; index += 1) {
    yield {
      rowNumber: startAt + index,
      row: rows[index],
    };
  }
}
