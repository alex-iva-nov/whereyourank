export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type TableShape = {
  Row: Record<string, unknown>;
  Insert: Record<string, unknown>;
  Update: Record<string, unknown>;
  Relationships: [];
};

export interface Database {
  public: {
    Tables: {
      user_profiles: TableShape;
      user_feedback: TableShape;
      consent_events: TableShape;
      upload_batches: TableShape;
      upload_files: TableShape;
      uploads: TableShape;
      parse_jobs: TableShape;
      parse_errors: TableShape;
      ingestion_runs: TableShape;
      ingestion_errors: TableShape;
      whoop_physiological_cycles: TableShape;
      whoop_sleeps: TableShape;
      whoop_workouts: TableShape;
      whoop_journal_entries: TableShape;
      whoop_cycle_facts: TableShape;
      whoop_sleep_facts: TableShape;
      whoop_workout_facts: TableShape;
      whoop_journal_facts: TableShape;
      user_daily_metrics: TableShape;
      user_metric_30d_aggregates: TableShape;
      cohort_metric_percentiles: TableShape;
      user_metric_daily: TableShape;
      user_metric_rollups: TableShape;
      cohort_metric_distributions: TableShape;
      user_metric_percentiles: TableShape;
      deletion_requests: TableShape;
      privacy_events: TableShape;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

