# WHOOP Ingestion v1

## Scope

This document describes the production-shaped v1 ingestion pipeline only.

Ingestion responsibilities:
- detect WHOOP file kind by header signature
- read CSV safely (`;` or `,` delimiter)
- validate headers and row shape
- normalize values into canonical typed records
- build natural keys and row hashes
- upsert into fact tables idempotently
- record ingestion runs, errors, and telemetry

Out of scope:
- cohort distributions
- percentiles
- dashboard analytics
- AI interpretation

## Pipeline Stages

1. `uploads` record creation
2. `ingestion_runs` row creation (`queued` -> `processing` -> `completed|failed`)
3. header-based kind detection
4. header validation (required headers per kind)
5. row parsing + normalization
6. canonical fact conversion (`natural_key`, `row_hash`)
7. idempotent fact upsert
8. `ingestion_errors` persistence
9. run telemetry finalization

## Supported File Kinds

- `physiological_cycles`
- `sleeps`
- `workouts`
- `journal_entries`

Detection is header-signature based and does not rely on filename.

## Normalization Rules

- empty string -> `null`
- numeric text -> `number` (or `null` if blank)
- booleans (`true/false/yes/no/1/0`) -> `boolean`
- timestamps -> UTC ISO string when parseable
- timezone source string (for example `UTCZ`) is preserved separately

## Idempotency and Upsert Logic

Natural keys:
- sleeps: `(user_id, sleep_onset_at, wake_onset_at, nap)`
- workouts: `(user_id, workout_start_at, workout_end_at, activity_name)`
- physiological cycles: `(user_id, cycle_start_at)`
- journal entries: `(user_id, cycle_start_at, question_text)`

For each fact row:
- compute `natural_key`
- compute `row_hash`

Upsert behavior:
- insert when natural key does not exist
- skip when natural key exists and row hash matches
- update when natural key exists and row hash differs

Batch duplicate natural keys are logged as `duplicate_in_batch`.

## Persistence Targets

- `uploads`
- `ingestion_runs`
- `ingestion_errors`
- `whoop_cycle_facts`
- `whoop_sleep_facts`
- `whoop_workout_facts`
- `whoop_journal_facts`

## Telemetry Fields

Per ingestion run:
- `ingestionRunId`
- `userId`
- `uploadId`
- `fileKind`
- `parserVersion`
- `rowsTotal`
- `rowsParsed`
- `rowsInserted`
- `rowsUpdated`
- `rowsFailed`
- `durationMs`
- `errorRate`

## Error Codes

- `missing_required_header`
- `unknown_file_kind`
- `invalid_timestamp`
- `invalid_number`
- `invalid_boolean`
- `missing_required_field`
- `duplicate_in_batch`
- `db_upsert_failed`
- `invalid_row_shape`

## Source of Truth Boundary

- Fact tables are the source of truth for WHOOP imports.
- Analytics/benchmark tables are not written during ingestion.
- No merge between `sleeps` and `physiological_cycles` is performed in ingestion.
- Cross-source reconciliation belongs to analytics layer.
