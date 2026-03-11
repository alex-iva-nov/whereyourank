# MVP Scope — WHOOP Benchmarking Product

## 1. Product Summary

This product allows WHOOP users to upload exported WHOOP CSV files and receive useful benchmarking insights based on their own data and the growing dataset of other users.

The core value is not raw data visualization. The core value is context: helping a user understand where their metrics stand relative to similar users, especially by age group, sex, country, and broader cohorts.

The MVP is web-first, privacy-first, and optimized for solo-founder speed. It should launch early with a small but useful set of features, then improve iteratively as more users upload their data and the benchmark database becomes more valuable.

## 2. Problem Statement

WHOOP users can export their own data, but most users cannot easily answer questions such as:

- Is my HRV high or low for people like me?
- Is my sleep consistency better or worse than average for my age group?
- How unusual is my recovery pattern?
- What behaviors in my journal appear most associated with poor recovery?
- What are my strongest and weakest metrics relative to similar users?

The raw data exists, but the comparative layer is missing. Users do not just want dashboards; they want interpretation, ranking, and meaningful context.

## 3. Target User

The initial target user is:

- an individual WHOOP user
- interested in self-tracking, performance, recovery, sleep, or wellness
- willing to upload exported CSV files manually
- curious about comparison with peers or similar cohorts
- comfortable using a web product

The initial target user is not:

- a medical patient seeking diagnosis
- a clinic or healthcare provider
- an enterprise customer
- a coach managing many athletes
- a user expecting full automatic sync in the first version

## 4. Core Value Proposition

The MVP should help the user answer:

1. Where do I stand relative to similar users?
2. Which of my metrics are strong relative to my cohort?
3. Which of my metrics are weak relative to my cohort?
4. What trends are visible in my own recent data?
5. Which lifestyle factors in my journal appear associated with better or worse next-day outcomes?

The product should make it easy to move from raw data to benchmarked insight.

## 5. MVP Goals

The MVP is successful if it allows a user to:

- create an account
- upload WHOOP CSV exports
- have those files parsed and normalized
- see their main metrics in a usable dashboard
- see percentile or rank-like comparisons against a relevant cohort
- ask a limited set of natural-language questions
- get answers based on deterministic analytics plus cohort data
- understand what data is stored and delete it if requested

## 6. In-Scope Features

### 6.1 Account and Access
- email-based sign-in
- minimal onboarding
- lightweight profile setup

### 6.2 Minimal User Profile
The MVP collects only:
- age bucket
- sex
- country

The product should avoid collecting full name, exact birth date, or unnecessary personal data.

### 6.3 WHOOP Data Upload
The user can upload the following files:
- `physiological_cycles.csv`
- `sleeps.csv`
- `workouts.csv`
- `journal_entries.csv`

The product should support partial uploads, but should clearly communicate reduced insight quality if data is incomplete.

### 6.4 Parsing and Normalization
The system should:
- validate file type and structure
- parse uploaded CSV files
- normalize values into canonical internal metrics
- store processed records for analytics
- separate raw upload tracking from normalized data records

### 6.5 Personal Dashboard
The dashboard should include:
- key metrics overview
- recent trend summaries
- benchmark cards
- strongest metrics vs cohort
- weakest metrics vs cohort
- data completeness or confidence indicator

### 6.6 Cohort Benchmarking
The MVP should compare users using simple cohorts such as:
- all users
- age bucket
- sex
- country
- age bucket + sex where sample size is sufficient

The system should use broader fallback cohorts when a narrow cohort is too small.
The system should define and enforce a minimum sample threshold before displaying percentile/rank outputs (for example, `n >= 50`), otherwise fallback or suppress the benchmark.

### 6.7 Percentiles and Relative Position
The product should calculate percentile-like outputs for a selected set of core metrics, such as:
- HRV
- resting heart rate
- recovery score
- blood oxygen
- sleep performance
- sleep duration
- sleep efficiency
- sleep consistency
- workout strain
- workout frequency

### 6.8 AI-Assisted Question Answering
The MVP should support a limited set of benchmark and insight questions, such as:
- What percentile is my HRV in for my age group?
- Is my sleep consistency above or below average for similar users?
- Which metrics are strongest for me relative to my cohort?
- Which journal factors appear related to worse recovery?

AI should not directly reason over raw database contents without structure. It should act as an interpretation layer over deterministic analytics and defined analysis flows.

### 6.9 Suggested Questions
The product should suggest a small set of useful example questions to help users discover value quickly.

### 6.10 Data Deletion
The user should have a clear way to request deletion of their stored personal and linked data.
Deletion should remove user-linked raw uploads, normalized WHOOP records, and user-level derived analytics records, while allowing retention of non-identifying aggregated cohort statistics.

## 7. Out of Scope for MVP

The following are intentionally excluded from the first version:

- native iOS app
- native Android app
- full WHOOP API sync
- live wearable integrations
- advanced social features
- coaching marketplace
- medical advice or treatment recommendations
- generalized “ask anything” AI over all data
- highly granular cohort slicing with many filters
- enterprise dashboards
- subscription billing in the first build
- polished consumer-grade design perfection

## 8. Supported Data Inputs

The MVP supports manual upload of WHOOP export CSV files.

Expected inputs:
- daily / physiological cycle data
- sleep session data
- workout data
- journal or lifestyle response data

The MVP should be tolerant of missing files, but benchmark depth and insight quality may be lower if the export is incomplete.

## 9. User Flow

### 9.1 First-Time User Flow
1. User lands on product website
2. User creates account or signs in
3. User completes minimal profile:
   - age bucket
   - sex
   - country
4. User reviews privacy / consent information
5. User uploads WHOOP CSV files
6. System validates and parses files
7. System computes user summaries and benchmark comparisons
8. User sees dashboard
9. User clicks suggested question or types their own question
10. User receives benchmark-based answer

### 9.2 Returning User Flow
1. User signs in
2. User sees historical dashboard and prior uploads
3. User asks more questions or uploads newer data
4. User receives updated comparisons

## 10. Privacy and Compliance Principles

The MVP should follow these principles:

### 10.1 Data Minimization
Collect only data needed for the product to function.

### 10.2 No Unnecessary Identity Data
Do not require full name. Avoid collecting exact birth date. Prefer age bucket over exact age where possible.

### 10.3 Clear Consent
The user should understand:
- what data is uploaded
- what data is stored
- how the product uses aggregated benchmark data
- how deletion works

### 10.4 Deletion Support
The product must support deletion of user-linked records upon request.

### 10.5 No Medical Claims
The product is for informational and benchmarking purposes only. It should not diagnose, treat, or provide medical advice.

### 10.6 Aggregated Benchmarking
Comparisons should be generated using aggregated and privacy-conscious cohort analytics.

## 11. Success Metrics

The MVP should track the following:

### 11.1 Activation
- percentage of signups who complete upload
- percentage of uploaders who reach dashboard
- time from signup to first insight

### 11.2 Engagement
- percentage of users who ask at least one question
- average number of benchmark cards viewed
- suggested question click-through rate

### 11.3 Retention
- day-1 return rate
- day-7 return rate
- percentage of users who upload updated exports later

### 11.4 Data Value
- number of usable user uploads
- number of users in benchmark-ready cohorts
- number of metrics with statistically usable distributions

## 12. Risks and Assumptions

### 12.1 Key Assumptions
- users care about peer-relative interpretation, not just personal trends
- users are willing to upload files manually
- age-bucket-based benchmarking is already interesting enough in early stages
- suggested questions will help users discover product value quickly

### 12.2 Main Risks
- too few users in early cohorts
- inconsistent WHOOP export formats
- users may want more automation than the MVP provides
- legal/privacy complexity if scope expands carelessly
- AI may feel weak if deterministic analytics layer is not well designed

## 13. Definition of Done for MVP

The MVP is considered done when all of the following are true:

- user can sign in
- user can submit minimal profile
- user can upload supported WHOOP CSV files
- system parses and stores normalized records
- dashboard shows personal metrics and cohort-relative metrics
- at least 10 key benchmark metrics are implemented
- AI question flow works for a limited set of supported intents
- suggested questions are visible
- privacy/consent flow exists
- delete-my-data flow exists
- key product analytics events are tracked
- product can be tested end-to-end by external beta users

## 14. Post-MVP Ideas

Possible next steps after MVP validation:

- paid subscription for advanced insights
- more cohort filters
- better trend analysis and anomaly detection
- richer journal factor analysis
- upload quality scoring
- automated recurring uploads
- WHOOP API integration if allowed and practical
- mobile app wrapper
- coach or team views
- anonymized benchmark reports by segment



