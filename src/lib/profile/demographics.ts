export const AGE_BUCKET_OPTIONS = [
  { value: "13_18", label: "13-18" },
  { value: "18_24", label: "18-24" },
  { value: "25_29", label: "25-29" },
  { value: "30_34", label: "30-34" },
  { value: "35_39", label: "35-39" },
  { value: "40_44", label: "40-44" },
  { value: "45_49", label: "45-49" },
  { value: "50_54", label: "50-54" },
  { value: "55_59", label: "55-59" },
  { value: "60_64", label: "60-64" },
  { value: "65_69", label: "65-69" },
  { value: "70_74", label: "70-74" },
  { value: "75_79", label: "75-79" },
  { value: "80_plus", label: "80+" },
] as const;

export const LEGACY_AGE_BUCKET_OPTIONS = [
  { value: "25_34", label: "25-34" },
  { value: "35_44", label: "35-44" },
  { value: "45_54", label: "45-54" },
  { value: "55_plus", label: "55+" },
] as const;

export const AGE_BUCKET_VALUES = AGE_BUCKET_OPTIONS.map((option) => option.value);
export const ACCEPTED_AGE_BUCKET_VALUES = [
  ...AGE_BUCKET_OPTIONS.map((option) => option.value),
  ...LEGACY_AGE_BUCKET_OPTIONS.map((option) => option.value),
];

export const SEX_OPTIONS = [
  { value: "female", label: "Female" },
  { value: "male", label: "Male" },
  { value: "other", label: "Other" },
  { value: "prefer_not_to_say", label: "Prefer not to say" },
] as const;

const COUNTRY_CODES = [
  "AD", "AE", "AF", "AG", "AI", "AL", "AM", "AO", "AQ", "AR", "AS", "AT", "AU", "AW", "AX", "AZ",
  "BA", "BB", "BD", "BE", "BF", "BG", "BH", "BI", "BJ", "BL", "BM", "BN", "BO", "BQ", "BR", "BS",
  "BT", "BV", "BW", "BY", "BZ", "CA", "CC", "CD", "CF", "CG", "CH", "CI", "CK", "CL", "CM", "CN",
  "CO", "CR", "CU", "CV", "CW", "CX", "CY", "CZ", "DE", "DJ", "DK", "DM", "DO", "DZ", "EC", "EE",
  "EG", "EH", "ER", "ES", "ET", "FI", "FJ", "FK", "FM", "FO", "FR", "GA", "GB", "GD", "GE", "GF",
  "GG", "GH", "GI", "GL", "GM", "GN", "GP", "GQ", "GR", "GS", "GT", "GU", "GW", "GY", "HK", "HM",
  "HN", "HR", "HT", "HU", "ID", "IE", "IL", "IM", "IN", "IO", "IQ", "IR", "IS", "IT", "JE", "JM",
  "JO", "JP", "KE", "KG", "KH", "KI", "KM", "KN", "KP", "KR", "KW", "KY", "KZ", "LA", "LB", "LC",
  "LI", "LK", "LR", "LS", "LT", "LU", "LV", "LY", "MA", "MC", "MD", "ME", "MF", "MG", "MH", "MK",
  "ML", "MM", "MN", "MO", "MP", "MQ", "MR", "MS", "MT", "MU", "MV", "MW", "MX", "MY", "MZ", "NA",
  "NC", "NE", "NF", "NG", "NI", "NL", "NO", "NP", "NR", "NU", "NZ", "OM", "PA", "PE", "PF", "PG",
  "PH", "PK", "PL", "PM", "PN", "PR", "PS", "PT", "PW", "PY", "QA", "RE", "RO", "RS", "RU", "RW",
  "SA", "SB", "SC", "SD", "SE", "SG", "SH", "SI", "SJ", "SK", "SL", "SM", "SN", "SO", "SR", "SS",
  "ST", "SV", "SX", "SY", "SZ", "TC", "TD", "TF", "TG", "TH", "TJ", "TK", "TL", "TM", "TN", "TO",
  "TR", "TT", "TV", "TW", "TZ", "UA", "UG", "UM", "US", "UY", "UZ", "VA", "VC", "VE", "VG", "VI",
  "VN", "VU", "WF", "WS", "YE", "YT", "ZA", "ZM", "ZW",
] as const;

export type CountryOption = {
  code: string;
  name: string;
};

const regionNames = new Intl.DisplayNames(["en"], { type: "region" });

export const COUNTRY_OPTIONS: CountryOption[] = [...COUNTRY_CODES]
  .map((code) => ({
    code,
    name: regionNames.of(code) ?? code,
  }))
  .sort((left, right) => left.name.localeCompare(right.name));

export const REQUIRED_FILE_LABELS = [
  { kind: "physiological_cycles", filename: "physiological_cycles.csv" },
  { kind: "sleeps", filename: "sleeps.csv" },
  { kind: "workouts", filename: "workouts.csv" },
  { kind: "journal_entries", filename: "journal_entries.csv" },
] as const;

export const formatAgeBucketLabel = (value: string) =>
  [...AGE_BUCKET_OPTIONS, ...LEGACY_AGE_BUCKET_OPTIONS].find((option) => option.value === value)?.label ?? value.replaceAll("_", "-");

export const formatSexLabel = (value: string) =>
  SEX_OPTIONS.find((option) => option.value === value)?.label ?? value.replaceAll("_", " ");

export const getCountryName = (code: string) =>
  COUNTRY_OPTIONS.find((option) => option.code === code.toUpperCase())?.name ?? code.toUpperCase();

export const findCountryOption = (query: string) => {
  const normalized = query.trim().toLowerCase();

  if (!normalized) {
    return null;
  }

  return (
    COUNTRY_OPTIONS.find((option) => option.name.toLowerCase() === normalized) ??
    COUNTRY_OPTIONS.find((option) => option.code.toLowerCase() === normalized) ??
    null
  );
};