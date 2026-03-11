export const WHOOP_FILE_KINDS = [
  "physiological_cycles",
  "sleeps",
  "workouts",
  "journal_entries",
] as const;

export type WhoopFileKind = (typeof WHOOP_FILE_KINDS)[number];

export const isWhoopFileKind = (value: string): value is WhoopFileKind =>
  WHOOP_FILE_KINDS.includes(value as WhoopFileKind);
