import { buildHeaderMap, REQUIRED_HEADERS_BY_KIND } from "../csv/headerMap.ts";
import type { IngestionErrorItem } from "../types.ts";
import type { WhoopFileKind } from "../kinds.ts";

export const validateHeaders = (headers: string[], fileKind: WhoopFileKind): IngestionErrorItem[] => {
  const map = buildHeaderMap(headers, fileKind);
  const errors: IngestionErrorItem[] = [];

  for (const required of REQUIRED_HEADERS_BY_KIND[fileKind]) {
    if (!map[required]) {
      errors.push({
        code: "missing_required_header",
        message: `Missing required header: ${required}`,
        rowNumber: null,
        columnName: required,
      });
    }
  }

  return errors;
};
