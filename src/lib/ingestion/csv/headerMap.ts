import type { WhoopFileKind } from "../kinds.ts";

export const normalizeHeaderLabel = (value: string): string =>
  value.trim().toLowerCase().replace(/\s+/g, " ");

const COMMON_ALIASES: Record<string, string[]> = {
  "cycle start time": ["cycle start time", "cycle_start_time", "cycle start"],
  "cycle end time": ["cycle end time", "cycle_end_time", "cycle end"],
  "cycle timezone": ["cycle timezone", "cycle timezone ", "utcz", "timezone"],
};

const PHYSIOLOGICAL_ALIASES: Record<string, string[]> = {
  ...COMMON_ALIASES,
  "recovery score %": ["recovery score %", "recovery score"],
  "resting heart rate (bpm)": ["resting heart rate (bpm)", "resting heart rate"],
  "heart rate variability (ms)": ["heart rate variability (ms)", "hrv", "hrv (ms)"],
  "skin temp (celsius)": ["skin temp (celsius)", "skin temp"],
  "blood oxygen %": ["blood oxygen %", "blood oxygen"],
  "day strain": ["day strain"],
  "energy burned (cal)": ["energy burned (cal)", "energy burned"],
  "max hr (bpm)": ["max hr (bpm)", "max hr"],
  "average hr (bpm)": ["average hr (bpm)", "average hr"],
  "sleep onset": ["sleep onset"],
  "wake onset": ["wake onset"],
  "sleep performance %": ["sleep performance %", "sleep performance"],
  "respiratory rate (rpm)": ["respiratory rate (rpm)", "respiratory rate"],
  "asleep duration (min)": ["asleep duration (min)", "asleep duration"],
  "in bed duration (min)": ["in bed duration (min)", "in bed duration"],
  "light sleep duration (min)": ["light sleep duration (min)", "light sleep duration"],
  "deep (sws) duration (min)": ["deep (sws) duration (min)", "deep sleep duration (min)"],
  "rem duration (min)": ["rem duration (min)", "rem sleep duration (min)"],
  "awake duration (min)": ["awake duration (min)", "awake duration"],
  "sleep need (min)": ["sleep need (min)", "sleep need"],
  "sleep debt (min)": ["sleep debt (min)", "sleep debt"],
  "sleep efficiency %": ["sleep efficiency %", "sleep efficiency"],
  "sleep consistency %": ["sleep consistency %", "sleep consistency"],
};

const SLEEP_ALIASES: Record<string, string[]> = {
  ...COMMON_ALIASES,
  "sleep onset": ["sleep onset"],
  "wake onset": ["wake onset"],
  "sleep performance %": ["sleep performance %", "sleep performance"],
  "respiratory rate (rpm)": ["respiratory rate (rpm)", "respiratory rate"],
  "asleep duration (min)": ["asleep duration (min)", "asleep duration"],
  "in bed duration (min)": ["in bed duration (min)", "in bed duration"],
  "light sleep duration (min)": ["light sleep duration (min)", "light sleep duration"],
  "deep (sws) duration (min)": ["deep (sws) duration (min)", "deep sleep duration (min)"],
  "rem duration (min)": ["rem duration (min)", "rem sleep duration (min)"],
  "awake duration (min)": ["awake duration (min)", "awake duration"],
  "sleep need (min)": ["sleep need (min)", "sleep need"],
  "sleep debt (min)": ["sleep debt (min)", "sleep debt"],
  "sleep efficiency %": ["sleep efficiency %", "sleep efficiency"],
  "sleep consistency %": ["sleep consistency %", "sleep consistency"],
  nap: ["nap"],
};

const WORKOUT_ALIASES: Record<string, string[]> = {
  ...COMMON_ALIASES,
  "workout start time": ["workout start time", "workout start"],
  "workout end time": ["workout end time", "workout end"],
  "duration (min)": ["duration (min)", "duration"],
  "activity name": ["activity name", "activity"],
  "activity strain": ["activity strain", "strain"],
  "energy burned (cal)": ["energy burned (cal)", "energy burned"],
  "max hr (bpm)": ["max hr (bpm)", "max hr"],
  "average hr (bpm)": ["average hr (bpm)", "average hr"],
  "hr zone 1 %": ["hr zone 1 %", "hr zone 1"],
  "hr zone 2 %": ["hr zone 2 %", "hr zone 2"],
  "hr zone 3 %": ["hr zone 3 %", "hr zone 3"],
  "hr zone 4 %": ["hr zone 4 %", "hr zone 4"],
  "hr zone 5 %": ["hr zone 5 %", "hr zone 5"],
  "gps enabled": ["gps enabled"],
};

const JOURNAL_ALIASES: Record<string, string[]> = {
  ...COMMON_ALIASES,
  "question text": ["question text", "question"],
  "answered yes": ["answered yes", "answer yes", "answered"],
  notes: ["notes", "note"],
};

const ALIASES_BY_KIND: Record<WhoopFileKind, Record<string, string[]>> = {
  physiological_cycles: PHYSIOLOGICAL_ALIASES,
  sleeps: SLEEP_ALIASES,
  workouts: WORKOUT_ALIASES,
  journal_entries: JOURNAL_ALIASES,
};

export const REQUIRED_HEADERS_BY_KIND: Record<WhoopFileKind, string[]> = {
  physiological_cycles: [
    "cycle start time",
    "cycle timezone",
    "recovery score %",
    "resting heart rate (bpm)",
    "heart rate variability (ms)",
  ],
  sleeps: ["cycle start time", "cycle timezone", "sleep onset", "wake onset", "nap"],
  workouts: [
    "cycle start time",
    "cycle timezone",
    "workout start time",
    "workout end time",
    "activity name",
  ],
  journal_entries: ["cycle start time", "cycle timezone", "question text", "answered yes"],
};

export type HeaderMap = Record<string, string | null>;

export const buildHeaderMap = (headers: string[], fileKind: WhoopFileKind): HeaderMap => {
  const aliases = ALIASES_BY_KIND[fileKind];
  const normalizedHeaders = headers.map((header) => normalizeHeaderLabel(header));

  const mapped: HeaderMap = {};

  for (const canonicalHeader of Object.keys(aliases)) {
    const aliasCandidates = aliases[canonicalHeader].map((alias) => normalizeHeaderLabel(alias));
    const matchedIndex = normalizedHeaders.findIndex((header) => aliasCandidates.includes(header));
    mapped[canonicalHeader] = matchedIndex >= 0 ? headers[matchedIndex] : null;
  }

  return mapped;
};

export const getMappedValue = (
  row: Record<string, string | null | undefined>,
  headerMap: HeaderMap,
  canonicalHeader: string,
): string | null => {
  const sourceHeader = headerMap[canonicalHeader];
  if (!sourceHeader) return null;
  return row[sourceHeader] ?? null;
};
