# MVP QA States and Delete Flow

## 1. End-to-end QA path

Primary manual journey for real-user testing:
1. Sign up / sign in
2. Complete onboarding (`age_bucket`, `sex`, `country`)
3. Upload one or more WHOOP CSV files
4. Ingestion runs and analytics recompute trigger
5. Dashboard shows cohort comparison states
6. User can execute delete-my-data and verify cleanup

## 2. Required UI states

### Upload page states
- No uploads yet: explicit prompt to upload first CSV.
- Partial uploads: show missing recommended file kinds.
- Analytics not ready: show when no 30-day aggregates exist yet.
- Upload summary: show per-file ingestion telemetry.

### Dashboard metric states
Per metric (`HRV`, `Sleep Performance`, `Recovery Score`):
- `ok`: percentile + cohort anchors shown.
- `no_user_value`: user has no metric value yet.
- `insufficient_cohort`: user value exists, but no eligible cohort at `min_n`.

Additional cohort state:
- fallback cohort used (age+sex not available, age or all used instead).

## 3. Upload result summary contract

After upload, API returns:
- detected file kind (per file)
- rows total
- rows inserted
- rows updated
- rows failed
- analytics recompute status
- metrics currently available
- recommended files still missing

## 4. Delete-my-data flow

Endpoint:
- `POST /api/delete-my-data`

Behavior:
1. Authenticate current user.
2. Create `deletion_requests` row with `processing`.
3. Remove user storage objects from raw upload bucket.
4. Delete user-linked ingestion/fact/derived/profile records.
5. Best-effort recompute cohort aggregates (`recompute_analytics_for_all`).
6. Mark deletion request `completed` (or `failed` with reason).
7. Sign out user.

## 5. Data cleanup scope (MVP)

Deletes user-linked records from:
- ingestion metadata (`uploads`, `ingestion_runs`, `ingestion_errors`)
- normalized facts (`whoop_*_facts`)
- legacy ingestion tables (`upload_batches`, `upload_files`, `parse_jobs`, `parse_errors`, legacy normalized tables)
- derived user tables (`user_daily_metrics`, `user_metric_30d_aggregates`, `user_metric_daily`, `user_metric_rollups`, `user_metric_percentiles`)
- profile/consent (`user_profiles`, `consent_events`)

## 6. Demo cohort seeding for early testing

Command:
```bash
npm run seed:demo-cohort
```

Optional count:
```bash
npm run seed:demo-cohort -- --count=200
```

Seed writes:
- demo users in Auth
- `user_profiles`
- `user_metric_30d_aggregates`
- recomputed `cohort_metric_percentiles`

Use this only in dev/staging environments.
