# Beta-Ready Checklist

Date: 2026-03-11
Product: WhereYouRank

## Current status

Working in app today:
- email sign up / sign in
- onboarding (`age_bucket`, `sex`, `country`)
- WHOOP CSV upload flow
- ingestion + derived analytics recompute
- dashboard with early insights and small-dataset comparisons
- first-dashboard feedback prompt
- delete-my-data flow
- privacy / terms pages

## Beta-ready goal

The product is beta-ready when a small group of real WHOOP users can:
- create an account from a live URL
- receive branded auth emails
- upload valid WHOOP exports
- reach the dashboard without manual founder intervention
- leave feedback
- delete their data
- encounter errors that are visible to the founder

## What is already good enough for beta

- deterministic analytics-first architecture
- explicit Supabase schema and migrations
- RLS on user-linked tables
- support for partial uploads with clear file feedback
- small-dataset comparison state before larger cohorts exist
- minimum cohort guardrails for benchmark outputs

## Repo-side work to finish before inviting real users

### 1. Production deployment
Need:
- production URL
- production env vars
- verified auth redirect URLs

Suggested target:
- Vercel for the Next.js app
- existing Supabase project, or a fresh beta/prod Supabase project if you want a cleaner environment

### 2. Foundational observability
Add before wider testing:
- error monitoring for server and client runtime failures
- simple founder metrics for signup, upload, dashboard reached, feedback submitted
- visibility into upload rejection reasons and ingestion failures

Recommended simple stack:
- Sentry for exceptions
- PostHog or simple Supabase event table for product events

### 3. Support identity
Need a support contact visible to users:
- support email address
- sender name `WhereYouRank`
- ideally branded sender domain for auth emails

### 4. Production QA pass
Run end-to-end in the live environment:
- signup
- onboarding
- upload valid files
- upload invalid files
- dashboard view
- feedback submit
- delete-my-data
- sign out / sign in again

### 5. Beta ops hygiene
Need:
- a short founder playbook for handling support issues
- a way to inspect feedback entries in Supabase
- a way to inspect upload failures quickly
- a small known-issues list before inviting users

## External setup the founder must do manually

### Domain
You need a domain or subdomain.
Simple option:
1. buy a domain in Namecheap, Cloudflare, Porkbun, or Squarespace Domains
2. choose either:
   - `whereyourank.com`
   - `app.whereyourank.com`
3. connect it to Vercel in the Vercel project settings
4. add the production URL to Supabase Auth redirect settings

Recommended beta setup:
- marketing/root domain later
- app on `app.yourdomain.com`

### Email for auth and support
You need:
- one support inbox, for example `support@yourdomain.com`
- optionally `hello@yourdomain.com` for founder communication

Simple setup paths:
- Google Workspace: easiest and reliable, paid
- Zoho Mail: cheaper, okay for early beta
- Proton Mail for Business: clean but a bit less standard for app workflows

Then in Supabase:
1. Authentication -> Email -> Sender details
2. set sender name to `WhereYouRank`
3. set sender email to your support inbox
4. if needed, configure custom SMTP using your email provider or a transactional provider

Best beta option:
- use a transactional sender like Resend, Postmark, or SendGrid
- connect your domain DNS records
- route auth mail through custom SMTP

### Production hosting
Recommended path:
1. create a Vercel project from this repo
2. add env vars from `.env.example`
3. set `NEXT_PUBLIC_APP_URL` to your live URL
4. deploy preview
5. test auth, uploads, and dashboard
6. switch to production domain

### Error monitoring
Recommended path:
1. create a Sentry project for Next.js
2. add DSN env vars
3. enable both client and server error capture
4. verify by triggering one test error in preview

### Product analytics
Recommended path:
1. create PostHog project
2. add project key + host env vars
3. track only a small event set for beta

Beta event shortlist:
- `signup_completed`
- `onboarding_completed`
- `upload_submitted`
- `upload_completed`
- `dashboard_viewed`
- `feedback_submitted`
- `delete_data_requested`

## Suggested launch sequence

### Stage 1: private beta infrastructure
- deploy app
- configure domain
- configure branded auth email
- add monitoring
- run production QA yourself on 2-3 accounts

### Stage 2: first real users
- invite 5-10 people manually
- ask each person to upload their actual WHOOP export
- watch upload failures and dashboard feedback daily
- fix the top 2-3 confusion points only

### Stage 3: expand carefully
- invite 20-30 more users
- measure upload completion rate and dashboard reach rate
- improve copy, validation, and error states before broader traffic

## Exit criteria for this step

This step is complete when:
- app is live on a real domain
- auth emails are branded as WhereYouRank
- support inbox exists
- monitoring exists
- founder can see feedback and errors without digging through raw logs
- you have successfully tested the full production journey yourself