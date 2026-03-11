import { fingerprint } from "@/lib/ingestion/fingerprints/fingerprint";

export const naturalKeys = {
  sleeps: (userId: string, sleepOnsetAt: string, wakeOnsetAt: string, nap: boolean): string =>
    fingerprint(["sleep", userId, sleepOnsetAt, wakeOnsetAt, nap]),

  workouts: (
    userId: string,
    workoutStartAt: string,
    workoutEndAt: string,
    activityName: string,
  ): string => fingerprint(["workout", userId, workoutStartAt, workoutEndAt, activityName.toLowerCase()]),

  physiologicalCycles: (userId: string, cycleStartAt: string): string =>
    fingerprint(["cycle", userId, cycleStartAt]),

  journalEntries: (userId: string, cycleStartAt: string, questionText: string): string =>
    fingerprint(["journal", userId, cycleStartAt, questionText.toLowerCase()]),
};
