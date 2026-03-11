# AI Routing Specification — WHOOP Benchmarking MVP

## 1. Purpose

This document defines how AI requests are routed to deterministic analytics outputs.
AI in MVP is an interpretation layer only.

The router must:
- classify user question into supported intents
- fetch precomputed analytics data
- build constrained prompt context
- return concise, non-medical, benchmark-focused answers

## 2. Guardrails

- No raw SQL generation from natural language.
- No direct reasoning over raw normalized tables in prompts.
- No medical diagnosis or treatment recommendations.
- If data is insufficient, return explicit “not enough data yet”.
- If intent is unsupported, return safe fallback plus suggested supported questions.

## 3. Supported intents (MVP)

1. `percentile_metric`
Example: “What percentile is my HRV in for my age group?”

2. `cohort_comparison_metric`
Example: “Is my sleep consistency above average for similar users?”

3. `strongest_weakest_metrics`
Example: “Which metrics are strongest for me relative to my cohort?”

4. `journal_factor_recovery`
Example: “Which journal factors appear related to worse recovery?”

5. `trend_summary`
Example: “How did my recovery trend over the last 30 days?”

Anything else maps to `unsupported_intent`.

## 4. Routing pipeline

1. Normalize question text.
2. Classify intent using deterministic rules + lightweight model fallback.
3. Validate required entities (metric key, window, cohort reference).
4. Fetch deterministic context from read tables.
5. Build prompt with strict answer schema.
6. Generate final answer.
7. Log intent, confidence, and data sufficiency outcome.

## 5. Deterministic data sources per intent

`percentile_metric`:
- `user_metric_percentiles`
- `cohort_metric_distributions` (for context fields)

`cohort_comparison_metric`:
- `user_metric_rollups`
- `cohort_metric_distributions`
- chosen cohort fallback metadata

`strongest_weakest_metrics`:
- latest `user_metric_percentiles` across supported metric set

`journal_factor_recovery`:
- journal factor summary table/view (derived from deterministic job)
- optional supporting recovery rollups

`trend_summary`:
- `user_metric_rollups`
- optional recent `user_metric_daily` points for narrative context

## 6. Intent schema

Request:
- `user_id: string`
- `question: string`
- `context_window?: "last_7d" | "last_30d" | "last_90d" | "lifetime"`

Internal classification output:
- `intent: string`
- `metric_key?: string`
- `window_key?: string`
- `confidence: number`

## 7. Response schema

All AI responses should be JSON at API boundary:
- `intent`
- `answer_text`
- `evidence` (flat list of facts used)
- `limitations` (data quality / low sample notes)
- `suggested_questions` (max 3)

UI can render this as rich text/cards.

## 8. Low-data behavior

Return low-data fallback when:
- metric value missing for user
- no eligible cohort has `sample_size >= 50`
- required journal support thresholds not met

Fallback answer must include:
- what is missing
- what user can do next (upload more data / include missing files)

## 9. Prompting design

System prompt requirements:
- role: benchmark interpreter
- only use supplied context facts
- never invent numbers
- include non-medical disclaimer when health-adjacent language appears

Prompt sections:
1. intent
2. allowed metric definitions
3. deterministic evidence facts
4. answer format constraints

## 10. Suggested question generation

Source:
- deterministic templates, not free generation
- ranked by missing/available signals and recent user actions

Template examples:
- “What percentile is my `metric` for users like me?”
- “Which of my metrics are currently strongest?”
- “Is my sleep consistency improving in the last 30 days?”

## 11. Safety and compliance

- always avoid medical advice wording
- avoid certainty language for journal associations (use “appears associated”)
- avoid exposing cohort data when sample size is below threshold
- do not expose other users’ raw records under any circumstance

## 12. Logging and evaluation

Log per request:
- `user_id`
- `intent`
- `classification_confidence`
- `data_sufficient` boolean
- `latency_ms`
- `model_name`

Weekly review metrics:
- intent distribution
- unsupported intent rate
- low-data fallback rate
- user follow-up click-through on suggested questions

## 13. MVP acceptance criteria

Routing is MVP-ready when:
- all 5 supported intents return deterministic-backed answers
- unsupported intents return safe fallback with suggestions
- no answer path accesses raw upload tables directly
- low-data behavior is consistent and tested
- logs support debugging of misrouted or weak answers
