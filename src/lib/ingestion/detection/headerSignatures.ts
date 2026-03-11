import type { WhoopFileKind } from "@/lib/ingestion/kinds";

export const HEADER_SIGNATURES: Record<WhoopFileKind, string[]> = {
  physiological_cycles: [
    "cycle start time",
    "recovery score %",
    "heart rate variability (ms)",
    "sleep onset",
  ],
  sleeps: ["cycle start time", "sleep onset", "wake onset", "nap"],
  workouts: ["workout start time", "workout end time", "activity name", "activity strain"],
  journal_entries: ["question text", "answered yes", "notes"],
};
