import type { IngestionErrorItem } from "@/lib/ingestion/types";

export const validateRowShape = (
  rowNumber: number,
  required: Array<{ key: string; value: unknown }>,
): IngestionErrorItem[] => {
  const errors: IngestionErrorItem[] = [];

  for (const item of required) {
    if (item.value === null || item.value === undefined || item.value === "") {
      errors.push({
        code: "missing_required_field",
        message: `Missing required field: ${item.key}`,
        rowNumber,
        columnName: item.key,
      });
    }
  }

  return errors;
};
