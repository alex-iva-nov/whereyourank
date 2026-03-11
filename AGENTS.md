# AGENTS.md

## Project Context

WHOOP Benchmarking MVP (web-first, solo-founder).

Core promise:
- user uploads WHOOP export CSV files
- product returns deterministic benchmark insights and percentile context
- AI explains analytics outputs, but does not replace analytics computation

## MVP Boundaries

In scope:
- Next.js + TypeScript web app
- Supabase Auth, Postgres, Storage
- anonymous profile (`age_bucket`, `sex`, `country`)
- CSV upload and parsing for:
  - `physiological_cycles.csv`
  - `sleeps.csv`
  - `workouts.csv`
  - `journal_entries.csv`
- deterministic metrics, cohort benchmarking, percentile cards
- limited AI Q&A routing over deterministic read models
- consent/privacy and delete-my-data flow

Out of scope:
- native mobile apps
- billing/subscriptions
- WHOOP API sync
- medical diagnosis/treatment features
- open-ended AI access to raw data

## Engineering Principles

- Deterministic analytics first; AI is interpretation only.
- Keep schemas explicit and typed.
- Prefer simple, observable batch jobs over complex streaming systems.
- Keep implementation solo-maintainable.
- Enforce cohort minimum sample size before benchmark output (`min_n = 50`).

## Data and Privacy Rules

- Do not collect full name or exact birth date.
- Store only minimal profile data needed for cohorting.
- Ensure user-linked records are deletable end-to-end.
- Never expose raw records from other users.
- Suppress percentile output when cohort size is too small.

## Repository Conventions

- Product docs: `docs/product/`
- Engineering docs: `docs/engineering/`
- Keep architectural decisions documented before major implementation changes.
- Keep local raw WHOOP CSV files out of version control.

## Pre-Implementation Checklist

- data model aligned with MVP scope
- analytics definitions frozen for v1 metric set
- AI routing intents limited and testable
- environment variables documented in `.env.example`
- delete-my-data workflow specified before production launch
