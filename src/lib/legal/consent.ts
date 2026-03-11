import type { SupabaseClient } from "@supabase/supabase-js";

import {
  CONSENT_COPY_VERSION,
  INFORMATIONAL_ONLY_CONSENT_TEXT,
  PRIVACY_NOTICE_VERSION,
  REQUIRED_UPLOAD_CONSENT_TYPES,
  TERMS_VERSION,
  UPLOAD_PROCESSING_CONSENT_TEXT,
} from "./constants";

export type ConsentStatus = {
  hasRequiredConsent: boolean;
  missingConsentTypes: string[];
};

type ConsentRow = {
  consent_type: string;
};

type LegacyConsentRow = {
  consent_type: string;
  consent_version: string;
};

type ConsentInsert = {
  user_id: string;
  consent_type: string;
  consent_version: string;
  accepted: boolean;
  accepted_at: string;
  privacy_notice_version: string;
  terms_version: string;
  consent_text_snapshot: string | null;
};

type LegacyConsentInsert = {
  user_id: string;
  consent_type: string;
  consent_version: string;
  accepted: boolean;
};

const toRequiredConsentSet = () => new Set<string>(REQUIRED_UPLOAD_CONSENT_TYPES);

const isLegacyConsentSchemaError = (message: string) => {
  const normalized = message.toLowerCase();
  if (!normalized.includes("consent_events")) {
    return false;
  }

  return (
    normalized.includes("does not exist") ||
    normalized.includes("could not find") ||
    normalized.includes("schema cache") ||
    normalized.includes("accepted_at") ||
    normalized.includes("privacy_notice_version") ||
    normalized.includes("terms_version") ||
    normalized.includes("consent_text_snapshot")
  );
};

export const evaluateRequiredConsentRows = (rows: ConsentRow[]): ConsentStatus => {
  const required = toRequiredConsentSet();

  for (const row of rows) {
    required.delete(row.consent_type);
  }

  return {
    hasRequiredConsent: required.size === 0,
    missingConsentTypes: Array.from(required),
  };
};

const evaluateLegacyConsentRows = (rows: LegacyConsentRow[]): ConsentStatus => {
  const hasPrivacy = rows.some(
    (row) => row.consent_type === "privacy" && row.consent_version === PRIVACY_NOTICE_VERSION,
  );
  const hasTerms = rows.some(
    (row) => row.consent_type === "terms" && row.consent_version === TERMS_VERSION,
  );

  const missingConsentTypes: string[] = [];
  if (!hasPrivacy) {
    missingConsentTypes.push("whoop_processing");
  }
  if (!hasTerms) {
    missingConsentTypes.push("informational_non_medical");
  }

  return {
    hasRequiredConsent: hasPrivacy && hasTerms,
    missingConsentTypes,
  };
};

export const getRequiredConsentStatusForUser = async (
  supabase: SupabaseClient<any>,
  userId: string,
): Promise<ConsentStatus> => {
  const modernQuery = await supabase
    .from("consent_events")
    .select("consent_type")
    .eq("user_id", userId)
    .eq("accepted", true)
    .eq("consent_version", CONSENT_COPY_VERSION)
    .eq("privacy_notice_version", PRIVACY_NOTICE_VERSION)
    .eq("terms_version", TERMS_VERSION)
    .in("consent_type", [...REQUIRED_UPLOAD_CONSENT_TYPES]);

  if (!modernQuery.error) {
    return evaluateRequiredConsentRows((modernQuery.data ?? []) as ConsentRow[]);
  }

  if (!isLegacyConsentSchemaError(modernQuery.error.message)) {
    throw new Error(`Failed to load consent state: ${modernQuery.error.message}`);
  }

  const legacyQuery = await supabase
    .from("consent_events")
    .select("consent_type, consent_version")
    .eq("user_id", userId)
    .eq("accepted", true)
    .in("consent_type", ["privacy", "terms"]);

  if (legacyQuery.error) {
    throw new Error(`Failed to load consent state: ${legacyQuery.error.message}`);
  }

  return evaluateLegacyConsentRows((legacyQuery.data ?? []) as LegacyConsentRow[]);
};

export const buildConsentRecords = (userId: string, acceptedAtIso: string): ConsentInsert[] => [
  {
    user_id: userId,
    consent_type: "whoop_processing",
    consent_version: CONSENT_COPY_VERSION,
    accepted: true,
    accepted_at: acceptedAtIso,
    privacy_notice_version: PRIVACY_NOTICE_VERSION,
    terms_version: TERMS_VERSION,
    consent_text_snapshot: UPLOAD_PROCESSING_CONSENT_TEXT,
  },
  {
    user_id: userId,
    consent_type: "informational_non_medical",
    consent_version: CONSENT_COPY_VERSION,
    accepted: true,
    accepted_at: acceptedAtIso,
    privacy_notice_version: PRIVACY_NOTICE_VERSION,
    terms_version: TERMS_VERSION,
    consent_text_snapshot: INFORMATIONAL_ONLY_CONSENT_TEXT,
  },
  {
    user_id: userId,
    consent_type: "privacy_notice_ack",
    consent_version: PRIVACY_NOTICE_VERSION,
    accepted: true,
    accepted_at: acceptedAtIso,
    privacy_notice_version: PRIVACY_NOTICE_VERSION,
    terms_version: TERMS_VERSION,
    consent_text_snapshot: null,
  },
  {
    user_id: userId,
    consent_type: "terms_of_use_ack",
    consent_version: TERMS_VERSION,
    accepted: true,
    accepted_at: acceptedAtIso,
    privacy_notice_version: PRIVACY_NOTICE_VERSION,
    terms_version: TERMS_VERSION,
    consent_text_snapshot: null,
  },
];

export const buildLegacyConsentRecords = (userId: string): LegacyConsentInsert[] => [
  {
    user_id: userId,
    consent_type: "privacy",
    consent_version: PRIVACY_NOTICE_VERSION,
    accepted: true,
  },
  {
    user_id: userId,
    consent_type: "terms",
    consent_version: TERMS_VERSION,
    accepted: true,
  },
];

export const isConsentEventsSchemaMismatchError = (message: string) =>
  isLegacyConsentSchemaError(message);

