You are building a solo-founder MVP for anonymous WHOOP data benchmarking.

Product concept:
Users upload exported WHOOP CSV files and get benchmark insights relative to cohorts such as age bucket, sex, country, and broader user groups. The product should emphasize privacy, speed, and useful insights rather than perfect medical interpretation.

Founder constraints:
- Build fast
- Solo-maintainable
- Web-first MVP
- Freemium later, not required now
- Users should be able to ask questions in natural language
- AI should answer based on deterministic analytics plus cohort data
- No unnecessary personal data collection

Supported data files in MVP:
- physiological_cycles.csv
- sleeps.csv
- workouts.csv
- journal_entries.csv

Data available from exports includes examples such as:
- recovery score
- resting heart rate
- HRV
- blood oxygen
- skin temperature
- sleep performance
- asleep duration
- light/deep/REM sleep
- sleep debt
- sleep efficiency
- sleep consistency
- workout duration
- activity name
- activity strain
- energy burned
- heart-rate zones
- journal yes/no lifestyle questions like alcohol or caffeine

Product requirements:
- Next.js + TypeScript
- Supabase for auth, db, storage
- Anonymous profile with only:
  - age_bucket
  - sex
  - country
- CSV upload and validation
- Parse and normalize the uploaded files
- Personal dashboard
- Cohort benchmark cards with minimum sample threshold fallback
- Percentiles and rank-like indicators
- Suggested questions
- AI Q&A page with limited, well-routed intents
- Consent, privacy, and delete-my-data flows (deleting raw uploads, normalized records, and user-level derived tables)

Architecture requirements:
- Deterministic analytics first
- AI as interpretation layer, not raw database reasoning
- Simple, clear folder structure
- Explicit schemas and types
- Strong comments
- Production-realistic but MVP-simple

Generate:
- full repository structure
- code files
- SQL migrations
- parsers
- normalization utilities
- analytics functions
- benchmark UI
- AI prompts and routing
- README


