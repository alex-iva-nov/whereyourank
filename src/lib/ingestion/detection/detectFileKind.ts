import { HEADER_SIGNATURES } from "@/lib/ingestion/detection/headerSignatures";
import { WHOOP_FILE_KINDS, type WhoopFileKind } from "@/lib/ingestion/kinds";
import { normalizeHeaderLabel } from "@/lib/ingestion/csv/headerMap";
import type { DetectionResult } from "@/lib/ingestion/types";

export const detectFileKind = (headers: string[]): DetectionResult => {
  const normalized = new Set(headers.map((header) => normalizeHeaderLabel(header)));

  let bestKind: WhoopFileKind | null = null;
  let bestScore = 0;

  for (const kind of WHOOP_FILE_KINDS) {
    const signature = HEADER_SIGNATURES[kind];
    const matches = signature.filter((column) => normalized.has(normalizeHeaderLabel(column))).length;

    if (matches > bestScore) {
      bestScore = matches;
      bestKind = kind;
    }
  }

  if (!bestKind || bestScore < 2) {
    return {
      fileKind: null,
      confidence: "unknown",
      reasons: ["header signature did not match a supported WHOOP file kind"],
    };
  }

  return {
    fileKind: bestKind,
    confidence: "signature",
    reasons: [`matched ${bestScore} signature headers for ${bestKind}`],
  };
};
