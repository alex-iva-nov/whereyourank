import { createHash } from "node:crypto";

export const fingerprint = (parts: unknown[]): string => {
  const normalized = parts
    .map((part) => (part === null || part === undefined ? "" : String(part)))
    .join("|");

  return createHash("sha256").update(normalized).digest("hex");
};

export const hashRowObject = (value: Record<string, unknown>): string => {
  const keys = Object.keys(value).sort();
  const normalized: Record<string, unknown> = {};

  for (const key of keys) {
    normalized[key] = value[key] ?? null;
  }

  return createHash("sha256").update(JSON.stringify(normalized)).digest("hex");
};
