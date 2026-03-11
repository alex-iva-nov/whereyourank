import { hashRowObject } from "@/lib/ingestion/fingerprints/fingerprint";
import { naturalKeys } from "@/lib/ingestion/fingerprints/naturalKeys";
import type { JournalFactRecord, ParsedJournalEntry } from "@/lib/ingestion/types";

export const toJournalFact = (
  userId: string,
  uploadId: string,
  rowNumber: number,
  parsed: ParsedJournalEntry,
): JournalFactRecord => {
  const naturalKey = naturalKeys.journalEntries(userId, parsed.cycleStartAt, parsed.questionText);

  const payload = {
    cycle_start_at: parsed.cycleStartAt,
    cycle_end_at: parsed.cycleEndAt,
    cycle_timezone: parsed.cycleTimezone,
    question_text: parsed.questionText,
    answered_yes: parsed.answeredYes,
    notes: parsed.notes,
  };

  return {
    user_id: userId,
    upload_id: uploadId,
    natural_key: naturalKey,
    row_hash: hashRowObject(payload),
    source_row_number: rowNumber,
    ...payload,
  };
};
