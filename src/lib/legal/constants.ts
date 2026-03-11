// NOTE: Versions + consent wording should be reviewed by legal counsel before wider launch.
export const PRIVACY_NOTICE_VERSION = "2026-03-09";
export const TERMS_VERSION = "2026-03-09";
export const CONSENT_COPY_VERSION = "2026-03-09";

export const REQUIRED_UPLOAD_CONSENT_TYPES = [
  "whoop_processing",
  "informational_non_medical",
] as const;

export const UPLOAD_PROCESSING_CONSENT_TEXT =
  "I agree to the processing of my WHOOP and profile data for personal benchmarking, cohort comparisons, product analytics, and related service operations, as described in the Privacy Notice.";

export const INFORMATIONAL_ONLY_CONSENT_TEXT =
  "I understand that this service provides informational insights only and does not provide medical advice.";

export const PRIVACY_NOTICE_COMMERCIALIZATION_SUMMARY =
  "We may use aggregated and anonymized statistics to improve benchmarks and produce market-level insights. We do not sell raw personal data or user-level health data.";