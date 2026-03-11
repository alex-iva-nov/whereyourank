# WHOOP Benchmarking MVP — Backend Foundation

This repository is prepared for a Supabase-first backend using Next.js + TypeScript.

## Stack

- Next.js (App Router)
- Supabase Auth
- Supabase Postgres
- Supabase Storage

## Key folders

- `supabase/migrations/` — SQL migrations (schema + RLS + storage policies)
- `supabase/schema.sql` — base SQL schema snapshot
- `src/lib/env.ts` — environment variable loading/validation
- `src/lib/supabase/` — browser/server/admin Supabase clients
- `app/api/health/route.ts` — backend health/config endpoint

## Setup

1. Install dependencies:

```bash
npm install
```

2. Ensure `.env.local` is filled.

3. Login and link Supabase project (CLI):

```bash
supabase login
supabase link --project-ref jddeljnirhiweidpqtab
```

4. Apply migrations:

```bash
npm run db:push
```

5. Run local Next.js backend:

```bash
npm run dev
```

## Notes

- Architecture is deterministic-analytics-first; AI should read derived outputs only.
- No dashboard/UI implementation is included at this stage.
- No Prisma/Firebase/alternate DB layers are used.
