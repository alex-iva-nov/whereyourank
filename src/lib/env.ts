const required = (name: string, value: string | undefined): string => {
  if (!value || value.trim().length === 0) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
};

const getSupabaseClientKey = () =>
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const publicEnv = {
  appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  supabaseUrl: required("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL),
  supabaseClientKey: required(
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY",
    getSupabaseClientKey(),
  ),
  storageBucketRaw: process.env.SUPABASE_STORAGE_BUCKET_RAW ?? "whoop-raw-uploads",
  cohortMinSampleSize: Number(process.env.COHORT_MIN_SAMPLE_SIZE ?? "50"),
} as const;

export const getServerEnv = () => ({
  ...publicEnv,
  supabaseServiceRoleKey: required(
    "SUPABASE_SERVICE_ROLE_KEY",
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  ),
  databaseUrl: required("DATABASE_URL", process.env.DATABASE_URL),
});
